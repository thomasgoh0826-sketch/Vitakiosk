from __future__ import annotations

import json
import re
from dataclasses import replace
from typing import Any

import httpx

from services.contracts import VitaFlowAdapter
from services.leaflet_engine import LeafletEngine
from services.models import (
    AIResult,
    Intent,
    Leaflet,
    Product,
    Promotion,
    UiAction,
    UiActionType,
)
from services.openai_stt import detect_transcript_language
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.transcript_correction import correct_transcript
from services.workflows import EscalationStore, PurchasingQueryStore
from services.ai_brain import MockAIBrain


OLLAMA_CHAT_PATH = "/api/chat"
ALLOWED_RESPONSE_LANGUAGES = {"en", "zh", "ms", "mixed"}
ALLOWED_EMOTIONS = {"neutral", "friendly", "thinking", "serious", "concerned"}
SAFE_ANSWER_MAX_CHARS = 700

_PRICE_PATTERN = re.compile(r"(?<![A-Za-z])(?:RM|\$)\s*\d+(?:\.\d{1,2})?", re.I)
_STOCK_PATTERN = re.compile(r"\b\d+\s*(?:units?|boxes?|packs?|bottles?)\b", re.I)
_SHELF_PATTERN = re.compile(r"\b(?:shelf|aisle|level)\s+[A-Z0-9-]+", re.I)
_PROMO_PATTERN = re.compile(r"\b(?:promotion|promo|discount|offer)\b", re.I)


class OllamaAIBrain:
    """Local Ollama AI wording adapter guarded by VitaFlow facts.

    The deterministic mock workflow remains responsible for safety gates,
    VitaFlow/mock product lookup, promotion selection, shelf facts, purchasing
    queries, and controlled UI actions. Ollama receives only the already-safe
    workflow context and may return a structured customer-facing answer. If the
    local model is offline, malformed, unsafe, or invents facts, the adapter
    falls back to the deterministic mock result.
    """

    provider_name = "ollama"

    def __init__(
        self,
        *,
        vitaflow: VitaFlowAdapter,
        promotion_engine: PromotionEngine,
        leaflet_engine: LeafletEngine,
        guardrails: SafetyGuardrails,
        purchasing_store: PurchasingQueryStore,
        escalation_store: EscalationStore,
        base_url: str,
        model: str,
        timeout_seconds: int,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._guardrails = guardrails
        self._client = http_client or httpx.Client(timeout=timeout_seconds)
        self._base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds
        self._fallback = MockAIBrain(
            vitaflow=vitaflow,
            promotion_engine=promotion_engine,
            leaflet_engine=leaflet_engine,
            guardrails=guardrails,
            purchasing_store=purchasing_store,
            escalation_store=escalation_store,
        )

    def respond(
        self,
        text: str,
        branch_id: str,
        session_id: str | None = None,
    ) -> AIResult:
        safe_text = " ".join(text.split())
        correction = correct_transcript(safe_text)
        corrected_text = correction.corrected_transcript or safe_text
        safety = self._guardrails.evaluate_any(safe_text, corrected_text)
        if not safety.allowed:
            return self._fallback.respond(
                corrected_text,
                branch_id=branch_id,
                session_id=session_id,
            )

        base_result = self._fallback.respond(
            corrected_text,
            branch_id=branch_id,
            session_id=session_id,
        )
        if base_result.requires_pharmacist:
            return replace(base_result, source="ollama_fallback_mock")

        payload = self._build_request_payload(
            original_transcript=safe_text,
            corrected_transcript=corrected_text,
            detected_language=detect_transcript_language(corrected_text),
            detected_terms=correction.detected_terms,
            possible_product_matches=correction.possible_product_matches,
            branch_id=branch_id,
            base_result=base_result,
        )
        model_output = self._call_ollama(payload)
        if model_output is None:
            return replace(base_result, source="ollama_fallback_mock")

        answer = self._validated_answer(model_output, base_result)
        if answer is None:
            return replace(base_result, source="ollama_fallback_mock")

        return replace(base_result, message=answer, source=self.provider_name)

    def _build_request_payload(
        self,
        *,
        original_transcript: str,
        corrected_transcript: str,
        detected_language: str,
        detected_terms: tuple[str, ...],
        possible_product_matches: tuple[dict[str, object], ...],
        branch_id: str,
        base_result: AIResult,
    ) -> dict[str, object]:
        context = {
            "original_transcript": original_transcript,
            "corrected_transcript": corrected_transcript,
            "detected_language": detected_language,
            "detected_terms": list(detected_terms),
            "possible_product_matches": list(possible_product_matches),
            "branch_id": branch_id,
            "intent": base_result.intent.value,
            "base_safe_answer": base_result.message,
            "requires_pharmacist": base_result.requires_pharmacist,
            "product": self._product_context(base_result.product),
            "promotions": [self._promotion_context(item) for item in base_result.promotions],
            "leaflets": [self._leaflet_context(item) for item in base_result.leaflets],
            "allowed_ui_actions": [action.type.value for action in base_result.ui_actions],
            "safety_context": {
                "must_not_diagnose": True,
                "must_not_prescribe": True,
                "must_not_replace_pharmacist": True,
                "source_of_truth": "VitaFlow/mock product facts",
                "unknown_products_create_purchasing_query": True,
            },
        }
        schema = {
            "language": "en | zh | ms | mixed",
            "intent": (
                "product_search | product_counselling | price_check | "
                "stock_check | promotion_check | campaign_check | "
                "shelf_location | unknown_product | red_flag | clarification"
            ),
            "answer": "customer-facing safe answer",
            "emotion": "neutral | friendly | thinking | serious | concerned",
            "ui_actions": [],
            "requires_pharmacist": False,
            "safety_notes": [],
        }
        return {
            "model": self.model,
            "stream": False,
            "format": "json",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are VitaKiosk's local pharmacy kiosk wording layer. "
                        "Return only valid JSON matching the schema. Use only the "
                        "provided VitaFlow/mock product facts. Do not invent stock, "
                        "price, promotion, shelf location, product details, or "
                        "medical claims. Do not diagnose, prescribe, replace a "
                        "pharmacist, or tell customers to stop prescribed medicine. "
                        "If facts are unavailable, say they are unavailable."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "response_schema": schema,
                            "workflow_context": context,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
        }

    def _call_ollama(self, payload: dict[str, object]) -> dict[str, object] | None:
        try:
            response = self._client.post(
                f"{self._base_url}{OLLAMA_CHAT_PATH}",
                json=payload,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            raw_payload = response.json()
            content = self._extract_content(raw_payload)
            parsed = json.loads(content)
        except (httpx.HTTPError, ValueError, TypeError, KeyError):
            return None
        return parsed if isinstance(parsed, dict) else None

    @staticmethod
    def _extract_content(payload: Any) -> str:
        if not isinstance(payload, dict):
            raise ValueError("Ollama response must be a JSON object")
        message = payload.get("message")
        if isinstance(message, dict) and isinstance(message.get("content"), str):
            return message["content"]
        value = payload.get("response")
        if isinstance(value, str):
            return value
        raise ValueError("Ollama response did not include message content")

    def _validated_answer(
        self,
        payload: dict[str, object],
        base_result: AIResult,
    ) -> str | None:
        if not self._schema_is_valid(payload, base_result):
            return None

        answer = str(payload["answer"]).strip()
        if len(answer) > SAFE_ANSWER_MAX_CHARS:
            return None
        if not self._guardrails.evaluate(answer).allowed:
            return None
        if self._answer_invents_facts(answer, base_result):
            return None
        return answer

    def _schema_is_valid(
        self,
        payload: dict[str, object],
        base_result: AIResult,
    ) -> bool:
        language = payload.get("language")
        answer = payload.get("answer")
        emotion = payload.get("emotion")
        ui_actions = payload.get("ui_actions")
        requires_pharmacist = payload.get("requires_pharmacist")
        safety_notes = payload.get("safety_notes")
        intent = payload.get("intent")

        if not isinstance(language, str) or language not in ALLOWED_RESPONSE_LANGUAGES:
            return False
        if not isinstance(intent, str) or intent not in {item.value for item in Intent} | {"clarification"}:
            return False
        if intent != base_result.intent.value:
            return False
        if not isinstance(answer, str) or not answer.strip():
            return False
        if not isinstance(emotion, str) or emotion not in ALLOWED_EMOTIONS:
            return False
        if not isinstance(ui_actions, list):
            return False
        if not isinstance(requires_pharmacist, bool):
            return False
        if requires_pharmacist != base_result.requires_pharmacist:
            return False
        if not isinstance(safety_notes, list):
            return False
        return self._ui_actions_are_safe(ui_actions, base_result.ui_actions)

    @staticmethod
    def _ui_actions_are_safe(
        model_actions: list[object],
        allowed_actions: tuple[UiAction, ...],
    ) -> bool:
        allowed_types = {action.type.value for action in allowed_actions}
        for item in model_actions:
            if not isinstance(item, dict):
                return False
            action_type = item.get("type")
            if action_type not in {action.value for action in UiActionType}:
                return False
            if action_type not in allowed_types:
                return False
        return True

    def _answer_invents_facts(self, answer: str, base_result: AIResult) -> bool:
        allowed_fragments = self._allowed_fact_fragments(base_result)
        for pattern in (_PRICE_PATTERN, _STOCK_PATTERN, _SHELF_PATTERN):
            for match in pattern.findall(answer):
                if match.casefold() not in allowed_fragments:
                    return True

        if _PROMO_PATTERN.search(answer) and not (
            base_result.promotions
            or any(leaflet.kind.value == "promotion" for leaflet in base_result.leaflets)
            or "does not have a specific promotion" in base_result.message.casefold()
            or "no active branch promotions" in base_result.message.casefold()
        ):
            return True
        return False

    @staticmethod
    def _allowed_fact_fragments(base_result: AIResult) -> set[str]:
        fragments = {base_result.message.casefold()}
        product = base_result.product
        if product is not None:
            if product.price is not None:
                fragments.add(f"${product.price:.2f}".casefold())
                fragments.add(f"rm {product.price:.2f}".casefold())
            if product.stock is not None:
                fragments.add(f"{product.stock} units".casefold())
            if product.shelf_location:
                for part in product.shelf_location.split(","):
                    fragments.add(part.strip().casefold())
                fragments.add(product.shelf_location.casefold())
        return fragments

    @staticmethod
    def _product_context(product: Product | None) -> dict[str, object] | None:
        if product is None:
            return None
        return {
            "id": product.id,
            "name": product.name,
            "aliases": list(product.aliases),
            "branch_id": product.branch_id,
            "price": product.price,
            "stock": product.stock,
            "shelf_location": product.shelf_location,
            "source": product.source,
            "unavailable_reason": product.unavailable_reason,
        }

    @staticmethod
    def _promotion_context(promotion: Promotion) -> dict[str, object]:
        return {
            "id": promotion.id,
            "title": promotion.title,
            "branch_id": promotion.branch_id,
            "product_ids": list(promotion.product_ids),
            "active": promotion.active,
            "valid_from": promotion.valid_from.isoformat(),
            "valid_to": promotion.valid_to.isoformat(),
            "source": promotion.source,
        }

    @staticmethod
    def _leaflet_context(leaflet: Leaflet) -> dict[str, object]:
        return {
            "id": leaflet.id,
            "kind": leaflet.kind.value,
            "title": leaflet.title,
            "description": leaflet.description,
            "branch_id": leaflet.branch_id,
            "active": leaflet.active,
            "valid_from": leaflet.valid_from.isoformat(),
            "valid_to": leaflet.valid_to.isoformat(),
            "image_url": leaflet.image_url,
            "product_ids": list(leaflet.product_ids),
            "category_tags": list(leaflet.category_tags),
            "source": leaflet.source,
        }
