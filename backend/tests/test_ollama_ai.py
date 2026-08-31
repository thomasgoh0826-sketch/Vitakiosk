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
            "answer": "Relief Balm is RM12.50 according to VitaFlow mock data.",
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
    assert result.message == "Relief Balm is RM12.50 according to VitaFlow mock data."
    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert result.product.price == 12.5
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PRODUCT",
        "OPEN_PRODUCT_DETAIL",
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
                "answer": "Relief Balm is RM12.50 according to VitaFlow mock data.",
                "emotion": "friendly",
                "ui_actions": ["SHOW_PRODUCT", "OPEN_PRODUCT_DETAIL"],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond("what is the price of relief balm", branch_id="SG-001")

    assert result.source == "ollama"
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PRODUCT",
        "OPEN_PRODUCT_DETAIL",
    ]


def test_ollama_returns_general_conversation_without_waiting_for_model() -> None:
    brain, purchasing, _, transport = build_brain(
        transport=RecordingTransport(
            {
                "language": "en",
                "intent": "general_conversation",
                "answer": "I can help with product prices, stock, promotions, shelf location, and safe pharmacist handoff.",
                "emotion": "friendly",
                "ui_actions": [],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond("what can you help me with?", branch_id="SG-001")

    assert result.intent is Intent.GENERAL_CONVERSATION
    assert result.source == "ollama_fallback_mock"
    assert result.purchasing_query_id is None
    assert purchasing.items == ()
    assert result.ui_actions == ()
    assert transport.requests == []


def test_ollama_returns_promotion_ui_action_without_waiting_for_model() -> None:
    brain, purchasing, _, transport = build_brain()

    result = brain.respond("is there any promotion in this outlet?", branch_id="SG-001")

    assert result.intent is Intent.PROMOTION_CHECK
    assert result.source == "ollama_fallback_mock"
    assert result.purchasing_query_id is None
    assert purchasing.items == ()
    assert [action.type for action in result.ui_actions] == [
        "SHOW_PROMOTION_GALLERY",
        "OPEN_PROMOTION_MODAL",
    ]
    assert transport.requests == []


def test_ollama_cannot_invent_purchasing_query_for_general_conversation() -> None:
    brain, purchasing, _, _ = build_brain(
        transport=RecordingTransport(
            {
                "language": "en",
                "intent": "general_conversation",
                "answer": "Purchasing query PQ-0001 has been created.",
                "emotion": "friendly",
                "ui_actions": [],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond("who are you?", branch_id="SG-001")

    assert result.intent is Intent.GENERAL_CONVERSATION
    assert result.source == "ollama_fallback_mock"
    assert result.purchasing_query_id is None
    assert purchasing.items == ()
    assert "PQ-" not in result.message
    assert "purchasing query" not in result.message.casefold()


def test_ollama_cannot_steer_product_detail_prompt_to_promotion_leaflet() -> None:
    brain, purchasing, _, _ = build_brain(
        transport=RecordingTransport(
            {
                "language": "en",
                "intent": "product_search",
                "answer": "Would you like me to enlarge the promotion leaflet for Relief Balm?",
                "emotion": "friendly",
                "ui_actions": [],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond("tell me about relief balm", branch_id="SG-001")

    assert result.source == "ollama_fallback_mock"
    assert result.product is not None
    assert result.product.id == "MOCK-P001"
    assert any(action.type == "OPEN_PRODUCT_DETAIL" for action in result.ui_actions)
    assert all(action.type != "OPEN_PROMOTION_MODAL" for action in result.ui_actions)
    assert "promotion leaflet" not in result.message.casefold()
    assert "enlarge" not in result.message.casefold()
    assert purchasing.items == ()


def test_ollama_can_word_unknown_product_when_model_keeps_requested_intent() -> None:
    brain, purchasing, _, _ = build_brain(
        transport=RecordingTransport(
            {
                "language": "ms",
                "intent": "stock_check",
                "answer": (
                    "Produk Panadol tidak dijumpai dalam VitaFlow mock. "
                    "Pertanyaan pembelian PQ-0001 telah dibuat."
                ),
                "emotion": "neutral",
                "ui_actions": [],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond("Panadol ada stock?", branch_id="SG-001")

    assert result.intent is Intent.UNKNOWN_PRODUCT
    assert result.source == "ollama"
    assert result.product is None
    assert result.purchasing_query_id == purchasing.items[0].id
    assert "Panadol" in result.message
    assert "Pertanyaan pembelian" in result.message


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
            "answer": "Relief Balm is RM12.50.",
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
    assert "VitaFlow mock price for Relief Balm: RM12.50" in result.message
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
    assert "VitaFlow mock price for Relief Balm: RM12.50" in result.message
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
        ("What is the price of relief balm?", "english"),
        ("Panadol ada stock ??", "mixed"),
        ("Berapa harga relief balm?", "malay"),
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
    assert content["workflow_context"]["preferred_language"] == "auto"


def test_ollama_prompt_receives_manual_preferred_language_context() -> None:
    brain, _, _, transport = build_brain()

    brain.respond("What is the price of relief balm?", branch_id="SG-001", preferred_language="ms")

    user_message = transport.requests[0]["messages"][1]
    content = json.loads(user_message["content"])
    assert content["workflow_context"]["preferred_language"] == "ms"


def test_ollama_fallback_preserves_manual_malay_language_when_model_replies_english() -> None:
    brain, _, _, _ = build_brain(
        transport=RecordingTransport(
            {
                "language": "en",
                "intent": "general_conversation",
                "answer": "I can help with product prices, stock, promotions, and shelf location.",
                "emotion": "friendly",
                "ui_actions": [],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond(
        "what can you help me with?",
        branch_id="SG-001",
        preferred_language="ms",
    )

    assert result.intent is Intent.GENERAL_CONVERSATION
    assert result.source == "ollama_fallback_mock"
    assert "Saya boleh bantu" in result.message
    assert "I can help" not in result.message


def test_ollama_fallback_preserves_manual_chinese_language_when_model_replies_english() -> None:
    brain, _, _, _ = build_brain(
        transport=RecordingTransport(
            {
                "language": "en",
                "intent": "general_conversation",
                "answer": "I can help with product prices, stock, promotions, and shelf location.",
                "emotion": "friendly",
                "ui_actions": [],
                "requires_pharmacist": False,
                "safety_notes": [],
            }
        )
    )

    result = brain.respond(
        "what can you help me with?",
        branch_id="SG-001",
        preferred_language="zh",
    )

    assert result.intent is Intent.GENERAL_CONVERSATION
    assert result.source == "ollama_fallback_mock"
    assert "\u6211\u53ef\u4ee5\u5e2e\u4f60" in result.message
    assert "I can help" not in result.message
