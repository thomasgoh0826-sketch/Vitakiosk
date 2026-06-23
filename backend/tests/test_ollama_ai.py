import json

import httpx
import pytest

from services.ai_brain import Intent
from services.leaflet_engine import LeafletEngine
from services.ollama_ai import OllamaAIBrain
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


class RecordingTransport:
    def __init__(self, payload: dict[str, object] | str | None = None) -> None:
        self.payload = payload or {
            "language": "en",
            "intent": "price_check",
            "answer": "Relief Balm is $12.50 according to VitaFlow mock data.",
            "emotion": "friendly",
            "ui_actions": [{"type": "SHOW_PRODUCT", "productId": "MOCK-P001"}],
            "requires_pharmacist": False,
            "safety_notes": [],
        }
        self.requests: list[dict[str, object]] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(json.loads(request.content.decode("utf-8")))
        content = self.payload if isinstance(self.payload, str) else json.dumps(self.payload)
        return httpx.Response(
            200,
            json={"message": {"content": content}},
            request=request,
        )


def build_brain(
    *,
    transport: RecordingTransport | None = None,
    vitaflow: MockVitaFlowAPI | None = None,
) -> tuple[OllamaAIBrain, PurchasingQueryStore, EscalationStore, RecordingTransport]:
    recording = transport or RecordingTransport()
    purchasing = PurchasingQueryStore()
    escalations = EscalationStore()
    brain = OllamaAIBrain(
        vitaflow=vitaflow or MockVitaFlowAPI(),
        promotion_engine=PromotionEngine(),
        leaflet_engine=LeafletEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=purchasing,
        escalation_store=escalations,
        base_url="http://ollama.test",
        model="qwen2.5:7b",
        timeout_seconds=20,
        http_client=httpx.Client(transport=httpx.MockTransport(recording.handler)),
    )
    return brain, purchasing, escalations, recording


def test_ollama_uses_structured_json_answer_without_overriding_vitaflow_facts() -> None:
    brain, _, _, transport = build_brain()

    result = brain.respond("what is the price of relief balm", branch_id="SG-001")

    assert result.intent is Intent.PRICE_CHECK
    assert result.message == "Relief Balm is $12.50 according to VitaFlow mock data."
    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert result.product.price == 12.5
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PRODUCT",
        "SHOW_PROMOTION_LEAFLET",
    ]
    assert result.source == "ollama"
    assert len(transport.requests) == 1
    request = transport.requests[0]
    assert request["model"] == "qwen2.5:7b"
    assert request["format"] == "json"
    assert request["options"]["temperature"] == 0
    prompt = json.dumps(request["messages"], ensure_ascii=False)
    assert "corrected_transcript" in prompt
    assert "VitaFlow/mock product facts" in prompt
    assert "allowed_ui_actions" in prompt


def test_ollama_accepts_whitelisted_string_ui_actions_from_real_model_style() -> None:
    brain, _, _, _ = build_brain(
        transport=RecordingTransport(
            {
                "language": "en",
                "intent": "price_check",
                "answer": "Relief Balm is $12.50 according to VitaFlow mock data.",
                "emotion": "friendly",
                "ui_actions": ["SHOW_PRODUCT", "SHOW_PROMOTION_LEAFLET"],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond("what is the price of relief balm", branch_id="SG-001")

    assert result.source == "ollama"
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PRODUCT",
        "SHOW_PROMOTION_LEAFLET",
    ]


def test_ollama_can_word_unknown_product_when_model_keeps_requested_intent() -> None:
    brain, purchasing, _, _ = build_brain(
        transport=RecordingTransport(
            {
                "language": "zh",
                "intent": "stock_check",
                "answer": (
                    "We did not find Panadol in VitaFlow mock data. "
                    "Purchasing query PQ-0001 has been created."
                ),
                "emotion": "neutral",
                "ui_actions": [],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond("Panadol ada stock 吗?", branch_id="SG-001")

    assert result.intent is Intent.UNKNOWN_PRODUCT
    assert result.source == "ollama"
    assert result.product is None
    assert result.purchasing_query_id == purchasing.items[0].id
    assert "Panadol" in result.message
    assert "Purchasing query" in result.message


def test_ollama_offline_falls_back_to_mock_workflow_without_crashing() -> None:
    def fail(_request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("offline")

    purchasing = PurchasingQueryStore()
    brain = OllamaAIBrain(
        vitaflow=MockVitaFlowAPI(),
        promotion_engine=PromotionEngine(),
        leaflet_engine=LeafletEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=purchasing,
        escalation_store=EscalationStore(),
        base_url="http://127.0.0.1:11434",
        model="qwen2.5:7b",
        timeout_seconds=1,
        http_client=httpx.Client(transport=httpx.MockTransport(fail)),
    )

    result = brain.respond("where is relief balm", branch_id="SG-001")

    assert result.intent is Intent.SHELF_LOCATION
    assert result.product is not None
    assert result.purchasing_query_id is None
    assert "shelf" in result.message.casefold()
    assert result.source == "ollama_fallback_mock"


@pytest.mark.parametrize(
    "payload",
    [
        "not json",
        {"intent": "price_check", "answer": "", "ui_actions": []},
        {
            "language": "en",
            "intent": "price_check",
            "answer": "Relief Balm is $12.50.",
            "emotion": "friendly",
            "ui_actions": [{"type": "CLICK_ADMIN_PANEL"}],
            "requires_pharmacist": False,
            "safety_notes": [],
        },
    ],
)
def test_invalid_ollama_json_or_ui_actions_fall_back_to_mock(payload: object) -> None:
    brain, _, _, _ = build_brain(transport=RecordingTransport(payload))

    result = brain.respond("what is the price of relief balm", branch_id="SG-001")

    assert result.intent is Intent.PRICE_CHECK
    assert "VitaFlow mock price for Relief Balm: $12.50" in result.message
    assert result.source == "ollama_fallback_mock"


def test_unsafe_or_invented_ollama_output_is_not_used() -> None:
    brain, _, _, _ = build_brain(
        transport=RecordingTransport(
            {
                "language": "en",
                "intent": "price_check",
                "answer": (
                    "You have an infection. Relief Balm costs $99.99, has "
                    "500 units, and is on Shelf Z-99."
                ),
                "emotion": "friendly",
                "ui_actions": [{"type": "SHOW_PRODUCT", "productId": "MOCK-P001"}],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond("what is the price of relief balm", branch_id="SG-001")

    assert "99.99" not in result.message
    assert "500 units" not in result.message
    assert "Shelf Z-99" not in result.message
    assert "VitaFlow mock price for Relief Balm: $12.50" in result.message
    assert result.source == "ollama_fallback_mock"


def test_pregnancy_red_flag_escalates_before_ollama_or_product_flow() -> None:
    vitaflow = CountingVitaFlow()
    brain, purchasing, escalations, transport = build_brain(vitaflow=vitaflow)

    result = brain.respond(
        "I am pregnant, can I take this supplement?",
        branch_id="SG-001",
    )

    assert result.intent is Intent.RED_FLAG
    assert result.safety_reason == "pregnancy_safety"
    assert result.requires_pharmacist is True
    assert result.escalation_id == escalations.items[0].id
    assert result.purchasing_query_id is None
    assert purchasing.items == ()
    assert vitaflow.search_count == 0
    assert transport.requests == []


@pytest.mark.parametrize(
    ("text", "expected_language"),
    [
        ("Where is relief balm?", "english"),
        ("这个 probiotic 有 promotion 吗?", "mixed"),
        ("Ada ubat batuk?", "malay"),
    ],
)
def test_ollama_prompt_receives_detected_language_context(
    text: str,
    expected_language: str,
) -> None:
    brain, _, _, transport = build_brain()

    brain.respond(text, branch_id="SG-001")

    user_message = transport.requests[0]["messages"][1]
    content = json.loads(user_message["content"])
    assert content["workflow_context"]["detected_language"] == expected_language
