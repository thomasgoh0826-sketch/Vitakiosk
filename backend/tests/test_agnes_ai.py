from __future__ import annotations

from dataclasses import replace
import json

import httpx
import pytest

from services.agnes_ai import AgnesAIBrain
from services.ai_brain import MockAIBrain
from services.leaflet_engine import LeafletEngine
from services.mock_data import MOCK_PRODUCTS
from services.models import Product, UiAction, UiActionType
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.vitaflow_api import MockVitaFlowAPI
from services.workflows import EscalationStore, PurchasingQueryStore


def product_with_category(category: str | None) -> Product:
    return replace(
        MOCK_PRODUCTS[0],
        name="Buffered C",
        aliases=("buffered c",),
        price=31.85,
        stock=1,
        kiosk_category=category,
        productSummary={
            "ingredient": {"en": "500mg Vitamin C"},
            "howToUse": {"en": "Take 1 tablet daily with a meal."},
            "bestFor": {"en": "VitaFlow-confirmed supplement use."},
            "size": {"en": "30 tablets"},
        },
    )


class FakeResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return self._payload


def valid_agnes_payload(
    *,
    answer: str,
    intent: str,
    language: str = "en",
) -> dict[str, object]:
    content = json.dumps(
        {
            "language": language,
            "intent": intent,
            "answer": answer,
            "emotion": "friendly",
            "ui_actions": [],
            "requires_pharmacist": False,
            "safety_notes": [],
        }
    )
    return {"choices": [{"message": {"content": content}}]}


class RecordingClient:
    def __init__(
        self,
        payload: dict[str, object] | None = None,
        error: Exception | None = None,
    ) -> None:
        self.payload = payload
        self.error = error
        self.calls = 0
        self.url = ""
        self.headers: dict[str, str] = {}
        self.json: dict[str, object] = {}

    def post(self, url: str, **kwargs: object) -> FakeResponse:
        self.calls += 1
        self.url = url
        self.headers = dict(kwargs.get("headers") or {})
        self.json = dict(kwargs.get("json") or {})
        if self.error is not None:
            raise self.error
        return FakeResponse(self.payload or {})


def make_agnes_brain(product: Product, client: RecordingClient) -> AgnesAIBrain:
    return AgnesAIBrain(
        vitaflow=MockVitaFlowAPI(products=(product,)),
        promotion_engine=PromotionEngine(),
        leaflet_engine=LeafletEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=PurchasingQueryStore(),
        escalation_store=EscalationStore(),
        api_key="test-key",
        base_url="https://apihub.agnes-ai.com",
        model="agnes-2.0-flash",
        timeout_seconds=20,
        http_client=client,
    )


def test_agnes_uses_vitaflow_facts_and_openai_compatible_endpoint() -> None:
    client = RecordingClient(
        valid_agnes_payload(
            answer="This supplement contains the VitaFlow-confirmed 500mg Vitamin C.",
            intent="product_counselling",
        )
    )
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond("What are the ingredients in Buffered C?", "SG-001")

    assert client.url == "https://apihub.agnes-ai.com/v1/chat/completions"
    assert client.headers == {"Authorization": "Bearer test-key"}
    assert client.json["model"] == "agnes-2.0-flash"
    assert client.json["max_tokens"] == 500
    prompt = client.json["messages"][1]["content"]
    assert "approved_answer" in prompt
    assert "response_schema" not in prompt
    assert "workflow_context" not in prompt
    assert result.product is not None
    assert result.product.name == "Buffered C"
    assert result.source == "agnes"


def test_agnes_accepts_one_fenced_strict_json_object() -> None:
    payload = valid_agnes_payload(
        answer="This supplement contains the VitaFlow-confirmed 500mg Vitamin C.",
        intent="product_counselling",
    )
    content = payload["choices"][0]["message"]["content"]
    payload["choices"][0]["message"]["content"] = f"```json\n{content}\n```"
    client = RecordingClient(payload)
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond("What are the ingredients in Buffered C?", "SG-001")

    assert result.source == "agnes"
    assert result.requires_pharmacist is False


@pytest.mark.parametrize("category", ["MEDICINE", "OTC", None, ""])
def test_non_supplement_counselling_escalates_before_agnes_request(
    category: str | None,
) -> None:
    client = RecordingClient()
    brain = make_agnes_brain(product_with_category(category), client)

    result = brain.respond("How should I use Buffered C?", "SG-001")

    assert result.requires_pharmacist is True
    assert result.ui_actions == (
        UiAction(type=UiActionType.REQUEST_PHARMACIST_ASSISTANCE),
    )
    assert client.calls == 0


def test_authoritative_vitaflow_otc_label_use_does_not_escalate() -> None:
    product = replace(
        product_with_category("NON-PRESCRIPTION MEDICINE"),
        source="vitaflow_erp",
    )
    approved_answer = (
        "VitaFlow-confirmed product information: "
        "Take 1 tablet daily with a meal."
    )
    client = RecordingClient(
        valid_agnes_payload(
            answer=approved_answer,
            intent="product_counselling",
        )
    )
    brain = make_agnes_brain(product, client)

    result = brain.respond("How should I use Buffered C?", "SG-001")

    assert result.requires_pharmacist is False
    assert result.message == approved_answer
    assert result.source == "agnes"
    assert UiActionType.OPEN_PRODUCT_SUMMARY in [
        action.type for action in result.ui_actions
    ]
    assert UiActionType.REQUEST_PHARMACIST_ASSISTANCE not in [
        action.type for action in result.ui_actions
    ]
    assert client.calls == 1


def test_supplement_may_explain_only_vitaflow_summary() -> None:
    client = RecordingClient(
        valid_agnes_payload(
            answer=(
                "VitaFlow lists 500mg Vitamin C and says to take 1 tablet daily "
                "with a meal."
            ),
            intent="product_counselling",
        )
    )
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond(
        "What are the ingredients and how should I use Buffered C?",
        "SG-001",
    )

    assert result.requires_pharmacist is False
    assert result.source == "agnes"
    assert "500mg Vitamin C" in result.message
    assert "1 tablet daily" in result.message
    assert all(
        action.type is not UiActionType.ASK_PHARMACIST_CONFIRMATION
        for action in result.ui_actions
    )


def test_exact_vitaflow_supplement_answer_is_not_blocked_by_caution_wording() -> None:
    product = replace(
        product_with_category("VITAMIN"),
        productSummary={
            "ingredient": {"en": "500mg Vitamin C"},
            "howToUse": {
                "en": (
                    "Adults: Take 1 tablet daily with a meal. "
                    "Not recommended for children under 12 years old."
                )
            },
            "bestFor": {"en": "VitaFlow-confirmed supplement use."},
            "size": {"en": "30 tablets"},
        },
    )
    base_brain = MockAIBrain(
        vitaflow=MockVitaFlowAPI(products=(product,)),
        promotion_engine=PromotionEngine(),
        leaflet_engine=LeafletEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=PurchasingQueryStore(),
        escalation_store=EscalationStore(),
    )
    approved = base_brain.respond(
        "What are the ingredients in Buffered C?",
        "SG-001",
    ).message
    client = RecordingClient(
        valid_agnes_payload(
            answer=approved,
            intent="product_counselling",
        )
    )
    brain = make_agnes_brain(product, client)

    result = brain.respond("What are the ingredients in Buffered C?", "SG-001")

    assert result.source == "agnes"
    assert result.message == approved
    assert result.requires_pharmacist is False


def test_agnes_cannot_change_vitaflow_price_or_stock() -> None:
    client = RecordingClient(
        valid_agnes_payload(
            answer="Buffered C costs RM1.00 and has 999 bottles.",
            intent="product_counselling",
        )
    )
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond("Tell me about Buffered C ingredients", "SG-001")

    assert result.source == "agnes_fallback_mock"
    assert result.product is not None
    assert result.product.price == 31.85
    assert result.product.stock == 1
    assert "RM1.00" not in result.message


def test_agnes_wrong_language_falls_back_to_chinese() -> None:
    client = RecordingClient(
        valid_agnes_payload(
            answer="This supplement contains Vitamin C.",
            language="en",
            intent="product_counselling",
        )
    )
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond(
        "Buffered C 有什么成分？",
        "SG-001",
        preferred_language="zh",
    )

    assert result.source == "agnes_fallback_mock"
    assert any("\u4e00" <= char <= "\u9fff" for char in result.message)


def test_agnes_timeout_keeps_deterministic_result() -> None:
    client = RecordingClient(error=httpx.TimeoutException("test timeout"))
    brain = make_agnes_brain(product_with_category("VITAMIN"), client)

    result = brain.respond("What are the ingredients in Buffered C?", "SG-001")

    assert result.source == "agnes_fallback_mock"
    assert result.product is not None
    assert result.product.name == "Buffered C"


def test_product_detail_does_not_offer_unrelated_promotions() -> None:
    product = product_with_category("VITAMIN")
    brain = MockAIBrain(
        vitaflow=MockVitaFlowAPI(products=(product,)),
        promotion_engine=PromotionEngine(),
        leaflet_engine=LeafletEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=PurchasingQueryStore(),
        escalation_store=EscalationStore(),
    )

    result = brain.respond(
        "Show Buffered C product details",
        "SG-001",
        session_id="s1",
    )

    assert result.product == product
    assert "other active promotions" not in result.message.casefold()
    follow_up = brain.respond("yes", "SG-001", session_id="s1")
    assert all(
        action.type is not UiActionType.SHOW_PROMOTION_GALLERY
        for action in follow_up.ui_actions
    )
