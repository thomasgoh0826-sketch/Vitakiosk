from __future__ import annotations

from services.contracts import VitaFlowAdapter
from services.leaflet_engine import LeafletEngine
from services.models import (
    AIResult,
    Intent,
    Leaflet,
    LeafletKind,
    Product,
    UiAction,
    UiActionType,
)
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.workflows import EscalationStore, PurchasingQueryStore


class MockAIBrain:
    def __init__(
        self,
        *,
        vitaflow: VitaFlowAdapter,
        promotion_engine: PromotionEngine,
        leaflet_engine: LeafletEngine | None = None,
        guardrails: SafetyGuardrails,
        purchasing_store: PurchasingQueryStore,
        escalation_store: EscalationStore,
    ) -> None:
        self._vitaflow = vitaflow
        self._promotion_engine = promotion_engine
        self._leaflet_engine = leaflet_engine or LeafletEngine()
        self._guardrails = guardrails
        self._purchasing_store = purchasing_store
        self._escalation_store = escalation_store
        self._pending_actions_by_session: dict[str, UiAction] = {}

    def respond(
        self,
        text: str,
        branch_id: str,
        session_id: str | None = None,
    ) -> AIResult:
        safe_text = " ".join(text.split())
        safety = self._guardrails.evaluate(safe_text)
        if not safety.allowed:
            escalation = self._escalation_store.create(
                safety.reason_code or "safety_handoff",
                branch_id,
            )
            self._clear_pending(session_id)
            return AIResult(
                intent=Intent.RED_FLAG,
                message=(
                    "I cannot assess or diagnose this. "
                    "A pharmacist has been asked to assist you now."
                ),
                requires_pharmacist=True,
                escalation_id=escalation.id,
                safety_reason=safety.reason_code,
                ui_actions=(
                    UiAction(type=UiActionType.REQUEST_PHARMACIST_ASSISTANCE),
                ),
            )

        confirmation = self._resolve_pending_confirmation(
            safe_text,
            branch_id=branch_id,
            session_id=session_id,
        )
        if confirmation is not None:
            return confirmation

        requested_intent = self._classify(safe_text)
        products = self._vitaflow.search_products(safe_text, branch_id)
        if not products:
            if requested_intent is Intent.PROMOTION_CHECK:
                return self._build_gallery_result(
                    Intent.PROMOTION_CHECK,
                    branch_id,
                    LeafletKind.PROMOTION,
                )
            if requested_intent is Intent.CAMPAIGN_CHECK:
                return self._build_gallery_result(
                    Intent.CAMPAIGN_CHECK,
                    branch_id,
                    LeafletKind.CAMPAIGN,
                )
            query = self._purchasing_store.create(safe_text, branch_id)
            self._clear_pending(session_id)
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
        return self._build_product_result(
            requested_intent,
            product,
            branch_id,
            session_id=session_id,
        )

    @staticmethod
    def _classify(text: str) -> Intent:
        normalized = text.casefold()
        if any(phrase in normalized for phrase in ("how should", "how to use", "counselling")):
            return Intent.PRODUCT_COUNSELLING
        if any(word in normalized for word in ("campaign", "event", "health campaign")):
            return Intent.CAMPAIGN_CHECK
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
        *,
        session_id: str | None,
    ) -> AIResult:
        promotions = tuple(self._promotion_engine.match(product.id, branch_id))
        product_promotional_leaflets = tuple(
            self._leaflet_engine.for_product(
                product.id,
                branch_id,
                kind=LeafletKind.PROMOTION,
            )
        )
        product_campaign_leaflets = tuple(
            self._leaflet_engine.for_product(
                product.id,
                branch_id,
                kind=LeafletKind.CAMPAIGN,
            )
        )
        branch_leaflets = tuple(self._leaflet_engine.eligible_for_branch(branch_id))
        ui_actions: list[UiAction] = [
            UiAction(type=UiActionType.SHOW_PRODUCT, productId=product.id)
        ]

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
                else (
                    "This product does not have a specific promotion now. "
                    "I can show you other active promotions or health campaigns "
                    "if you are interested."
                )
            )
        elif intent is Intent.CAMPAIGN_CHECK:
            message = (
                f"Active branch campaign leaflet: {product_campaign_leaflets[0].title}."
                if product_campaign_leaflets
                else (
                    "This product does not have a specific campaign leaflet now. "
                    "I can show you other active health campaigns if you are interested."
                )
            )
        elif intent is Intent.PRODUCT_COUNSELLING:
            message = (
                f"I found {product.name} in VitaFlow mock data. "
                "For safe use and personal advice, please speak with the pharmacist. "
                "Would you like me to request pharmacist assistance?"
            )
        else:
            message = f"I found {product.name} in VitaFlow mock data."

        if product_promotional_leaflets:
            promotion_leaflet = product_promotional_leaflets[0]
            ui_actions.append(
                UiAction(
                    type=UiActionType.SHOW_PROMOTION_LEAFLET,
                    promotionId=promotion_leaflet.id,
                )
            )
            if intent is not Intent.PRODUCT_COUNSELLING:
                message = self._with_product_promotion_message(
                    message,
                    promotion_leaflet,
                )
                self._set_pending(
                    session_id,
                    UiAction(
                        type=UiActionType.OPEN_PROMOTION_MODAL,
                        promotionId=promotion_leaflet.id,
                    ),
                )
        elif intent is not Intent.CAMPAIGN_CHECK:
            message = self._with_no_product_promotion_message(message)
            self._clear_pending(session_id)

        if intent is Intent.CAMPAIGN_CHECK and product_campaign_leaflets:
            campaign_leaflet = product_campaign_leaflets[0]
            ui_actions.append(
                UiAction(
                    type=UiActionType.SHOW_CAMPAIGN_LEAFLET,
                    campaignId=campaign_leaflet.id,
                )
            )
            self._set_pending(
                session_id,
                UiAction(
                    type=UiActionType.OPEN_CAMPAIGN_MODAL,
                    campaignId=campaign_leaflet.id,
                ),
            )

        if intent is Intent.PRODUCT_COUNSELLING:
            ui_actions.append(UiAction(type=UiActionType.ASK_PHARMACIST_CONFIRMATION))
            self._set_pending(
                session_id,
                UiAction(type=UiActionType.REQUEST_PHARMACIST_ASSISTANCE),
            )

        return AIResult(
            intent=intent,
            message=message,
            requires_pharmacist=False,
            product=product,
            promotions=promotions,
            leaflets=branch_leaflets,
            ui_actions=tuple(ui_actions),
            source=product.source,
        )

    def _build_gallery_result(
        self,
        intent: Intent,
        branch_id: str,
        kind: LeafletKind,
    ) -> AIResult:
        leaflets = tuple(
            self._leaflet_engine.eligible_for_branch(branch_id, kind=kind)
        )
        if kind is LeafletKind.PROMOTION:
            message = (
                "Here are the active branch promotion leaflets."
                if leaflets
                else "No active branch promotions are available right now."
            )
            action_type = UiActionType.SHOW_PROMOTION_GALLERY
        else:
            message = (
                "Here are the active branch health campaign leaflets."
                if leaflets
                else "No active branch health campaigns are available right now."
            )
            action_type = UiActionType.SHOW_CAMPAIGN_GALLERY

        return AIResult(
            intent=intent,
            message=message,
            requires_pharmacist=False,
            leaflets=leaflets,
            ui_actions=(UiAction(type=action_type),),
            source="mock_vitaflow",
        )

    def _resolve_pending_confirmation(
        self,
        text: str,
        *,
        branch_id: str,
        session_id: str | None,
    ) -> AIResult | None:
        if not self._is_affirmative(text) or session_id is None:
            return None

        pending = self._pending_actions_by_session.pop(session_id, None)
        if pending is None:
            return None

        if pending.type is UiActionType.REQUEST_PHARMACIST_ASSISTANCE:
            escalation = self._escalation_store.create(
                "customer confirmed pharmacist assistance",
                branch_id,
            )
            return AIResult(
                intent=Intent.PRODUCT_COUNSELLING,
                message=(
                    "Pharmacist assistance requested. "
                    "A pharmacist has been notified."
                ),
                requires_pharmacist=True,
                escalation_id=escalation.id,
                ui_actions=(UiAction(type=UiActionType.REQUEST_PHARMACIST_ASSISTANCE),),
                source="mock_ai",
            )

        if pending.type is UiActionType.OPEN_PROMOTION_MODAL and pending.promotionId:
            leaflet = self._leaflet_engine.get(
                pending.promotionId,
                branch_id,
                kind=LeafletKind.PROMOTION,
            )
            return AIResult(
                intent=Intent.PROMOTION_CHECK,
                message="Opening the promotion leaflet now.",
                requires_pharmacist=False,
                leaflets=(leaflet,) if leaflet else (),
                ui_actions=(pending,),
                source="mock_vitaflow",
            )

        if pending.type is UiActionType.OPEN_CAMPAIGN_MODAL and pending.campaignId:
            leaflet = self._leaflet_engine.get(
                pending.campaignId,
                branch_id,
                kind=LeafletKind.CAMPAIGN,
            )
            return AIResult(
                intent=Intent.CAMPAIGN_CHECK,
                message="Opening the campaign leaflet now.",
                requires_pharmacist=False,
                leaflets=(leaflet,) if leaflet else (),
                ui_actions=(pending,),
                source="mock_vitaflow",
            )

        return None

    def _set_pending(self, session_id: str | None, action: UiAction) -> None:
        if session_id:
            self._pending_actions_by_session[session_id] = action

    def _clear_pending(self, session_id: str | None) -> None:
        if session_id:
            self._pending_actions_by_session.pop(session_id, None)

    @staticmethod
    def _is_affirmative(text: str) -> bool:
        normalized = text.casefold().strip()
        return normalized in {
            "yes",
            "yes please",
            "please",
            "ok",
            "okay",
            "sure",
            "show me",
            "open it",
            "enlarge it",
        }

    @staticmethod
    def _with_product_promotion_message(message: str, leaflet: Leaflet) -> str:
        if "active promotion" in message.casefold():
            return f"{message} Would you like me to enlarge the promotion leaflet?"
        return (
            f"{message} Active promotion available: {leaflet.title}. "
            "Would you like me to enlarge the promotion leaflet?"
        )

    @staticmethod
    def _with_no_product_promotion_message(message: str) -> str:
        if "does not have a specific promotion" in message.casefold():
            return message
        return (
            f"{message} This product does not have a specific promotion now. "
            "I can show you other active promotions or health campaigns if you are interested."
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

    def respond(
        self,
        text: str,
        branch_id: str,
        session_id: str | None = None,
    ) -> AIResult:
        del session_id
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
                ui_actions=(
                    UiAction(type=UiActionType.REQUEST_PHARMACIST_ASSISTANCE),
                ),
            )
        raise RuntimeError(
            f"{self.provider_name} AI is a live-provider placeholder and is "
            "not implemented in the mock-first demo."
        )
