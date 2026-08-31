from __future__ import annotations

import re

from services.contracts import VitaFlowAdapter
from services.leaflet_engine import LeafletEngine
from services.models import (
    AIResult,
    Intent,
    Leaflet,
    LeafletKind,
    Product,
    ProductSearchResult,
    UiAction,
    UiActionType,
)
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.openai_stt import detect_transcript_language
from services.transcript_correction import correct_transcript
from services.workflows import EscalationStore, PurchasingQueryStore


SUPPLEMENT_CATEGORIES = {
    "supplement",
    "vitamin",
    "mineral",
    "nutrition",
    "health supplement",
}

SELF_SERVICE_PRODUCT_CATEGORIES = SUPPLEMENT_CATEGORIES | {
    "lozenge",
    "lozenges",
}

OTC_LABEL_INFORMATION_CATEGORIES = {
    "otc",
    "non-prescription medicine",
    "non prescription medicine",
    "over-the-counter medicine",
    "over the counter medicine",
}


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
        self._last_product_by_session: dict[str, Product] = {}

    def respond(
        self,
        text: str,
        branch_id: str,
        session_id: str | None = None,
        preferred_language: str = "auto",
        current_product_id: str | None = None,
    ) -> AIResult:
        safe_text = " ".join(text.split())
        correction = correct_transcript(safe_text)
        corrected_text = correction.corrected_transcript
        lookup_text = corrected_text or safe_text
        response_language = self._response_language(preferred_language, lookup_text)
        safety = self._guardrails.evaluate_any(safe_text, corrected_text)
        if not safety.allowed:
            escalation = self._escalation_store.create(
                safety.reason_code or "safety_handoff",
                branch_id,
                session_id=session_id,
            )
            self._clear_pending(session_id)
            return AIResult(
                intent=Intent.RED_FLAG,
                message=self._safety_message(safety.reason_code, response_language),
                requires_pharmacist=True,
                escalation_id=escalation.id,
                safety_reason=safety.reason_code,
                ui_actions=(
                    UiAction(
                        type=UiActionType.REQUEST_PHARMACIST_ASSISTANCE,
                        reason=self._ui_safety_reason(safety.reason_code),
                    ),
                ),
            )

        confirmation = self._resolve_pending_confirmation(
            safe_text,
            branch_id=branch_id,
            session_id=session_id,
            response_language=response_language,
        )
        if confirmation is not None:
            return confirmation

        current_product = (
            self._vitaflow.get_product(current_product_id, branch_id)
            if current_product_id
            else None
        )
        if current_product is not None:
            self._remember_product(session_id, current_product)

        if self._is_greeting(lookup_text):
            self._clear_pending(session_id)
            return AIResult(
                intent=Intent.GREETING,
                message=self._greeting_message(response_language),
                requires_pharmacist=False,
                leaflets=tuple(self._leaflet_engine.eligible_for_branch(branch_id)),
                source="mock_ai",
            )

        requested_intent = self._classify(lookup_text)
        if self._should_open_product_scan(lookup_text) and not (
            current_product is not None
            and requested_intent is Intent.PRODUCT_COUNSELLING
        ):
            self._clear_pending(session_id)
            return AIResult(
                intent=Intent.PRODUCT_SEARCH,
                message=self._scan_message(response_language),
                requires_pharmacist=False,
                leaflets=tuple(self._leaflet_engine.eligible_for_branch(branch_id)),
                ui_actions=(UiAction(type=UiActionType.OPEN_PRODUCT_SCAN),),
                source="mock_ai",
            )

        has_contextual_product = bool(
            (
                current_product is not None
                or (session_id and session_id in self._last_product_by_session)
            )
            and requested_intent is Intent.PRODUCT_COUNSELLING
        )
        if (
            not has_contextual_product
            and self._is_general_conversation(
                lookup_text,
                correction.possible_product_matches,
            )
        ):
            self._clear_pending(session_id)
            return AIResult(
                intent=Intent.GENERAL_CONVERSATION,
                message=self._general_conversation_message(response_language),
                requires_pharmacist=False,
                leaflets=tuple(self._leaflet_engine.eligible_for_branch(branch_id)),
                source="mock_ai",
            )

        lookup_queries = self._product_lookup_queries(
            lookup_text,
            safe_text,
            correction.possible_product_matches,
        )
        products: list[Product] = []
        for product_query in lookup_queries:
            products = self._vitaflow.search_products(product_query, branch_id)
            if products:
                break
        if not products:
            previous_product = (
                self._last_product_by_session.get(session_id)
                if session_id and requested_intent is Intent.PRODUCT_COUNSELLING
                else None
            )
            if previous_product is not None and previous_product.branch_id == branch_id:
                return self._build_product_result(
                    requested_intent,
                    previous_product,
                    branch_id,
                    lookup_text=lookup_text,
                    session_id=session_id,
                    response_language=response_language,
                )
            product_candidates: tuple[ProductSearchResult, ...] = ()
            for product_query in lookup_queries:
                candidates = self._vitaflow.search_product_candidates(
                    product_query,
                    branch_id,
                )
                if candidates:
                    product_candidates = tuple(candidates)
                    break
            if product_candidates:
                best_candidate = product_candidates[0]
                if best_candidate.confidence >= 0.95:
                    return self._build_product_result(
                        requested_intent,
                        best_candidate.product,
                        branch_id,
                        lookup_text=lookup_text,
                        session_id=session_id,
                        response_language=response_language,
                    )
                self._clear_pending(session_id)
                return AIResult(
                    intent=Intent.PRODUCT_SEARCH,
                    message=self._candidate_message(
                        best_candidate.product,
                        response_language,
                    ),
                    requires_pharmacist=False,
                    product_candidates=product_candidates,
                    leaflets=tuple(self._leaflet_engine.eligible_for_branch(branch_id)),
                    source=best_candidate.product.source,
                )
            if requested_intent is Intent.PROMOTION_CHECK:
                leaflet_terms = self._leaflet_query_terms(lookup_text)
                specific_leaflet = self._find_specific_leaflet_match(
                    lookup_text,
                    branch_id,
                    LeafletKind.PROMOTION,
                )
                if specific_leaflet is not None:
                    return self._build_specific_leaflet_result(
                        Intent.PROMOTION_CHECK,
                        specific_leaflet,
                        response_language=response_language,
                    )
                if leaflet_terms:
                    return self._build_no_matching_specific_leaflet_result(
                        Intent.PROMOTION_CHECK,
                        response_language=response_language,
                    )
                return self._build_gallery_result(
                    Intent.PROMOTION_CHECK,
                    branch_id,
                    LeafletKind.PROMOTION,
                    response_language=response_language,
                )
            if requested_intent is Intent.CAMPAIGN_CHECK:
                leaflet_terms = self._leaflet_query_terms(lookup_text)
                specific_leaflet = self._find_specific_leaflet_match(
                    lookup_text,
                    branch_id,
                    LeafletKind.CAMPAIGN,
                )
                if specific_leaflet is not None:
                    return self._build_specific_leaflet_result(
                        Intent.CAMPAIGN_CHECK,
                        specific_leaflet,
                        response_language=response_language,
                    )
                if leaflet_terms:
                    return self._build_no_matching_specific_leaflet_result(
                        Intent.CAMPAIGN_CHECK,
                        response_language=response_language,
                    )
                return self._build_gallery_result(
                    Intent.CAMPAIGN_CHECK,
                    branch_id,
                    LeafletKind.CAMPAIGN,
                    response_language=response_language,
                )
            if not self._should_create_purchasing_query(safe_text, lookup_text):
                self._clear_pending(session_id)
                return AIResult(
                    intent=Intent.PRODUCT_SEARCH,
                    message=self._need_product_name_message(response_language),
                    requires_pharmacist=False,
                    leaflets=tuple(self._leaflet_engine.eligible_for_branch(branch_id)),
                    source="mock_ai",
                )
            query = self._purchasing_store.create(safe_text, branch_id)
            self._clear_pending(session_id)
            return AIResult(
                intent=Intent.UNKNOWN_PRODUCT,
                message=self._unknown_product_message(query.id, response_language),
                requires_pharmacist=False,
                purchasing_query_id=query.id,
            )

        product = products[0]
        return self._build_product_result(
            requested_intent,
            product,
            branch_id,
            lookup_text=lookup_text,
            session_id=session_id,
            response_language=response_language,
        )

    @staticmethod
    def _product_lookup_queries(
        lookup_text: str,
        safe_text: str,
        possible_product_matches: tuple[dict[str, object], ...],
    ) -> tuple[str, ...]:
        """Retry authoritative lookup with detected product phrases.

        Live ERP search endpoints commonly accept a product phrase but not a
        complete conversational sentence. Brand-only terms are never queried
        alone, which avoids selecting an arbitrary product from a broad brand
        result.
        """

        brand_terms: list[str] = []
        product_terms: list[str] = []
        category_terms: list[str] = []
        for match in possible_product_matches:
            name = str(match.get("name") or "").strip()
            kind = str(match.get("kind") or "").strip()
            if not name:
                continue
            if kind == "brand_term":
                brand_terms.append(name)
            elif kind in {"product", "product_or_brand_term"}:
                product_terms.append(name)
            elif kind == "category_term":
                category_terms.append(name)

        raw_queries: list[str] = [lookup_text]
        conversational_prefix = re.compile(
            r"^\s*(?:please\s+)?(?:tell\s+me\s+about|where\s+is|how\s+do\s+i\s+use)\s+",
            flags=re.IGNORECASE,
        )
        for source_text in (lookup_text, safe_text):
            product_phrase = conversational_prefix.sub("", source_text).strip(" \t\r\n?.!")
            if product_phrase and product_phrase.casefold() != source_text.strip().casefold():
                raw_queries.append(product_phrase)
        if product_terms:
            raw_queries.append(" ".join((*brand_terms, *product_terms)))
            raw_queries.extend(product_terms)
        raw_queries.extend(category_terms)
        raw_queries.append(safe_text)

        queries: list[str] = []
        seen: set[str] = set()
        for query in raw_queries:
            normalized = " ".join(query.split()).casefold()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            queries.append(" ".join(query.split()))
        return tuple(queries)

    @staticmethod
    def _classify(text: str) -> Intent:
        normalized = text.casefold()
        if any(phrase in normalized for phrase in (
            "how should",
            "how to use",
            "how do i use",
            "how can i use",
            "how to take",
            "how many should i take",
            "dosage",
            "benefit",
            "benefits",
            "what is it for",
            "what is it good for",
            "ingredient",
            "ingredients",
            "what is inside",
            "counselling",
            "怎么用",
            "如何用",
            "怎样用",
            "怎么吃",
            "如何吃",
            "如何服用",
            "用法",
            "功效",
            "作用",
            "适合什么",
            "成分",
            "有什么成分",
            "bahan",
            "cara guna",
            "cara makan",
            "cara ambil",
            "manfaat",
            "kegunaan",
        )):
            return Intent.PRODUCT_COUNSELLING
        if any(word in normalized for word in ("campaign", "caimpaign", "event", "health campaign", "活动", "健康活动")):
            return Intent.CAMPAIGN_CHECK
        if any(word in normalized for word in ("price", "cost", "how much", "多少钱", "价格", "价钱", "berapa", "harga")):
            return Intent.PRICE_CHECK
        if any(word in normalized for word in ("promotion", "promo", "offer", "discount", "促销", "优惠", "折扣", "promosi")):
            return Intent.PROMOTION_CHECK
        if any(word in normalized for word in ("stock", "available", "availability", "库存", "有货", "还有吗", "ada stock", "stok")):
            return Intent.STOCK_CHECK
        if any(word in normalized for word in ("direction", "directions", "route", "way to", "go to", "\u65b9\u5411", "\u8def\u7ebf", "\u600e\u4e48\u8d70", "arah", "jalan ke")):
            return Intent.SHELF_LOCATION
        if any(word in normalized for word in ("where", "shelf", "location", "find it", "在哪里", "哪里", "货架", "位置", "lokasi", "rak")):
            return Intent.SHELF_LOCATION
        return Intent.PRODUCT_SEARCH

    def _build_product_result(
        self,
        intent: Intent,
        product: Product,
        branch_id: str,
        *,
        lookup_text: str,
        session_id: str | None,
        response_language: str,
    ) -> AIResult:
        self._remember_product(session_id, product)
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
        product_leaflets = product_promotional_leaflets + product_campaign_leaflets
        if intent is Intent.PRODUCT_COUNSELLING and not self._is_confirmed_self_service_product(product):
            escalation = self._escalation_store.create(
                "medicine_or_unconfirmed_product_counselling",
                branch_id,
                session_id=session_id,
            )
            self._clear_pending(session_id)
            return AIResult(
                intent=intent,
                message=self._medicine_counselling_handoff_message(
                    product,
                    response_language,
                ),
                requires_pharmacist=True,
                product=product,
                escalation_id=escalation.id,
                ui_actions=(
                    UiAction(type=UiActionType.REQUEST_PHARMACIST_ASSISTANCE),
                ),
                source=product.source,
            )
        ui_actions: list[UiAction] = [
            UiAction(type=UiActionType.SHOW_PRODUCT, productId=product.id)
        ]
        auto_open_product_detail = self._should_open_product_detail(intent, lookup_text)
        auto_open_product_summary = self._should_open_product_summary(intent, lookup_text)
        explicit_promotion_request = intent is Intent.PROMOTION_CHECK
        explicit_shelf_request = intent is Intent.SHELF_LOCATION

        if intent is Intent.PRICE_CHECK:
            message = self._authoritative_value_message(
                product,
                "price",
                f"RM{product.price:.2f}" if product.price is not None else None,
                response_language,
            )
        elif intent is Intent.STOCK_CHECK:
            message = self._authoritative_value_message(
                product,
                "stock",
                str(product.stock) if product.stock is not None else None,
                response_language,
            )
        elif intent is Intent.SHELF_LOCATION:
            message = self._authoritative_value_message(
                product,
                "shelf location",
                product.shelf_location,
                response_language,
            )
        elif intent is Intent.PROMOTION_CHECK:
            if promotions:
                message = self._active_promotion_message(
                    promotions[0].title,
                    response_language,
                )
            elif product_promotional_leaflets:
                message = self._active_promotion_message(
                    product_promotional_leaflets[0].title,
                    response_language,
                )
            else:
                message = self._no_specific_promotion_message(response_language)
        elif intent is Intent.CAMPAIGN_CHECK:
            message = (
                self._active_campaign_message(
                    product_campaign_leaflets[0].title,
                    response_language,
                )
                if product_campaign_leaflets
                else self._no_specific_campaign_message(response_language)
            )
        elif intent is Intent.PRODUCT_COUNSELLING:
            message = self._self_service_product_message(
                product,
                response_language,
                lookup_text,
            )
        else:
            message = self._product_found_message(product, response_language)

        if product_promotional_leaflets:
            promotion_leaflet = product_promotional_leaflets[0]
            if explicit_promotion_request:
                ui_actions.append(
                    UiAction(
                        type=UiActionType.OPEN_PROMOTION_MODAL,
                        productId=product.id,
                        promotionId=promotion_leaflet.id,
                    )
                )
                self._clear_pending(session_id)
            else:
                if not (auto_open_product_detail or auto_open_product_summary or explicit_shelf_request):
                    ui_actions.append(
                        UiAction(
                            type=UiActionType.SHOW_PROMOTION_LEAFLET,
                            productId=product.id,
                            promotionId=promotion_leaflet.id,
                        )
                    )
                self._clear_pending(session_id)
        elif intent is not Intent.CAMPAIGN_CHECK:
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

        if auto_open_product_detail:
            ui_actions.insert(
                1,
                UiAction(
                    type=UiActionType.OPEN_PRODUCT_DETAIL,
                    productId=product.id,
                ),
            )

        if auto_open_product_summary:
            ui_actions.insert(
                1,
                UiAction(
                    type=UiActionType.OPEN_PRODUCT_SUMMARY,
                    productId=product.id,
                ),
            )

        if explicit_shelf_request:
            ui_actions.insert(
                1,
                UiAction(
                    type=UiActionType.OPEN_SHELF_MAP,
                    productId=product.id,
                    shelf=product.shelf_location,
                ),
            )

        return AIResult(
            intent=intent,
            message=message,
            requires_pharmacist=False,
            product=product,
            promotions=promotions,
            leaflets=product_leaflets or branch_leaflets,
            ui_actions=tuple(ui_actions),
            source=product.source,
        )

    @staticmethod
    def _is_confirmed_self_service_product(product: Product | None) -> bool:
        if product is None:
            return False

        category = (product.kiosk_category or "").strip().casefold()
        if category in SELF_SERVICE_PRODUCT_CATEGORIES:
            return True

        if category not in OTC_LABEL_INFORMATION_CATEGORIES:
            return False

        if product.source != "vitaflow_erp":
            return False

        summary = product.productSummary
        if not isinstance(summary, dict):
            return False

        return any(
            isinstance(summary.get(field), dict)
            and any(
                isinstance(value, str) and bool(value.strip())
                for value in summary[field].values()
            )
            for field in ("howToUse", "bestFor", "description", "ingredient")
        )

    def _remember_product(self, session_id: str | None, product: Product) -> None:
        if not session_id:
            return
        self._last_product_by_session.pop(session_id, None)
        self._last_product_by_session[session_id] = product
        while len(self._last_product_by_session) > 256:
            oldest_session = next(iter(self._last_product_by_session))
            self._last_product_by_session.pop(oldest_session, None)

    @staticmethod
    def _leaflet_query_terms(text: str) -> set[str]:
        normalized = text.casefold()
        for phrase in (
            "有什么",
            "有哪些",
            "什么",
            "全部",
            "查看",
            "请问",
            "给我看",
            "让我看",
        ):
            normalized = normalized.replace(phrase, " ")
        generic_terms = {
            "active",
            "all",
            "any",
            "available",
            "branch",
            "can",
            "campaign",
            "caimpaign",
            "could",
            "current",
            "discount",
            "display",
            "do",
            "does",
            "for",
            "gallery",
            "have",
            "health",
            "help",
            "here",
            "in",
            "is",
            "leaflet",
            "leaflets",
            "list",
            "me",
            "offer",
            "offers",
            "outlet",
            "please",
            "promo",
            "promot",
            "promotion",
            "promotions",
            "find",
            "search",
            "show",
            "tell",
            "there",
            "this",
            "what",
            "you",
            "有",
            "吗",
            "促销",
            "优惠",
            "活动",
            "promosi",
            "risalah",
            "kempen",
        }
        return {
            token
            for token in re.findall(r"[\w\u4e00-\u9fff]+", normalized)
            if len(token) >= 2 and token not in generic_terms
        }

    def _find_specific_leaflet_match(
        self,
        text: str,
        branch_id: str,
        kind: LeafletKind,
    ) -> Leaflet | None:
        terms = self._leaflet_query_terms(text)
        if not terms:
            return None

        best_leaflet: Leaflet | None = None
        best_score = 0
        for leaflet in self._leaflet_engine.eligible_for_branch(branch_id, kind=kind):
            haystack = " ".join(
                (
                    leaflet.title,
                    leaflet.description,
                    " ".join(leaflet.category_tags),
                    " ".join(leaflet.product_ids),
                )
            ).casefold()
            score = sum(1 for term in terms if term in haystack)
            if score > best_score:
                best_leaflet = leaflet
                best_score = score

        return best_leaflet if best_score > 0 else None

    def _build_specific_leaflet_result(
        self,
        intent: Intent,
        leaflet: Leaflet,
        *,
        response_language: str,
    ) -> AIResult:
        if leaflet.kind is LeafletKind.PROMOTION:
            ui_actions = (
                UiAction(
                    type=UiActionType.SHOW_PROMOTION_LEAFLET,
                    promotionId=leaflet.id,
                ),
                UiAction(
                    type=UiActionType.OPEN_PROMOTION_MODAL,
                    promotionId=leaflet.id,
                ),
            )
        else:
            ui_actions = (
                UiAction(
                    type=UiActionType.SHOW_CAMPAIGN_LEAFLET,
                    campaignId=leaflet.id,
                ),
                UiAction(
                    type=UiActionType.OPEN_CAMPAIGN_MODAL,
                    campaignId=leaflet.id,
                ),
            )

        return AIResult(
            intent=intent,
            message=self._specific_leaflet_message(leaflet, response_language),
            requires_pharmacist=False,
            leaflets=(leaflet,),
            ui_actions=ui_actions,
            source="mock_vitaflow",
        )

    def _build_no_matching_specific_leaflet_result(
        self,
        intent: Intent,
        *,
        response_language: str,
    ) -> AIResult:
        return AIResult(
            intent=intent,
            message=self._no_matching_specific_leaflet_message(
                intent,
                response_language,
            ),
            requires_pharmacist=False,
            source="mock_vitaflow",
        )

    def _build_gallery_result(
        self,
        intent: Intent,
        branch_id: str,
        kind: LeafletKind,
        *,
        response_language: str,
    ) -> AIResult:
        typed_leaflets = tuple(
            self._leaflet_engine.eligible_for_branch(branch_id, kind=kind)
        )
        deck_leaflets = tuple(self._leaflet_engine.eligible_for_branch(branch_id))
        if kind is LeafletKind.PROMOTION:
            message = (
                self._promotion_gallery_message(response_language, typed_leaflets)
                if typed_leaflets
                else self._no_promotion_gallery_message(response_language)
            )
            action_type = UiActionType.SHOW_PROMOTION_GALLERY
            open_action = (
                UiAction(
                    type=UiActionType.OPEN_PROMOTION_MODAL,
                    promotionId=typed_leaflets[0].id,
                )
                if typed_leaflets
                else None
            )
        else:
            message = (
                self._campaign_gallery_message(response_language, typed_leaflets)
                if typed_leaflets
                else self._no_campaign_gallery_message(response_language)
            )
            action_type = UiActionType.SHOW_CAMPAIGN_GALLERY
            open_action = (
                UiAction(
                    type=UiActionType.OPEN_CAMPAIGN_MODAL,
                    campaignId=typed_leaflets[0].id,
                )
                if typed_leaflets
                else None
            )
        ui_actions = [UiAction(type=action_type)]
        if open_action is not None:
            ui_actions.append(open_action)

        return AIResult(
            intent=intent,
            message=message,
            requires_pharmacist=False,
            leaflets=deck_leaflets,
            ui_actions=tuple(ui_actions),
            source="mock_vitaflow",
        )

    def _resolve_pending_confirmation(
        self,
        text: str,
        *,
        branch_id: str,
        session_id: str | None,
        response_language: str,
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
                session_id=session_id,
            )
            return AIResult(
                intent=Intent.PRODUCT_COUNSELLING,
                message=self._pharmacist_requested_message(response_language),
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
            product = (
                self._vitaflow.get_product(pending.productId, branch_id)
                if pending.productId
                else None
            )
            return AIResult(
                intent=Intent.PROMOTION_CHECK,
                message=self._opening_promotion_message(response_language),
                requires_pharmacist=False,
                product=product,
                leaflets=tuple(self._leaflet_engine.eligible_for_branch(branch_id)),
                ui_actions=(pending,),
                source="mock_vitaflow",
            )

        if pending.type is UiActionType.OPEN_CAMPAIGN_MODAL and pending.campaignId:
            leaflet = self._leaflet_engine.get(
                pending.campaignId,
                branch_id,
                kind=LeafletKind.CAMPAIGN,
            )
            product = (
                self._vitaflow.get_product(pending.productId, branch_id)
                if pending.productId
                else None
            )
            return AIResult(
                intent=Intent.CAMPAIGN_CHECK,
                message=self._opening_campaign_message(response_language),
                requires_pharmacist=False,
                product=product,
                leaflets=tuple(self._leaflet_engine.eligible_for_branch(branch_id)),
                ui_actions=(pending,),
                source="mock_vitaflow",
            )

        if pending.type in {
            UiActionType.SHOW_PROMOTION_GALLERY,
            UiActionType.SHOW_CAMPAIGN_GALLERY,
        }:
            product = (
                self._vitaflow.get_product(pending.productId, branch_id)
                if pending.productId
                else None
            )
            branch_leaflets = tuple(self._leaflet_engine.eligible_for_branch(branch_id))
            promotion_leaflets = tuple(
                leaflet
                for leaflet in branch_leaflets
                if leaflet.kind is LeafletKind.PROMOTION
            )
            campaign_leaflets = tuple(
                leaflet
                for leaflet in branch_leaflets
                if leaflet.kind is LeafletKind.CAMPAIGN
            )
            if pending.type is UiActionType.SHOW_PROMOTION_GALLERY:
                ui_actions: list[UiAction] = [UiAction(type=UiActionType.SHOW_PROMOTION_GALLERY)]
                if promotion_leaflets:
                    ui_actions.append(
                        UiAction(
                            type=UiActionType.OPEN_PROMOTION_MODAL,
                            promotionId=promotion_leaflets[0].id,
                        )
                    )
                message = (
                    self._promotion_gallery_message(
                        response_language,
                        promotion_leaflets,
                    )
                    if promotion_leaflets
                    else self._no_promotion_gallery_message(response_language)
                )
                intent = Intent.PROMOTION_CHECK
            else:
                ui_actions = [UiAction(type=UiActionType.SHOW_CAMPAIGN_GALLERY)]
                if campaign_leaflets:
                    ui_actions.append(
                        UiAction(
                            type=UiActionType.OPEN_CAMPAIGN_MODAL,
                            campaignId=campaign_leaflets[0].id,
                        )
                    )
                message = (
                    self._campaign_gallery_message(
                        response_language,
                        campaign_leaflets,
                    )
                    if campaign_leaflets
                    else self._no_campaign_gallery_message(response_language)
                )
                intent = Intent.CAMPAIGN_CHECK

            return AIResult(
                intent=intent,
                message=message,
                requires_pharmacist=False,
                product=product,
                leaflets=branch_leaflets,
                ui_actions=tuple(ui_actions),
                source="mock_vitaflow",
            )

        return None

    def _set_pending(self, session_id: str | None, action: UiAction) -> None:
        if session_id:
            self._pending_actions_by_session[session_id] = action

    def _clear_pending(self, session_id: str | None) -> None:
        if session_id:
            self._pending_actions_by_session.pop(session_id, None)

    def _fallback_leaflet_gallery_action(
        self,
        product_id: str,
        branch_id: str,
    ) -> UiAction | None:
        branch_leaflets = tuple(self._leaflet_engine.eligible_for_branch(branch_id))
        if any(leaflet.kind is LeafletKind.PROMOTION for leaflet in branch_leaflets):
            return UiAction(
                type=UiActionType.SHOW_PROMOTION_GALLERY,
                productId=product_id,
            )
        if any(leaflet.kind is LeafletKind.CAMPAIGN for leaflet in branch_leaflets):
            return UiAction(
                type=UiActionType.SHOW_CAMPAIGN_GALLERY,
                productId=product_id,
            )
        return UiAction(
            type=UiActionType.SHOW_PROMOTION_GALLERY,
            productId=product_id,
        )

    @staticmethod
    def _is_affirmative(text: str) -> bool:
        normalized = re.sub(r"[^\w\u4e00-\u9fff]+", " ", text.casefold()).strip()
        affirmative_phrases = {
            "yes",
            "yes please",
            "yes interested",
            "yes i am interested",
            "i am interested",
            "interested",
            "please",
            "ok",
            "okay",
            "sure",
            "show me",
            "show it",
            "open it",
            "enlarge it",
            "ya",
            "ya please",
            "boleh",
            "boleh tunjuk",
            "nak",
            "nak tengok",
            "可以",
            "可以看",
            "可以给我看",
            "要",
            "要看",
            "好",
            "好的",
            "可以打开",
        }
        if normalized in affirmative_phrases:
            return True
        return any(
            phrase in normalized
            for phrase in (
                "yes interested",
                "show me other promotion",
                "show other promotion",
                "show me campaign",
                "show campaign",
                "我要看",
                "给我看",
                "我想看",
                "saya nak tengok",
                "tunjuk promosi",
                "tunjuk kempen",
            )
        )

    @staticmethod
    def _should_open_product_detail(intent: Intent, text: str) -> bool:
        normalized = text.casefold()
        return (
            intent in {Intent.PRICE_CHECK, Intent.STOCK_CHECK}
            or any(
                phrase in normalized
                for phrase in (
                    "detail",
                    "details",
                    "tell me about",
                    "what is relief balm",
                    "used for",
                    "what is it",
                )
            )
        )

    @staticmethod
    def _should_open_product_scan(text: str) -> bool:
        normalized = text.casefold()
        return any(
            phrase in normalized
            for phrase in (
                "scan product",
                "scan this",
                "scan again",
                "try scan",
                "check this product",
                "check this item",
                "find this item",
                "identify this",
                "identify this product",
                "what is this medicine",
                "what is this product",
                "what is this item",
                "this medicine",
                "this item",
                "show the item",
            )
        )

    @staticmethod
    def _should_open_product_summary(intent: Intent, text: str) -> bool:
        normalized = text.casefold()
        return intent is Intent.PRODUCT_COUNSELLING or any(
            phrase in normalized
            for phrase in (
                "ingredient",
                "ingredients",
                "what is inside",
                "how to use",
                "how should",
                "how do i use",
                "how can i use",
                "how to take",
                "dosage",
                "benefit",
                "benefits",
                "what is it for",
                "what is it good for",
                "best for",
                "summary",
                "description",
                "size",
                "成分",
                "怎么用",
                "如何用",
                "怎样用",
                "怎么吃",
                "如何吃",
                "如何服用",
                "用法",
                "功效",
                "作用",
                "适合什么",
                "bahan",
                "cara guna",
                "cara makan",
                "cara ambil",
                "manfaat",
                "kegunaan",
            )
        )

    @staticmethod
    def _should_create_purchasing_query(original_text: str, lookup_text: str) -> bool:
        """Create purchasing miss only for product-like unknowns.

        A kiosk conversation has many non-product sentences. Not finding a
        VitaFlow product is not enough by itself; otherwise greetings,
        identity questions, and vague help requests become fake purchasing
        requests. The miss query is appropriate only when the text resembles a
        product/brand/category name, barcode/SKU, or explicit item search.
        """

        normalized = " ".join(lookup_text.casefold().strip().split())
        original = " ".join(original_text.strip().split())
        if not normalized:
            return False

        if any(char.isdigit() for char in normalized) and sum(char.isdigit() for char in normalized) >= 5:
            return True
        if re.search(
            r"\b\d+(?:\.\d+)?\s?(?:mcg|mg|ml|g|gm|kg|tablets?|capsules?|sachets?|lozenges?)\b",
            normalized,
        ):
            return True

        product_markers = {
            "tablet",
            "tablets",
            "capsule",
            "capsules",
            "syrup",
            "cream",
            "ointment",
            "gel",
            "balm",
            "spray",
            "drops",
            "lozenge",
            "powder",
            "sachet",
            "supplement",
            "vitamin",
            "mineral",
            "probiotic",
            "medicine",
            "medication",
            "ubat",
            "produk",
            "produk ini",
            "\u836f",
            "\u836f\u54c1",
            "\u4ea7\u54c1",
            "\u4fdd\u5065\u54c1",
            "\u7ef4\u751f\u7d20",
        }
        if any(marker in normalized for marker in product_markers):
            return True

        search_markers = {
            "do you have",
            "do you sell",
            "looking for",
            "i need",
            "i want to buy",
            "can i buy",
            "where can i find",
            "ada",
            "\u6709\u6ca1\u6709",
            "\u6709\u5417",
            "\u627e",
            "\u4e70",
        }
        if any(marker in normalized for marker in search_markers):
            non_product_phrases = {
                "do you have time",
                "do you have a name",
                "i need help",
                "i want to know",
            }
            if normalized not in non_product_phrases:
                return True

        question_like = normalized.startswith(
            (
                "what ",
                "who ",
                "why ",
                "how ",
                "where ",
                "when ",
                "are ",
                "is ",
                "can ",
                "could ",
                "would ",
                "will ",
                "tell ",
                "talk ",
            )
        )

        tokens = [token.strip(".,!?;:()[]{}'\"") for token in original.split()]
        meaningful_tokens = [
            token
            for token in tokens
            if token
            and token.casefold() not in {
                "a",
                "an",
                "the",
                "this",
                "that",
                "it",
                "you",
                "your",
                "me",
                "my",
                "i",
                "is",
                "are",
                "am",
                "can",
                "what",
                "who",
                "where",
                "how",
                "why",
                "please",
                "help",
                "tell",
                "something",
                "anything",
                "sing",
                "song",
                "name",
                "nice",
                "chat",
                "talk",
            }
        ]
        if question_like:
            title_like_tokens = [
                token
                for token in meaningful_tokens
                if token[:1].isupper() and len(token) >= 3
            ]
            return len(title_like_tokens) >= 2
        if 1 <= len(meaningful_tokens) <= 4:
            has_brand_like_token = any(
                any(char.isalpha() for char in token)
                and (
                    token[:1].isupper()
                    or any(char.isdigit() for char in token)
                )
                for token in meaningful_tokens
            )
            has_multiword_name_shape = len(meaningful_tokens) >= 2 and all(
                len(token) >= 4 for token in meaningful_tokens
            )
            return has_brand_like_token or has_multiword_name_shape

        return False

    @staticmethod
    def _is_greeting(text: str) -> bool:
        normalized = " ".join(text.casefold().strip().split())
        return normalized in {
            "hi",
            "hello",
            "hey",
            "good morning",
            "good afternoon",
            "good evening",
            "你好",
            "嗨",
            "hai",
            "halo",
            "helo",
            "selamat pagi",
            "selamat tengah hari",
            "selamat petang",
        }

    @staticmethod
    def _is_general_conversation(
        text: str,
        possible_product_matches: tuple[dict[str, object], ...] = (),
    ) -> bool:
        normalized = " ".join(text.casefold().strip().split())
        if not normalized:
            return True
        stripped = normalized.strip(" ?!.。，！？")
        if stripped in {
            "how are you",
            "how are you today",
            "what can you do",
            "what can you help me with",
            "can you help me",
            "help me",
            "thanks",
            "thank you",
            "thanks for your help",
            "who are you",
            "tell me about yourself",
            "\u4f60\u4f1a\u4ec0\u4e48",
            "\u4f60\u53ef\u4ee5\u5e2e\u6211\u4ec0\u4e48",
            "\u4f60\u597d\u5417",
            "\u4f60\u662f\u8c01",
            "\u4f60\u53eb\u4ec0\u4e48",
            "\u4f60\u662f ai \u5417",
            "\u4f60\u662fai\u5417",
            "\u4f60\u662f\u4ec0\u4e48",
            "\u8c22\u8c22",
            "terima kasih",
            "apa yang boleh awak bantu",
        }:
            return True

        intent = MockAIBrain._classify(text)
        if intent in {Intent.PROMOTION_CHECK, Intent.CAMPAIGN_CHECK}:
            return False
        if any(str(match.get("name") or "").strip() for match in possible_product_matches):
            return False
        return not MockAIBrain._should_create_purchasing_query(text, text)

    @staticmethod
    def _response_language(preferred_language: str, text: str) -> str:
        preferred = preferred_language.strip().casefold()
        if preferred in {"en", "zh", "ms"}:
            return preferred
        detected = detect_transcript_language(text)
        if detected == "chinese":
            return "zh"
        if detected == "malay":
            return "ms"
        if detected == "mixed":
            return "zh" if any("\u4e00" <= char <= "\u9fff" for char in text) else "ms"
        return "en"

    @staticmethod
    def _greeting_message(language: str) -> str:
        if language == "zh":
            return "你好，我是 VitaKiosk。你可以问我产品价格、库存、促销、货架位置，或让我帮你扫描产品。"
        if language == "ms":
            return "Hai, saya VitaKiosk. Anda boleh tanya tentang harga produk, stok, promosi, lokasi rak, atau tunjukkan produk untuk diimbas."
        return (
            "Hi, I am VitaKiosk. You can ask me about product price, stock, "
            "promotions, shelf location, or show me a product to scan."
        )

    @staticmethod
    def _general_conversation_message(language: str) -> str:
        if language == "zh":
            return (
                "\u6211\u53ef\u4ee5\u5e2e\u4f60\u67e5\u4ea7\u54c1\u4ef7\u683c\u3001"
                "\u5e93\u5b58\u3001\u4fc3\u9500\u3001\u8d27\u67b6\u4f4d\u7f6e\uff0c"
                "\u6216\u5e2e\u4f60\u626b\u63cf\u4ea7\u54c1\u3002\u5982\u679c\u662f"
                "\u7528\u836f\u5b89\u5168\u6216\u4e2a\u4eba\u5065\u5eb7\u95ee\u9898\uff0c"
                "\u6211\u4f1a\u8bf7\u836f\u5242\u5e08\u534f\u52a9\u3002"
            )
        if language == "ms":
            return (
                "Saya boleh bantu semak harga produk, stok, promosi, lokasi rak, "
                "atau imbas produk. Untuk soalan ubat atau keselamatan kesihatan, "
                "saya akan minta bantuan ahli farmasi."
            )
        return (
            "I can help with product prices, stock, promotions, shelf location, "
            "or product scanning. For medicine safety or personal health advice, "
            "I will hand over to the pharmacist."
        )

    @staticmethod
    def _need_product_name_message(language: str) -> str:
        if language == "zh":
            return (
                "\u6211\u8fd8\u9700\u8981\u66f4\u660e\u786e\u7684\u4ea7\u54c1\u540d\u79f0\u3001"
                "\u54c1\u724c\u3001\u6761\u7801\u6216\u5305\u88c5\u4fe1\u606f\u624d\u80fd\u67e5\u8be2\u3002"
                "\u4f60\u4e5f\u53ef\u4ee5\u628a\u4ea7\u54c1\u653e\u5230\u626b\u63cf\u6846\u91cc\u3002"
            )
        if language == "ms":
            return (
                "Saya perlukan nama produk, jenama, kod bar, atau maklumat label "
                "yang lebih jelas untuk semakan. Anda juga boleh imbas produk."
            )
        return (
            "Please give me a product name, brand, barcode, or label details so I can check VitaFlow. "
            "You can also place the product inside the scan box."
        )

    @staticmethod
    def _scan_message(language: str) -> str:
        if language == "zh":
            return "可以，请把产品放进扫描框内。请将条码、包装正面或标签对准框中。"
        if language == "ms":
            return "Boleh. Sila tunjukkan item di dalam kotak imbasan. Letakkan kod bar, bahagian depan bungkusan, atau label dalam bingkai."
        return (
            "Sure, please show the item inside the scan box. "
            "Place the product barcode, package front, or label inside the frame."
        )

    @staticmethod
    def _candidate_message(product: Product, language: str) -> str:
        if language == "zh":
            return f"你是指 {product.name} 吗？"
        if language == "ms":
            return f"Adakah maksud anda {product.name}?"
        return f"Do you mean {product.name}?"

    @staticmethod
    def _unknown_product_message(query_id: str, language: str) -> str:
        if language == "zh":
            return f"VitaFlow mock 资料没有找到这个产品。已建立采购查询 {query_id}。"
        if language == "ms":
            return f"Produk itu tidak dijumpai dalam data VitaFlow mock. Pertanyaan pembelian {query_id} telah dibuat."
        return (
            "That product was not found in VitaFlow mock data. "
            f"Purchasing query {query_id} has been created."
        )

    @staticmethod
    def _product_found_message(product: Product, language: str) -> str:
        is_mock = product.source.casefold().startswith("mock")
        if language == "zh":
            source = "VitaFlow mock 资料" if is_mock else "VitaFlow ERP"
            return f"我在 {source} 找到 {product.name}。"
        if language == "ms":
            source = "data VitaFlow mock" if is_mock else "VitaFlow ERP"
            return f"Saya jumpa {product.name} dalam {source}."
        source = "VitaFlow mock data" if is_mock else "VitaFlow ERP"
        return f"I found {product.name} in {source}."

    @staticmethod
    def _active_promotion_message(title: str, language: str) -> str:
        if language == "zh":
            return f"当前分店促销：{title}。"
        if language == "ms":
            return f"Promosi cawangan aktif: {title}."
        return f"Active branch promotion: {title}."

    @staticmethod
    def _active_campaign_message(title: str, language: str) -> str:
        if language == "zh":
            return f"当前分店健康活动单张：{title}。"
        if language == "ms":
            return f"Risalah kempen kesihatan cawangan aktif: {title}."
        return f"Active branch campaign leaflet: {title}."

    @staticmethod
    def _no_specific_promotion_message(language: str) -> str:
        if language == "zh":
            return "这个产品目前没有指定促销。我可以为你显示其他有效促销或健康活动。"
        if language == "ms":
            return "Produk ini tiada promosi khusus sekarang. Saya boleh tunjukkan promosi aktif lain atau kempen kesihatan jika anda mahu."
        return (
            "This product does not have a specific promotion now. "
            "I can show you other active promotions or health campaigns "
            "if you are interested."
        )

    @staticmethod
    def _no_specific_campaign_message(language: str) -> str:
        if language == "zh":
            return "这个产品目前没有指定健康活动单张。我可以为你显示其他有效健康活动。"
        if language == "ms":
            return "Produk ini tiada risalah kempen khusus sekarang. Saya boleh tunjukkan kempen kesihatan aktif lain jika anda mahu."
        return (
            "This product does not have a specific campaign leaflet now. "
            "I can show you other active health campaigns if you are interested."
        )

    @staticmethod
    def _medicine_counselling_handoff_message(product: Product, language: str) -> str:
        if language == "zh":
            return f"我在 VitaFlow 找到 {product.name}，但它不是已确认的保健品。药物用法或个人建议必须由药剂师处理。我现在为你请求药剂师协助。"
        if language == "ms":
            return f"Saya jumpa {product.name} dalam VitaFlow, tetapi ia bukan suplemen yang disahkan. Penggunaan ubat atau nasihat peribadi mesti dirujuk kepada ahli farmasi. Saya akan minta bantuan ahli farmasi sekarang."
        return (
            f"I found {product.name} in VitaFlow, but it is not a confirmed supplement. "
            "Medicine use or personal advice must be handled by a pharmacist. "
            "I am requesting pharmacist assistance now."
        )

    @classmethod
    def _self_service_product_message(
        cls,
        product: Product,
        language: str,
        text: str,
    ) -> str:
        summary = product.productSummary if isinstance(product.productSummary, dict) else {}
        language_key = {"zh": "zh", "ms": "ms"}.get(language, "en")
        normalized = text.casefold()

        def summary_value(key: str) -> str | None:
            localized = summary.get(key)
            if not isinstance(localized, dict):
                return None
            value = localized.get(language_key) or localized.get("en")
            return str(value).strip() if value else None

        requested_keys: list[str] = []
        if any(phrase in normalized for phrase in (
            "how should",
            "how to use",
            "how do i use",
            "how can i use",
            "how to take",
            "how many should i take",
            "dosage",
            "怎么用",
            "如何用",
            "怎样用",
            "怎么吃",
            "如何吃",
            "如何服用",
            "用法",
            "cara guna",
            "cara makan",
            "cara ambil",
        )):
            requested_keys.append("howToUse")
        if any(phrase in normalized for phrase in (
            "benefit",
            "benefits",
            "best for",
            "what is it for",
            "what is it good for",
            "what is this for",
            "what is this product for",
            "what is this supplement for",
            "what is this medicine for",
            "功效",
            "作用",
            "适合什么",
            "manfaat",
            "kegunaan",
        )):
            requested_keys.append("bestFor")
        if any(phrase in normalized for phrase in (
            "ingredient",
            "ingredients",
            "what is inside",
            "成分",
            "有什么成分",
            "bahan",
        )):
            requested_keys.append("ingredient")
        if any(phrase in normalized for phrase in ("description", "summary", "介绍", "说明")):
            requested_keys.append("description")
        if any(phrase in normalized for phrase in ("size", "pack size", "规格", "berapa biji")):
            requested_keys.append("size")
        if not requested_keys:
            requested_keys = ["description", "ingredient", "howToUse", "bestFor", "size"]

        details = [value for key in requested_keys if (value := summary_value(key))]
        if not details:
            if language == "zh":
                return f"VitaFlow 已找到 {product.name}，但暂时没有提供这项产品说明。"
            if language == "ms":
                return f"VitaFlow menemui {product.name}, tetapi maklumat produk ini belum tersedia."
            return (
                f"VitaFlow found {product.name}, but this product information is "
                "currently unavailable."
            )
        joined = " ".join(details)
        if language == "zh":
            return f"根据 VitaFlow 已确认的产品资料：{joined}"
        if language == "ms":
            return f"Berdasarkan maklumat produk yang disahkan oleh VitaFlow: {joined}"
        return f"VitaFlow-confirmed product information: {joined}"

    @staticmethod
    def _promotion_gallery_message(
        language: str,
        leaflets: tuple[Leaflet, ...],
    ) -> str:
        titles = "; ".join(leaflet.title for leaflet in leaflets)
        if language == "zh":
            return f"当前分店有效的促销有：{titles}。"
        if language == "ms":
            return f"Promosi aktif semasa untuk cawangan ini: {titles}."
        return f"Current active branch promotions: {titles}."

    @staticmethod
    def _specific_leaflet_message(leaflet: Leaflet, language: str) -> str:
        if leaflet.kind is LeafletKind.PROMOTION:
            if language == "zh":
                return f"我找到相关的促销单张：{leaflet.title}。我现在打开给你看。"
            if language == "ms":
                return f"Saya jumpa risalah promosi yang berkaitan: {leaflet.title}. Saya buka sekarang."
            return f"I found the matching promotion leaflet: {leaflet.title}. I’ll open it for you now."
        if language == "zh":
            return f"我找到相关的活动单张：{leaflet.title}。我现在打开给你看。"
        if language == "ms":
            return f"Saya jumpa risalah kempen yang berkaitan: {leaflet.title}. Saya buka sekarang."
        return f"I found the matching campaign leaflet: {leaflet.title}. I’ll open it for you now."

    @staticmethod
    def _no_matching_specific_leaflet_message(intent: Intent, language: str) -> str:
        if intent is Intent.CAMPAIGN_CHECK:
            if language == "zh":
                return "我没有找到相关的有效活动单张。你也可以问我查看当前分店的全部健康活动。"
            if language == "ms":
                return "Saya tidak jumpa risalah kempen aktif yang sepadan. Anda boleh minta saya tunjukkan semua kempen aktif cawangan ini."
            return "I could not find a matching active campaign leaflet. You can ask me to show all active branch campaigns."
        if language == "zh":
            return "我没有找到相关的有效促销单张。你也可以问我查看当前分店的全部促销。"
        if language == "ms":
            return "Saya tidak jumpa risalah promosi aktif yang sepadan. Anda boleh minta saya tunjukkan semua promosi aktif cawangan ini."
        return "I could not find a matching active promotion leaflet. You can ask me to show all active branch promotions."

    @staticmethod
    def _no_promotion_gallery_message(language: str) -> str:
        if language == "zh":
            return "目前没有当前分店有效的促销。"
        if language == "ms":
            return "Tiada promosi aktif untuk cawangan ini sekarang."
        return "No active branch promotions are available right now."

    @staticmethod
    def _campaign_gallery_message(
        language: str,
        leaflets: tuple[Leaflet, ...],
    ) -> str:
        titles = "; ".join(leaflet.title for leaflet in leaflets)
        if language == "zh":
            return f"当前分店有效的活动有：{titles}。"
        if language == "ms":
            return f"Kempen aktif semasa untuk cawangan ini: {titles}."
        return f"Current active branch campaigns: {titles}."

    @staticmethod
    def _no_campaign_gallery_message(language: str) -> str:
        if language == "zh":
            return "目前没有当前分店有效的健康活动。"
        if language == "ms":
            return "Tiada kempen kesihatan aktif untuk cawangan ini sekarang."
        return "No active branch health campaigns are available right now."

    @staticmethod
    def _pharmacist_requested_message(language: str) -> str:
        if language == "zh":
            return "已请求药剂师协助。药剂师已经收到通知。"
        if language == "ms":
            return "Bantuan ahli farmasi telah diminta. Ahli farmasi telah dimaklumkan."
        return "Pharmacist assistance requested. A pharmacist has been notified."

    @staticmethod
    def _opening_promotion_message(language: str) -> str:
        if language == "zh":
            return "正在打开促销单张。"
        if language == "ms":
            return "Membuka risalah promosi sekarang."
        return "Opening the promotion leaflet now."

    @staticmethod
    def _opening_campaign_message(language: str) -> str:
        if language == "zh":
            return "正在打开健康活动单张。"
        if language == "ms":
            return "Membuka risalah kempen sekarang."
        return "Opening the campaign leaflet now."

    @staticmethod
    def _ui_safety_reason(reason_code: str | None) -> str:
        if reason_code in {"pregnancy_safety", "red_flag"}:
            return "pregnancy_or_red_flag"
        return reason_code or "safety_handoff"

    @staticmethod
    def _with_product_promotion_message(
        message: str,
        leaflet: Leaflet,
        language: str,
    ) -> str:
        if "active promotion" in message.casefold():
            return f"{message} Would you like me to enlarge the promotion leaflet?"
        if language == "zh":
            return f"{message} 目前有促销：{leaflet.title}。需要我放大促销单张给你看吗？"
        if language == "ms":
            return f"{message} Promosi aktif tersedia: {leaflet.title}. Mahu saya besarkan risalah promosi?"
        return (
            f"{message} Active promotion available: {leaflet.title}. "
            "Would you like me to enlarge the promotion leaflet?"
        )

    @staticmethod
    def _with_no_product_promotion_message(message: str, language: str) -> str:
        if "does not have a specific promotion" in message.casefold():
            return message
        if language == "zh":
            return f"{message} 这个产品目前没有指定促销。我可以为你显示其他有效促销或健康活动。"
        if language == "ms":
            return f"{message} Produk ini tiada promosi khusus sekarang. Saya boleh tunjukkan promosi aktif lain atau kempen kesihatan jika anda mahu."
        return (
            f"{message} This product does not have a specific promotion now. "
            "I can show you other active promotions or health campaigns if you are interested."
        )

    @staticmethod
    def _authoritative_value_message(
        product: Product,
        field_name: str,
        value: str | None,
        language: str = "en",
    ) -> str:
        zh_field_names = {
            "price": "价格",
            "stock": "库存",
            "shelf location": "货架位置",
        }
        ms_field_names = {
            "price": "harga",
            "stock": "stok",
            "shelf location": "lokasi rak",
        }
        zh_field_name = zh_field_names.get(field_name, field_name)
        ms_field_name = ms_field_names.get(field_name, field_name)
        source_name = (
            "VitaFlow ERP"
            if product.source.casefold() == "vitaflow_erp"
            else "VitaFlow mock"
        )
        if value is None:
            if language == "zh":
                return f"VitaFlow 暂时没有提供 {product.name} 的{zh_field_name}。"
            if language == "ms":
                return f"{ms_field_name} untuk {product.name} tidak tersedia daripada VitaFlow."
            return f"{product.name} {field_name} is unavailable from VitaFlow."
        if language == "zh":
            return f"{source_name} 记录显示，{product.name} 的{zh_field_name}是 {value}。"
        if language == "ms":
            return f"Data {source_name} menunjukkan {ms_field_name} untuk {product.name}: {value}."
        return f"{source_name} {field_name} for {product.name}: {value}."

    @staticmethod
    def _safety_message(reason_code: str | None, language: str = "en") -> str:
        if reason_code == "pregnancy_safety":
            if language == "zh":
                return "为了你的安全，怀孕期间使用补充品前请先咨询我们的药剂师。"
            if language == "ms":
                return "Untuk keselamatan anda, sila bercakap dengan ahli farmasi sebelum mengambil suplemen semasa kehamilan."
            return (
                "For your safety, please speak with our pharmacist before "
                "taking supplements during pregnancy."
            )
        if language == "zh":
            return "我不能评估或诊断这个情况。药剂师已经被请求协助你。"
        if language == "ms":
            return "Saya tidak boleh menilai atau mendiagnosis perkara ini. Ahli farmasi telah diminta untuk membantu anda."
        return (
            "I cannot assess or diagnose this. "
            "A pharmacist has been asked to assist you now."
        )


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
        preferred_language: str = "auto",
        current_product_id: str | None = None,
    ) -> AIResult:
        del preferred_language, current_product_id
        safe_text = " ".join(text.split())
        corrected_text = correct_transcript(safe_text).corrected_transcript
        safety = self._guardrails.evaluate_any(safe_text, corrected_text)
        if not safety.allowed:
            escalation = self._escalation_store.create(
                safety.reason_code or "safety_handoff",
                branch_id,
                session_id=session_id,
            )
            return AIResult(
                intent=Intent.RED_FLAG,
                message=MockAIBrain._safety_message(safety.reason_code),
                requires_pharmacist=True,
                escalation_id=escalation.id,
                safety_reason=safety.reason_code,
                ui_actions=(
                    UiAction(
                        type=UiActionType.REQUEST_PHARMACIST_ASSISTANCE,
                        reason=MockAIBrain._ui_safety_reason(safety.reason_code),
                    ),
                ),
            )
        raise RuntimeError(
            f"{self.provider_name} AI is a live-provider placeholder and is "
            "not implemented in the mock-first demo."
        )
