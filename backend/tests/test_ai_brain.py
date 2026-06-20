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

    def search_products(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        self.search_count += 1
        return super().search_products(query, branch_id)


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


def test_unknown_product_creates_one_purchasing_query() -> None:
    brain, purchasing, _ = build_brain()

    result = brain.respond("dragon miracle capsule", branch_id="SG-001")

    assert result.intent is Intent.UNKNOWN_PRODUCT
    assert result.purchasing_query_id == purchasing.items[0].id
    assert len(purchasing.items) == 1
    assert result.product is None
    assert "dragon miracle capsule" in purchasing.items[0].query


def test_price_response_uses_exact_vitaflow_product_fact() -> None:
    brain, _, _ = build_brain()
    expected = MockVitaFlowAPI().search_products("relief balm", "SG-001")[0]

    result = brain.respond("what is the price of relief balm", branch_id="SG-001")

    assert result.product == expected
    assert f"{expected.price:.2f}" in result.message
    assert result.source == "mock_vitaflow"


def test_product_counselling_is_non_diagnostic_and_hands_off() -> None:
    brain, _, _ = build_brain()

    result = brain.respond("how should I use relief balm", branch_id="SG-001")

    assert "pharmacist" in result.message.casefold()
    assert "you have" not in result.message.casefold()
    assert result.requires_pharmacist is False
