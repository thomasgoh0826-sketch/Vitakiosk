from dataclasses import replace

import pytest

from services.ai_brain import Intent, MockAIBrain
from services.models import Product, UiActionType
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.vitaflow_api import MockVitaFlowAPI
from services.workflows import EscalationStore, PurchasingQueryStore


class CountingVitaFlow(MockVitaFlowAPI):
    def __init__(self) -> None:
        super().__init__()
        self.search_count = 0
        self.candidate_search_count = 0

    def search_products(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        self.search_count += 1
        return super().search_products(query, branch_id)

    def search_product_candidates(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        self.candidate_search_count += 1
        return super().search_product_candidates(query, branch_id)


class StrictPhraseVitaFlow(MockVitaFlowAPI):
    """Mimic a live ERP endpoint that expects a product phrase, not a full sentence."""

    def __init__(self) -> None:
        product = Product(
            id="5042",
            name="BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
            aliases=("Blackmores Buffered C", "Buffered C"),
            branch_id="JK",
            price=31.85,
            stock=1,
            shelf_location="Shelf Island C R3 B1",
            source="vitaflow_erp",
        )
        super().__init__((product,))
        self.queries: list[str] = []

    def search_products(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        self.queries.append(query)
        if branch_id == "JK" and query.casefold() in {
            "blackmores buffered c",
            "buffered c",
            "vitamin c",
        }:
            return list(self._products)
        return []

    def search_product_candidates(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        del query, branch_id
        return []


class StrictDynamicProductVitaFlow(MockVitaFlowAPI):
    """Mimic a live ERP product added after the speech lexicon was built."""

    def __init__(self) -> None:
        product = Product(
            id="17097",
            name="AXE BRAND MEDICATED OIL 10ML",
            aliases=("Axe Brand Medicated Oil 10ml",),
            branch_id="JK",
            price=None,
            stock=0,
            shelf_location="Counter 1",
            source="vitaflow_erp",
            kiosk_category="NON-PRESCRIPTION MEDICINE",
            productSummary={
                "howToUse": {
                    "en": (
                        "Apply a few drops to the affected area and massage gently. "
                        "For external use only. The official recommended daily usage "
                        "is 3–4 times when symptom relief is required."
                    ),
                },
                "bestFor": {
                    "en": (
                        "Temporary relief of headaches, colds and blocked nose, "
                        "muscular and joint pains, stomach discomfort and wind, "
                        "giddiness or travel sickness, and itching from insect bites."
                    ),
                },
                "safetyNote": {
                    "en": (
                        "External use only. Do not use in infants under 2 years. "
                        "Consult a doctor or pharmacist before use during pregnancy "
                        "or breastfeeding, or if taking warfarin."
                    ),
                },
            },
        )
        super().__init__((product,))
        self.queries: list[str] = []

    def search_products(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        self.queries.append(query)
        if branch_id == "JK" and query.casefold() == "axe brand medicated oil 10ml":
            return list(self._products)
        return []

    def search_product_candidates(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        del query, branch_id
        return []


def build_brain(
    *,
    vitaflow: MockVitaFlowAPI | None = None,
    promotion_engine: PromotionEngine | None = None,
) -> tuple[MockAIBrain, PurchasingQueryStore, EscalationStore]:
    purchasing = PurchasingQueryStore()
    escalations = EscalationStore()
    brain = MockAIBrain(
        vitaflow=vitaflow or MockVitaFlowAPI(),
        promotion_engine=promotion_engine or PromotionEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=purchasing,
        escalation_store=escalations,
    )
    return brain, purchasing, escalations


def build_vitaflow_self_service_brain() -> MockAIBrain:
    products = (
        Product(
            id="314",
            name="FISHERMAN S FRIEND (SF) LEMON 25GM",
            aliases=("Fisherman's Friend", "Fisherman"),
            branch_id="JK",
            price=4.9,
            stock=8,
            shelf_location="Counter 2",
            source="vitaflow_erp",
            kiosk_category="Lozenges",
            productSummary={
                "ingredient": {"en": "Menthol 4.6mg per lozenge."},
                "howToUse": {"en": "Take as needed."},
                "bestFor": {"en": "Temporarily soothes minor throat irritation."},
                "size": {"en": "21 Lozenges"},
                "description": {"en": "Sugar-free mentholated lemon lozenges."},
            },
        ),
        Product(
            id="5042",
            name="BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
            aliases=("Blackmores Buffered C", "Buffered C"),
            branch_id="JK",
            price=31.85,
            stock=1,
            shelf_location="Shelf Island C R3 B1",
            source="vitaflow_erp",
            kiosk_category="VITAMIN",
            productSummary={
                "ingredient": {"en": "500mg of Vitamin C."},
                "howToUse": {"en": "Adults: Take 1 tablet daily with a meal."},
                "bestFor": {"en": "Supports white blood cell function and collagen production."},
                "size": {"en": "30 TABLETS"},
                "description": {"en": "A daily low-acid vitamin C supplement."},
            },
        ),
    )
    brain, _, _ = build_brain(vitaflow=MockVitaFlowAPI(products))
    return brain


def test_product_found_copy_distinguishes_live_erp_from_mock_data() -> None:
    product = MockVitaFlowAPI().search_products("relief balm", "SG-001")[0]
    live_product = replace(product, source="vitaflow_erp")

    assert MockAIBrain._product_found_message(product, "en") == (
        "I found Relief Balm in VitaFlow mock data."
    )
    assert MockAIBrain._product_found_message(live_product, "en") == (
        "I found Relief Balm in VitaFlow ERP."
    )


@pytest.mark.parametrize(
    ("text", "expected_intent"),
    [
        ("show me relief balm", Intent.PRODUCT_SEARCH),
        ("how should I use relief balm", Intent.PRODUCT_COUNSELLING),
        ("what is the price of relief balm", Intent.PRICE_CHECK),
        ("is relief balm in stock", Intent.STOCK_CHECK),
        ("is relief balm on promotion", Intent.PROMOTION_CHECK),
        ("where is the relief balm shelf", Intent.SHELF_LOCATION),
        ("dragon miracle capsule", Intent.UNKNOWN_PRODUCT),
        ("I cannot breathe", Intent.RED_FLAG),
    ],
)
def test_required_intents_are_classified(text: str, expected_intent: Intent) -> None:
    brain, _, _ = build_brain()

    result = brain.respond(text, branch_id="SG-001")

    assert result.intent is expected_intent


def test_red_flag_short_circuits_product_lookup() -> None:
    vitaflow = CountingVitaFlow()
    brain, _, escalations = build_brain(vitaflow=vitaflow)

    result = brain.respond("I cannot breathe", branch_id="SG-001")

    assert result.intent is Intent.RED_FLAG
    assert result.requires_pharmacist is True
    assert result.escalation_id == escalations.items[0].id
    assert vitaflow.search_count == 0


def test_diagnosis_request_is_handed_to_pharmacist_without_lookup() -> None:
    vitaflow = CountingVitaFlow()
    brain, _, escalations = build_brain(vitaflow=vitaflow)

    result = brain.respond("Can you diagnose this rash?", branch_id="SG-001")

    assert result.intent is Intent.RED_FLAG
    assert result.requires_pharmacist is True
    assert result.safety_reason == "diagnosis_request"
    assert result.escalation_id == escalations.items[0].id
    assert vitaflow.search_count == 0


@pytest.mark.parametrize(
    "text",
    [
        "I am pregnant, can I take this supplement?",
        "Can pregnant women take this?",
        "Saya hamil boleh makan supplement ini?",
        "孕妇可以吃这个吗?",
    ],
)
def test_pregnancy_safety_questions_escalate_before_product_flow(text: str) -> None:
    vitaflow = CountingVitaFlow()
    brain, purchasing, escalations = build_brain(vitaflow=vitaflow)

    result = brain.respond(text, branch_id="SG-001")

    assert result.intent is Intent.RED_FLAG
    assert result.requires_pharmacist is True
    assert result.safety_reason == "pregnancy_safety"
    assert result.escalation_id == escalations.items[0].id
    assert result.purchasing_query_id is None
    assert result.product is None
    assert result.promotions == ()
    assert result.leaflets == ()
    assert len(purchasing.items) == 0
    assert vitaflow.search_count == 0
    assert any(
        term in result.message.casefold()
        for term in ("pregnancy", "kehamilan", "怀孕")
    )
    assert any(
        term in result.message.casefold()
        for term in ("pharmacist", "ahli farmasi", "药剂师")
    )
    assert [action.type for action in result.ui_actions] == [
        "REQUEST_PHARMACIST_ASSISTANCE"
    ]


def test_unknown_product_creates_one_purchasing_query() -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond("dragon miracle capsule", branch_id="SG-001")

    assert result.intent is Intent.UNKNOWN_PRODUCT
    assert result.purchasing_query_id == purchasing.items[0].id
    assert len(purchasing.items) == 1
    assert result.product is None
    assert "dragon miracle capsule" in purchasing.items[0].query


@pytest.mark.parametrize(
    "text",
    [
        "can you sing",
        "what is your name",
        "tell me something",
        "this is nice",
        "I need help",
        "what can you do for me",
        "can you tell me what you can do",
        "what is the weather today",
        "tell me a joke",
        "where is the toilet",
        "can you help me find something",
        "can you recommend something",
        "what do you know",
        "are you an AI",
        "why are you here",
        "can I talk to you",
        "\u4f60\u4f1a\u804a\u5929\u5417\uff1f",
    ],
)
def test_non_product_sentences_do_not_create_purchasing_query(text: str) -> None:
    vitaflow = CountingVitaFlow()
    brain, purchasing, _ = build_brain(vitaflow=vitaflow)

    result = brain.respond(text, branch_id="SG-001")

    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0
    assert result.product is None
    assert result.intent is Intent.GENERAL_CONVERSATION
    assert vitaflow.search_count == 0
    assert vitaflow.candidate_search_count == 0
    assert "PQ-" not in result.message


@pytest.mark.parametrize(
    "text",
    [
        "do you sell moonberry tablets",
        "dragon miracle capsule",
        "where can I find NovaCalm syrup",
        "ABC12345",
    ],
)
def test_product_like_unknowns_create_purchasing_query(text: str) -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond(text, branch_id="SG-001")

    assert result.intent is Intent.UNKNOWN_PRODUCT
    assert result.purchasing_query_id == purchasing.items[0].id
    assert len(purchasing.items) == 1
    assert result.product is None


def test_greeting_does_not_create_purchasing_query() -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond("hi", branch_id="SG-001")

    assert result.intent is Intent.GREETING
    assert "VitaKiosk" in result.message
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0
    assert result.product is None


@pytest.mark.parametrize(
    "text",
    [
        "how are you today?",
        "what can you help me with?",
        "thanks for your help",
    ],
)
def test_normal_conversation_does_not_create_purchasing_query(text: str) -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond(text, branch_id="SG-001")

    assert result.intent is Intent.GENERAL_CONVERSATION
    assert result.requires_pharmacist is False
    assert result.product is None
    assert result.purchasing_query_id is None
    assert result.ui_actions == ()
    assert len(purchasing.items) == 0


def test_normal_chinese_conversation_uses_chinese_without_purchasing_query() -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond("\u4f60\u4f1a\u4ec0\u4e48\uff1f", branch_id="SG-001")

    assert result.intent is Intent.GENERAL_CONVERSATION
    assert "\u4ea7\u54c1" in result.message
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0


@pytest.mark.parametrize(
    "text",
    [
        "\u4f60\u662f\u8c01\uff1f",
        "\u4f60\u53eb\u4ec0\u4e48\uff1f",
        "\u4f60\u662f ai \u5417\uff1f",
    ],
)
def test_chinese_identity_questions_do_not_create_purchasing_query(text: str) -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond(text, branch_id="SG-001")

    assert result.intent is Intent.GENERAL_CONVERSATION
    assert result.product is None
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0


def test_chinese_text_gets_chinese_fallback_response_without_inventing_facts() -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond("Relief Balm 价格多少？", branch_id="SG-001")

    assert result.intent is Intent.PRICE_CHECK
    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert result.product.price == 12.5
    assert "VitaFlow mock" in result.message
    assert "价格" in result.message
    assert "RM12.50" in result.message
    assert "price for" not in result.message
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0


def test_chinese_greeting_gets_chinese_response_without_purchasing_query() -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond("你好", branch_id="SG-001")

    assert result.intent is Intent.GREETING
    assert "你好" in result.message
    assert "VitaKiosk" in result.message
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0


def test_corrected_relief_bomb_returns_authoritative_product_without_purchasing_query() -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond("Where is Relief Bomb?", branch_id="SG-001")

    assert result.intent is Intent.SHELF_LOCATION
    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert result.product.name == "Relief Balm"
    assert result.product.shelf_location == "A-03"
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0
    assert result.product_candidates == ()
    assert result.source == "mock_vitaflow"


def test_near_product_name_returns_candidate_without_purchasing_query() -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond("Where is Relief Barm?", branch_id="SG-001")

    assert result.intent is Intent.PRODUCT_SEARCH
    assert result.product is None
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0
    assert result.product_candidates
    best = result.product_candidates[0]
    assert best.product.id == "MOCK-P001"
    assert best.product.name == "Relief Balm"
    assert best.product.price == 12.50
    assert best.product.stock == 18
    assert best.product.shelf_location == "A-03"
    assert best.match_reason == "near_name_match"
    assert "Do you mean Relief Balm?" in result.message
    assert [leaflet.id for leaflet in result.leaflets] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
        "MOCK-LF-CAMP-001",
    ]


def test_safety_still_short_circuits_before_fuzzy_candidate_search() -> None:
    vitaflow = CountingVitaFlow()
    brain, purchasing, escalations = build_brain(vitaflow=vitaflow)

    result = brain.respond(
        "I am pregnant. Can I use Relief Bomb?",
        branch_id="SG-001",
    )

    assert result.intent is Intent.RED_FLAG
    assert result.requires_pharmacist is True
    assert result.escalation_id == escalations.items[0].id
    assert result.product is None
    assert result.purchasing_query_id is None
    assert result.product_candidates == ()
    assert len(purchasing.items) == 0
    assert vitaflow.search_count == 0
    assert vitaflow.candidate_search_count == 0


def test_price_response_uses_exact_vitaflow_product_fact() -> None:
    brain, _, _ = build_brain()
    expected = MockVitaFlowAPI().search_products("relief balm", "SG-001")[0]

    result = brain.respond("what is the price of relief balm", branch_id="SG-001")

    assert result.product == expected
    assert f"{expected.price:.2f}" in result.message
    assert result.source == "mock_vitaflow"
    assert [action.type for action in result.ui_actions][:2] == [
        "SHOW_PRODUCT",
        "OPEN_PRODUCT_DETAIL",
    ]
    assert result.ui_actions[1].productId == expected.id


def test_corrected_live_stt_sentence_retries_with_detected_product_phrase() -> None:
    vitaflow = StrictPhraseVitaFlow()
    brain, purchasing, _ = build_brain(vitaflow=vitaflow)

    result = brain.respond("Where is Blackmoor's buffered sea?", branch_id="JK")

    assert result.intent is Intent.SHELF_LOCATION
    assert result.product is not None
    assert result.product.id == "5042"
    assert result.product.shelf_location == "Shelf Island C R3 B1"
    assert "Blackmores Buffered C" in vitaflow.queries
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0
    assert [action.type for action in result.ui_actions][:2] == [
        "SHOW_PRODUCT",
        "OPEN_SHELF_MAP",
    ]


@pytest.mark.parametrize("prompt", ["帮我找维他命C", "我要维生素C"])
def test_chinese_vitamin_c_term_retries_authoritative_category_lookup(prompt: str) -> None:
    vitaflow = StrictPhraseVitaFlow()
    brain, purchasing, _ = build_brain(vitaflow=vitaflow)

    result = brain.respond(prompt, branch_id="JK")

    assert result.intent is Intent.PRODUCT_SEARCH
    assert result.product is not None
    assert result.product.id == "5042"
    assert "vitamin C" in vitaflow.queries
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0


@pytest.mark.parametrize(
    "prompt",
    [
        "what is the price and details of relief balm",
        "tell me about relief balm",
        "how much is relief balm",
    ],
)
def test_product_detail_prompts_return_open_product_detail_action(prompt: str) -> None:
    brain, _, _ = build_brain()

    result = brain.respond(prompt, branch_id="SG-001")

    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert any(
        action.type == "OPEN_PRODUCT_DETAIL" and action.productId == "MOCK-P001"
        for action in result.ui_actions
    )
    assert all(
        action.type not in {"SHOW_PROMOTION_LEAFLET", "OPEN_PROMOTION_MODAL"}
        for action in result.ui_actions
    )
    assert "promotion leaflet" not in result.message.casefold()
    assert "enlarge" not in result.message.casefold()


def test_dynamic_erp_product_detail_prompt_extracts_product_phrase() -> None:
    vitaflow = StrictDynamicProductVitaFlow()
    brain, purchasing, _ = build_brain(vitaflow=vitaflow)

    result = brain.respond(
        "tell me about axe brand medicated oil 10ml",
        branch_id="JK",
    )

    assert result.product is not None
    assert result.product.id == "17097"
    assert "axe brand medicated oil 10ml" in [query.casefold() for query in vitaflow.queries]
    assert any(action.type == "OPEN_PRODUCT_DETAIL" for action in result.ui_actions)
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0


def test_dynamic_erp_product_location_prompt_extracts_product_phrase() -> None:
    vitaflow = StrictDynamicProductVitaFlow()
    brain, _, _ = build_brain(vitaflow=vitaflow)

    result = brain.respond(
        "where is axe brand medicated oil 10ml",
        branch_id="JK",
    )

    assert result.product is not None
    assert result.product.id == "17097"
    assert result.intent is Intent.SHELF_LOCATION
    assert any(action.type == "OPEN_SHELF_MAP" for action in result.ui_actions)
    assert "VitaFlow ERP" in result.message
    assert "mock" not in result.message.casefold()


def test_dynamic_erp_otc_label_use_prompt_uses_authoritative_summary_without_handoff() -> None:
    vitaflow = StrictDynamicProductVitaFlow()
    brain, _, escalations = build_brain(vitaflow=vitaflow)

    result = brain.respond(
        "how do I use axe brand medicated oil 10ml",
        branch_id="JK",
    )

    assert result.product is not None
    assert result.product.id == "17097"
    assert result.intent is Intent.PRODUCT_COUNSELLING
    assert result.requires_pharmacist is False
    assert result.escalation_id is None
    assert "Apply a few drops to the affected area" in result.message
    assert UiActionType.OPEN_PRODUCT_SUMMARY in [
        action.type for action in result.ui_actions
    ]
    assert UiActionType.REQUEST_PHARMACIST_ASSISTANCE not in [
        action.type for action in result.ui_actions
    ]
    assert len(escalations.items) == 0


@pytest.mark.parametrize(
    "prompt",
    [
        "how to use relief balm",
        "what are the ingredients of relief balm",
        "relief balm ingredient",
    ],
)
def test_medicine_use_and_ingredient_prompts_handoff_before_ai_advice(prompt: str) -> None:
    brain, _, _ = build_brain()

    result = brain.respond(prompt, branch_id="SG-001")

    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert result.requires_pharmacist is True
    assert [action.type for action in result.ui_actions] == [
        "REQUEST_PHARMACIST_ASSISTANCE",
    ]
    assert "promotion leaflet" not in result.message.casefold()
    assert "enlarge" not in result.message.casefold()


@pytest.mark.parametrize(
    ("prompt", "expected_product_id", "expected_fact", "excluded_fact"),
    [
        (
            "fisherman 功效",
            "314",
            "Temporarily soothes minor throat irritation.",
            "Take as needed.",
        ),
        (
            "fisherman 怎么吃",
            "314",
            "Take as needed.",
            "Temporarily soothes minor throat irritation.",
        ),
        (
            "buffered c 功效",
            "5042",
            "Supports white blood cell function and collagen production.",
            "Adults: Take 1 tablet daily with a meal.",
        ),
        (
            "how to take buffered c",
            "5042",
            "Adults: Take 1 tablet daily with a meal.",
            "Supports white blood cell function and collagen production.",
        ),
    ],
)
def test_confirmed_non_medicine_products_answer_only_requested_vitaflow_summary_field(
    prompt: str,
    expected_product_id: str,
    expected_fact: str,
    excluded_fact: str,
) -> None:
    brain = build_vitaflow_self_service_brain()

    result = brain.respond(prompt, branch_id="JK")

    assert result.intent is Intent.PRODUCT_COUNSELLING
    assert result.product is not None
    assert result.product.id == expected_product_id
    assert result.requires_pharmacist is False
    assert expected_fact in result.message
    assert excluded_fact not in result.message
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PRODUCT",
        "OPEN_PRODUCT_SUMMARY",
    ]
    assert result.ui_actions[1].productId == expected_product_id


def test_non_medicine_counselling_followup_uses_last_session_product() -> None:
    brain = build_vitaflow_self_service_brain()

    first = brain.respond(
        "show me fisherman",
        branch_id="JK",
        session_id="session-fisherman-summary",
    )
    followup = brain.respond(
        "有什么功效",
        branch_id="JK",
        session_id="session-fisherman-summary",
    )

    assert first.product is not None
    assert first.product.id == "314"
    assert followup.intent is Intent.PRODUCT_COUNSELLING
    assert followup.product is not None
    assert followup.product.id == "314"
    assert followup.requires_pharmacist is False
    assert "Temporarily soothes minor throat irritation." in followup.message
    assert [action.type for action in followup.ui_actions] == [
        "SHOW_PRODUCT",
        "OPEN_PRODUCT_SUMMARY",
    ]


def test_explicit_promotion_prompt_opens_promotion_modal_immediately() -> None:
    brain, _, _ = build_brain()

    result = brain.respond(
        "show me the promotion for relief balm",
        branch_id="SG-001",
        session_id="session-direct-promo",
    )

    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PRODUCT",
        "OPEN_PROMOTION_MODAL",
    ]
    assert result.ui_actions[1].productId == "MOCK-P001"
    assert result.ui_actions[1].promotionId == "MOCK-LF-PROMO-001"
    assert "would you like" not in result.message.casefold()
    assert "enlarge" not in result.message.casefold()


def test_product_query_returns_controlled_leaflet_action() -> None:
    brain, _, _ = build_brain()

    result = brain.respond(
        "show me relief balm",
        branch_id="SG-001",
        session_id="session-promo",
    )

    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PRODUCT",
        "SHOW_PROMOTION_LEAFLET",
    ]
    assert result.ui_actions[0].productId == "MOCK-P001"
    assert result.ui_actions[1].promotionId == "MOCK-LF-PROMO-001"
    assert [leaflet.id for leaflet in result.leaflets] == ["MOCK-LF-PROMO-001"]
    assert "enlarge" not in result.message.casefold()
    assert "would you like" not in result.message.casefold()


def test_plain_product_query_does_not_set_pending_promotion_modal() -> None:
    brain, _, _ = build_brain()

    brain.respond("show me relief balm", branch_id="SG-001", session_id="session-open")
    result = brain.respond("yes", branch_id="SG-001", session_id="session-open")

    assert all(action.type != "OPEN_PROMOTION_MODAL" for action in result.ui_actions)
    assert result.purchasing_query_id is None
    assert "opening" not in result.message.casefold()


@pytest.mark.parametrize("prompt", ["where is relief balm?", "direction to relief balm", "route to relief balm"])
def test_shelf_location_prompt_opens_shelf_map_action(prompt: str) -> None:
    brain, _, _ = build_brain()

    result = brain.respond(prompt, branch_id="SG-001")

    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PRODUCT",
        "OPEN_SHELF_MAP",
    ]
    assert result.ui_actions[1].productId == "MOCK-P001"
    assert result.ui_actions[1].shelf == "A-03"


def test_product_without_specific_promotion_does_not_offer_unrelated_galleries() -> None:
    brain, _, _ = build_brain()

    result = brain.respond("show me hydration salts", branch_id="SG-001")

    assert result.product is not None
    assert result.product.id == "MOCK-P002"
    assert result.promotions == ()
    assert [action.type for action in result.ui_actions] == ["SHOW_PRODUCT"]
    assert "promotion" not in result.message.casefold()
    assert [leaflet.id for leaflet in result.leaflets] == ["MOCK-LF-CAMP-001"]


def test_affirmative_after_plain_product_detail_does_not_open_branch_leaflets() -> None:
    brain, _, _ = build_brain()

    first = brain.respond(
        "show me hydration salts",
        branch_id="SG-001",
        session_id="session-other-leaflets",
    )
    second = brain.respond(
        "yes interested",
        branch_id="SG-001",
        session_id="session-other-leaflets",
    )

    assert first.product is not None
    assert first.product.id == "MOCK-P002"
    assert second.product is None
    assert all(
        action.type is not UiActionType.SHOW_PROMOTION_GALLERY
        for action in second.ui_actions
    )


@pytest.mark.parametrize(
    "prompt",
    [
        "any promotion?",
        "can you show me any promotion",
        "can you help me find any promotion",
        "could you help find available promotions",
        "help me search promotions",
        "show all active branch promotion",
        "show all active branch promot",
    ],
)
def test_general_promotion_query_returns_active_branch_leaflet_deck(prompt: str) -> None:
    brain, _, _ = build_brain()

    result = brain.respond(prompt, branch_id="SG-001")

    assert result.intent is Intent.PROMOTION_CHECK
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PROMOTION_GALLERY",
        "OPEN_PROMOTION_MODAL",
    ]
    assert result.ui_actions[1].promotionId == "MOCK-LF-PROMO-001"
    assert [leaflet.id for leaflet in result.leaflets] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
        "MOCK-LF-CAMP-001",
    ]
    assert all(leaflet.active for leaflet in result.leaflets)
    assert all(leaflet.branch_id == "SG-001" for leaflet in result.leaflets)
    assert "Relief Balm Demo Leaflet" in result.message
    assert "Supplement Savings Demo" in result.message
    assert "Hydration Health Campaign" not in result.message


def test_specific_leaflet_promotion_query_opens_matching_leaflet_not_first_gallery_item() -> None:
    brain, _, _ = build_brain()

    result = brain.respond("does supplement have promotion?", branch_id="SG-001")

    assert result.intent is Intent.PROMOTION_CHECK
    assert result.product is None
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PROMOTION_LEAFLET",
        "OPEN_PROMOTION_MODAL",
    ]
    assert result.ui_actions[0].promotionId == "MOCK-LF-PROMO-002"
    assert result.ui_actions[1].promotionId == "MOCK-LF-PROMO-002"
    assert [leaflet.id for leaflet in result.leaflets] == ["MOCK-LF-PROMO-002"]
    assert "matching promotion leaflet" in result.message.casefold()


def test_help_find_wording_preserves_a_real_specific_promotion_subject() -> None:
    brain, _, _ = build_brain()

    result = brain.respond(
        "can you help me find the supplement promotion?",
        branch_id="SG-001",
    )

    assert [leaflet.id for leaflet in result.leaflets] == ["MOCK-LF-PROMO-002"]
    assert result.ui_actions[1].promotionId == "MOCK-LF-PROMO-002"


def test_product_leaflet_is_not_announced_as_no_promotion_when_legacy_offer_is_empty() -> None:
    brain, _, _ = build_brain(promotion_engine=PromotionEngine(()))

    result = brain.respond(
        "can you help me find the relief balm promotion?",
        branch_id="SG-001",
    )

    assert result.intent is Intent.PROMOTION_CHECK
    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert [leaflet.id for leaflet in result.leaflets] == ["MOCK-LF-PROMO-001"]
    assert result.ui_actions[-1].type is UiActionType.OPEN_PROMOTION_MODAL
    assert result.ui_actions[-1].promotionId == "MOCK-LF-PROMO-001"
    assert "Relief Balm Demo Leaflet" in result.message
    assert "does not have a specific promotion" not in result.message


def test_unknown_specific_leaflet_query_does_not_open_unrelated_gallery() -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond("does moonberry brand have promotion?", branch_id="SG-001")

    assert result.intent is Intent.PROMOTION_CHECK
    assert result.product is None
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0
    assert result.leaflets == ()
    assert result.ui_actions == ()
    assert "could not find a matching active promotion leaflet" in result.message.casefold()


def test_general_campaign_query_returns_campaign_gallery() -> None:
    brain, _, _ = build_brain()

    result = brain.respond("what health campaign do you have?", branch_id="SG-001")

    assert result.intent is Intent.CAMPAIGN_CHECK
    assert [action.type for action in result.ui_actions] == [
        "SHOW_CAMPAIGN_GALLERY",
        "OPEN_CAMPAIGN_MODAL",
    ]
    assert result.ui_actions[1].campaignId == "MOCK-LF-CAMP-001"
    assert [leaflet.id for leaflet in result.leaflets] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
        "MOCK-LF-CAMP-001",
    ]
    assert "Hydration Health Campaign" in result.message
    assert "Relief Balm Demo Leaflet" not in result.message


@pytest.mark.parametrize(
    ("query", "expected_intent", "gallery_action", "expected_title", "excluded_title"),
    [
        (
            "caimpaign",
            Intent.CAMPAIGN_CHECK,
            UiActionType.SHOW_CAMPAIGN_GALLERY,
            "Hydration Health Campaign",
            "Relief Balm Demo Leaflet",
        ),
        (
            "有什么promotion",
            Intent.PROMOTION_CHECK,
            UiActionType.SHOW_PROMOTION_GALLERY,
            "Relief Balm Demo Leaflet",
            "Hydration Health Campaign",
        ),
        (
            "有什么campaign",
            Intent.CAMPAIGN_CHECK,
            UiActionType.SHOW_CAMPAIGN_GALLERY,
            "Hydration Health Campaign",
            "Relief Balm Demo Leaflet",
        ),
    ],
)
def test_general_leaflet_queries_handle_mixed_chinese_and_campaign_typo(
    query: str,
    expected_intent: Intent,
    gallery_action: UiActionType,
    expected_title: str,
    excluded_title: str,
) -> None:
    brain, _, _ = build_brain()

    result = brain.respond(query, branch_id="SG-001")

    assert result.intent is expected_intent
    assert result.ui_actions[0].type is gallery_action
    assert expected_title in result.message
    assert excluded_title not in result.message


def test_medicine_counselling_creates_ticket_without_extra_confirmation() -> None:
    brain, _, escalations = build_brain()

    first = brain.respond(
        "how should I use relief balm",
        branch_id="SG-001",
        session_id="session-pharmacist",
    )
    assert [action.type for action in first.ui_actions] == [
        "REQUEST_PHARMACIST_ASSISTANCE"
    ]
    assert first.requires_pharmacist is True
    assert first.escalation_id == escalations.items[0].id


def test_product_counselling_is_non_diagnostic_and_hands_off() -> None:
    brain, _, _ = build_brain()

    result = brain.respond("how should I use relief balm", branch_id="SG-001")

    assert "pharmacist" in result.message.casefold()
    assert "you have" not in result.message.casefold()
    assert result.requires_pharmacist is True


def test_red_flag_returns_only_pharmacist_action() -> None:
    vitaflow = CountingVitaFlow()
    brain, _, _ = build_brain(vitaflow=vitaflow)

    result = brain.respond("I cannot breathe, any promotion?", branch_id="SG-001")

    assert result.intent is Intent.RED_FLAG
    assert result.requires_pharmacist is True
    assert result.leaflets == ()
    assert [action.type for action in result.ui_actions] == [
        "REQUEST_PHARMACIST_ASSISTANCE"
    ]
    assert vitaflow.search_count == 0


def test_pregnancy_safety_suppresses_auto_open_actions() -> None:
    vitaflow = CountingVitaFlow()
    brain, _, _ = build_brain(vitaflow=vitaflow)

    result = brain.respond(
        "I am pregnant. Can I use Relief Balm?",
        branch_id="SG-001",
    )

    assert result.intent is Intent.RED_FLAG
    assert result.requires_pharmacist is True
    assert [action.type for action in result.ui_actions] == [
        "REQUEST_PHARMACIST_ASSISTANCE"
    ]
    assert result.ui_actions[0].reason == "pregnancy_or_red_flag"
    assert not any(
        action.type in {"OPEN_PRODUCT_DETAIL", "OPEN_PROMOTION_MODAL", "OPEN_SHELF_MAP"}
        for action in result.ui_actions
    )
    assert vitaflow.search_count == 0


def test_product_identification_prompt_opens_visible_scan_without_lookup_or_query() -> None:
    vitaflow = CountingVitaFlow()
    brain, purchasing, _ = build_brain(vitaflow=vitaflow)

    result = brain.respond("What is this medicine?", branch_id="SG-001")

    assert result.intent is Intent.PRODUCT_SEARCH
    assert "scan box" in result.message
    assert [action.type for action in result.ui_actions] == ["OPEN_PRODUCT_SCAN"]
    assert result.purchasing_query_id is None
    assert purchasing.items == ()
    assert vitaflow.search_count == 0
    assert vitaflow.candidate_search_count == 0


def test_confirmed_scan_product_context_answers_followup_without_reopening_scanner() -> None:
    brain = build_vitaflow_self_service_brain()

    result = brain.respond(
        "What is this product for, and how should I take it?",
        branch_id="JK",
        session_id="session-scan-followup",
        current_product_id="5042",
    )

    assert result.intent is Intent.PRODUCT_COUNSELLING
    assert result.product is not None
    assert result.product.id == "5042"
    assert result.requires_pharmacist is False
    assert "Adults: Take 1 tablet daily with a meal." in result.message
    assert "OPEN_PRODUCT_SCAN" not in [action.type for action in result.ui_actions]
    assert UiActionType.OPEN_PRODUCT_SUMMARY in [
        action.type for action in result.ui_actions
    ]


def test_confirmed_otc_scan_followup_answers_without_handoff_or_reopening_scanner() -> None:
    brain, _, _ = build_brain(vitaflow=StrictDynamicProductVitaFlow())

    result = brain.respond(
        "What is this product for, and how should I take it?",
        branch_id="JK",
        session_id="session-medicine-scan-followup",
        current_product_id="17097",
    )

    assert result.product is not None
    assert result.product.id == "17097"
    assert result.requires_pharmacist is False
    assert "Apply a few drops to the affected area" in result.message
    assert "Temporary relief of headaches" in result.message
    assert UiActionType.OPEN_PRODUCT_SUMMARY in [
        action.type for action in result.ui_actions
    ]
    assert UiActionType.OPEN_PRODUCT_SCAN not in [
        action.type for action in result.ui_actions
    ]
    assert UiActionType.REQUEST_PHARMACIST_ASSISTANCE not in [
        action.type for action in result.ui_actions
    ]
