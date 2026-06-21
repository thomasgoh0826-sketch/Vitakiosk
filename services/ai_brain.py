from __future__ import annotations

from services.contracts import VitaFlowAdapter
from services.models import AIResult, Intent, Product
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.workflows import EscalationStore, PurchasingQueryStore


class MockAIBrain:
    def __init__(
        self,
        *,
        vitaflow: VitaFlowAdapter,
        promotion_engine: PromotionEngine,
        guardrails: SafetyGuardrails,
        purchasing_store: PurchasingQueryStore,
        escalation_store: EscalationStore,
    ) -> None:
        self._vitaflow = vitaflow
        self._promotion_engine = promotion_engine
        self._guardrails = guardrails
        self._purchasing_store = purchasing_store
        self._escalation_store = escalation_store

    def respond(self, text: str, branch_id: str) -> AIResult:
        safe_text = " ".join(text.split())
        safety = self._guardrails.evaluate(safe_text)
        if not safety.allowed:
            escalation = self._escalation_store.create(
                safety.reason_code or "safety_handoff",
                branch_id,
            )
            return AIResult(
                intent=Intent.RED_FLAG,
                message=(
                    "I cannot assess or diagnose this. "
                    "A pharmacist has been asked to assist you now."
                ),
                requires_pharmacist=True,
                escalation_id=escalation.id,
                safety_reason=safety.reason_code,
            )

        requested_intent = self._classify(safe_text)
        products = self._vitaflow.search_products(safe_text, branch_id)
        if not products:
            query = self._purchasing_store.create(safe_text, branch_id)
            return AIResult(
                intent=Intent.UNKNOWN_PRODUCT,
                message=(
                    "That product was not found in VitaFlow mock data. "
                    f"Purchasing query {query.id} has been created."
                ),
                requires_pharmacist=False,
                purchasing_query_id=query.id,
            )

        product = products[0]
        return self._build_product_result(requested_intent, product, branch_id)

    @staticmethod
    def _classify(text: str) -> Intent:
        normalized = text.casefold()
        if any(phrase in normalized for phrase in ("how should", "how to use", "counselling")):
            return Intent.PRODUCT_COUNSELLING
        if any(word in normalized for word in ("price", "cost", "how much")):
            return Intent.PRICE_CHECK
        if any(word in normalized for word in ("stock", "available", "availability")):
            return Intent.STOCK_CHECK
        if any(word in normalized for word in ("promotion", "promo", "offer", "discount")):
            return Intent.PROMOTION_CHECK
        if any(word in normalized for word in ("where", "shelf", "location", "find it")):
            return Intent.SHELF_LOCATION
        return Intent.PRODUCT_SEARCH

    def _build_product_result(
        self,
        intent: Intent,
        product: Product,
        branch_id: str,
    ) -> AIResult:
        promotions = tuple(self._promotion_engine.match(product.id, branch_id))

        if intent is Intent.PRICE_CHECK:
            message = self._authoritative_value_message(
                product,
                "price",
                f"${product.price:.2f}" if product.price is not None else None,
            )
        elif intent is Intent.STOCK_CHECK:
            message = self._authoritative_value_message(
                product,
                "stock",
                str(product.stock) if product.stock is not None else None,
            )
        elif intent is Intent.SHELF_LOCATION:
            message = self._authoritative_value_message(
                product,
                "shelf location",
                product.shelf_location,
            )
        elif intent is Intent.PROMOTION_CHECK:
            message = (
                f"Active branch promotion: {promotions[0].title}."
                if promotions
                else "No active promotion is available for this product at this branch."
            )
        elif intent is Intent.PRODUCT_COUNSELLING:
            message = (
                f"I found {product.name} in VitaFlow mock data. "
                "For safe use and personal advice, please speak with the pharmacist."
            )
        else:
            message = f"I found {product.name} in VitaFlow mock data."

        return AIResult(
            intent=intent,
            message=message,
            requires_pharmacist=False,
            product=product,
            promotions=promotions,
            source=product.source,
        )

    @staticmethod
    def _authoritative_value_message(
        product: Product,
        field_name: str,
        value: str | None,
    ) -> str:
        if value is None:
            return f"{product.name} {field_name} is unavailable from VitaFlow."
        return f"VitaFlow mock {field_name} for {product.name}: {value}."


__all__ = ["Intent", "MockAIBrain"]


class LiveAIPlaceholder:
    """Safety-first placeholder for future OpenAI or Ollama AI adapters.

    Guardrails still run before any AI response path. Non-red-flag live
    response generation is intentionally not implemented in this mock-first
    demo, so no external model is called.
    """

    def __init__(
        self,
        *,
        provider_name: str,
        guardrails: SafetyGuardrails,
        escalation_store: EscalationStore,
    ) -> None:
        self.provider_name = provider_name
        self._guardrails = guardrails
        self._escalation_store = escalation_store

    def respond(self, text: str, branch_id: str) -> AIResult:
        safe_text = " ".join(text.split())
        safety = self._guardrails.evaluate(safe_text)
        if not safety.allowed:
            escalation = self._escalation_store.create(
                safety.reason_code or "safety_handoff",
                branch_id,
            )
            return AIResult(
                intent=Intent.RED_FLAG,
                message=(
                    "I cannot assess or diagnose this. "
                    "A pharmacist has been asked to assist you now."
                ),
                requires_pharmacist=True,
                escalation_id=escalation.id,
                safety_reason=safety.reason_code,
            )
        raise RuntimeError(
            f"{self.provider_name} AI is a live-provider placeholder and is "
            "not implemented in the mock-first demo."
        )
