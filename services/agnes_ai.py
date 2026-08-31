from __future__ import annotations

import json

import httpx

from services.agnes_json import parse_agnes_json_object
from services.ai_brain import MockAIBrain
from services.models import AIResult, Intent
from services.ollama_ai import OllamaAIBrain


class AgnesAIBrain(OllamaAIBrain):
    """Agnes wording transport behind VitaFlow and pharmacy guardrails."""

    provider_name = "agnes"

    def __init__(self, *, api_key: str, base_url: str, **kwargs: object) -> None:
        super().__init__(base_url=base_url, **kwargs)
        self._api_key = api_key

    def _call_ollama(self, payload: dict[str, object]) -> dict[str, object] | None:
        try:
            raw_user_message = payload["messages"][1]["content"]
            parsed_user_message = json.loads(str(raw_user_message))
            context = parsed_user_message["workflow_context"]
            if not isinstance(context, dict):
                raise TypeError("workflow context must be an object")
            preferred_language = str(context.get("preferred_language") or "auto")
            detected_language = str(context.get("detected_language") or "english")
            language = preferred_language if preferred_language in {"en", "zh", "ms"} else {
                "english": "en",
                "chinese": "zh",
                "malay": "ms",
                "mixed": "mixed",
            }.get(detected_language, "en")
            compact_context = {
                "customer_text": context.get("corrected_transcript"),
                "approved_answer": context.get("base_safe_answer"),
                "language": language,
                "intent": context.get("intent"),
                "requires_pharmacist": bool(context.get("requires_pharmacist")),
            }
        except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
            return None

        expected_shape = {
            "language": compact_context["language"],
            "intent": compact_context["intent"],
            "answer": compact_context["approved_answer"],
            "emotion": "friendly",
            "ui_actions": [],
            "requires_pharmacist": compact_context["requires_pharmacist"],
            "safety_notes": [],
        }
        request = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are VitaKiosk's wording layer. Return exactly one JSON "
                        "object with the seven keys shown by expected_shape. Do not "
                        "repeat the input, schema, or context. Keep ui_actions and "
                        "safety_notes as empty arrays. Copy expected_shape.answer "
                        "exactly without paraphrasing. Do not add medical advice, stock, price, "
                        "promotion, shelf, dosage, or product claims."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "expected_shape": expected_shape,
                            "input": compact_context,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
            "temperature": 0,
            "max_tokens": 500,
            "stream": False,
        }
        endpoint = (
            self._base_url
            if self._base_url.endswith("/v1/chat/completions")
            else f"{self._base_url}/v1/chat/completions"
        )
        try:
            response = self._client.post(
                endpoint,
                headers={"Authorization": f"Bearer {self._api_key}"},
                json=request,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
            raw_payload = response.json()
            content = raw_payload["choices"][0]["message"]["content"]
            parsed = parse_agnes_json_object(content)
        except (httpx.HTTPError, ValueError, TypeError, KeyError, IndexError):
            return None
        return parsed if isinstance(parsed, dict) else None

    def _validated_answer(
        self,
        payload: dict[str, object],
        base_result: AIResult,
        *,
        expected_language: str,
    ) -> str | None:
        validated = super()._validated_answer(
            payload,
            base_result,
            expected_language=expected_language,
        )
        if validated is not None:
            return validated

        answer = payload.get("answer")
        if (
            base_result.intent is not Intent.PRODUCT_COUNSELLING
            or not MockAIBrain._is_confirmed_self_service_product(base_result.product)
            or not isinstance(answer, str)
            or answer != base_result.message
            or not self._schema_is_valid(
                payload,
                base_result,
                expected_language=expected_language,
            )
            or not self._answer_matches_expected_language(answer, expected_language)
            or self._answer_steers_to_wrong_leaflet_flow(answer, base_result)
            or self._answer_invents_facts(answer, base_result)
        ):
            return None
        return answer
