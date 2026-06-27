import pytest

from services.ai_brain import Intent, MockAIBrain
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


def build_brain(
    *,
    vitaflow: MockVitaFlowAPI | None = None,
) -> tuple[MockAIBrain, PurchasingQueryStore, EscalationStore]:
    purchasing = PurchasingQueryStore()
    escalations = EscalationStore()
    brain = MockAIBrain(
        vitaflow=vitaflow or MockVitaFlowAPI(),
        promotion_engine=PromotionEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=purchasing,
        escalation_store=escalations,
    )
    return brain, purchasing, escalations


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
    assert "pregnancy" in result.message.casefold()
    assert "pharmacist" in result.message.casefold()
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
    assert [leaflet.id for leaflet in result.leaflets] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
        "MOCK-LF-CAMP-001",
    ]
    assert "active promotion" in result.message.casefold()
    assert "enlarge" in result.message.casefold()


def test_confirmation_opens_pending_promotion_modal() -> None:
    brain, _, _ = build_brain()

    brain.respond("show me relief balm", branch_id="SG-001", session_id="session-open")
    result = brain.respond("yes", branch_id="SG-001", session_id="session-open")

    assert [action.type for action in result.ui_actions] == [
        "OPEN_PROMOTION_MODAL",
    ]
    assert result.ui_actions[0].promotionId == "MOCK-LF-PROMO-001"
    assert "opening" in result.message.casefold()


def test_product_without_specific_promotion_offers_galleries_without_guessing() -> None:
    brain, _, _ = build_brain()

    result = brain.respond("show me hydration salts", branch_id="SG-001")

    assert result.product is not None
    assert result.product.id == "MOCK-P002"
    assert result.promotions == ()
    assert [action.type for action in result.ui_actions] == ["SHOW_PRODUCT"]
    assert "does not have a specific promotion" in result.message.casefold()
    assert {leaflet.kind for leaflet in result.leaflets} == {"promotion", "campaign"}


def test_general_promotion_query_returns_only_active_branch_leaflets() -> None:
    brain, _, _ = build_brain()

    result = brain.respond("any promotion?", branch_id="SG-001")

    assert result.intent is Intent.PROMOTION_CHECK
    assert [action.type for action in result.ui_actions] == ["SHOW_PROMOTION_GALLERY"]
    assert [leaflet.id for leaflet in result.leaflets] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
    ]
    assert all(leaflet.active for leaflet in result.leaflets)
    assert all(leaflet.branch_id == "SG-001" for leaflet in result.leaflets)


def test_general_campaign_query_returns_campaign_gallery() -> None:
    brain, _, _ = build_brain()

    result = brain.respond("what health campaign do you have?", branch_id="SG-001")

    assert result.intent is Intent.CAMPAIGN_CHECK
    assert [action.type for action in result.ui_actions] == ["SHOW_CAMPAIGN_GALLERY"]
    assert [leaflet.id for leaflet in result.leaflets] == ["MOCK-LF-CAMP-001"]


def test_pharmacist_confirmation_creates_ticket_after_asking() -> None:
    brain, _, escalations = build_brain()

    first = brain.respond(
        "how should I use relief balm",
        branch_id="SG-001",
        session_id="session-pharmacist",
    )
    second = brain.respond(
        "yes",
        branch_id="SG-001",
        session_id="session-pharmacist",
    )

    assert [action.type for action in first.ui_actions] == [
        "SHOW_PRODUCT",
        "SHOW_PROMOTION_LEAFLET",
        "ASK_PHARMACIST_CONFIRMATION",
    ]
    assert second.requires_pharmacist is True
    assert second.escalation_id == escalations.items[0].id
    assert [action.type for action in second.ui_actions] == [
        "REQUEST_PHARMACIST_ASSISTANCE"
    ]


def test_product_counselling_is_non_diagnostic_and_hands_off() -> None:
    brain, _, _ = build_brain()

    result = brain.respond("how should I use relief balm", branch_id="SG-001")

    assert "pharmacist" in result.message.casefold()
    assert "you have" not in result.message.casefold()
    assert result.requires_pharmacist is False


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
