from datetime import UTC, datetime

import pytest

from services.poster_engine import PosterEngine
from services.leaflet_engine import LeafletEngine
from services.models import LeafletKind
from services.models import Product
from services.product_vision import MockProductVision
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.vitaflow_api import MockVitaFlowAPI
from services.voice_ai import ElevenLabsTTS, MockSTT, MockTTS


NOW = datetime(2026, 6, 21, 12, 0, tzinfo=UTC)


@pytest.fixture
def vitaflow() -> MockVitaFlowAPI:
    return MockVitaFlowAPI()


def test_known_product_returns_mock_vitaflow_facts(vitaflow: MockVitaFlowAPI) -> None:
    products = vitaflow.search_products("relief balm", "SG-001")

    assert len(products) == 1
    product = products[0]
    assert product.id == "MOCK-P001"
    assert product.price == 12.50
    assert product.stock == 18
    assert product.shelf_location == "A-03"
    assert product.source == "mock_vitaflow"


def test_unknown_product_is_not_invented(vitaflow: MockVitaFlowAPI) -> None:
    assert vitaflow.search_products("dragon miracle capsule", "SG-001") == []


def test_product_search_is_branch_scoped(vitaflow: MockVitaFlowAPI) -> None:
    assert vitaflow.search_products("relief balm", "SG-999") == []


def test_fuzzy_search_suggests_relief_balm_for_relief_bomb(
    vitaflow: MockVitaFlowAPI,
) -> None:
    candidates = vitaflow.search_product_candidates("Where is Relief Bomb?", "SG-001")

    assert candidates
    best = candidates[0]
    assert best.product.id == "MOCK-P001"
    assert best.product.name == "Relief Balm"
    assert best.product.price == 12.50
    assert best.product.stock == 18
    assert best.product.shelf_location == "A-03"
    assert best.product.source == "mock_vitaflow"
    assert 0.80 <= best.confidence < 0.95
    assert best.match_reason == "near_name_match"
    assert best.matched_text == "Relief Bomb"


def test_fuzzy_search_preserves_branch_scope(vitaflow: MockVitaFlowAPI) -> None:
    assert vitaflow.search_product_candidates("Where is Relief Bomb?", "SG-999") == []


def test_fuzzy_search_sorts_multiple_candidates_by_confidence() -> None:
    vitaflow = MockVitaFlowAPI(
        products=(
            Product(
                id="MOCK-RELIEF-CREAM",
                name="Relief Cream",
                aliases=("relief cream",),
                branch_id="SG-001",
                price=9.9,
                stock=6,
                shelf_location="A-04",
            ),
            Product(
                id="MOCK-RELIEF-BALM",
                name="Relief Balm",
                aliases=("relief balm", "balm"),
                branch_id="SG-001",
                price=12.5,
                stock=18,
                shelf_location="A-03",
            ),
        )
    )

    candidates = vitaflow.search_product_candidates("relief balm", "SG-001")

    assert [candidate.product.id for candidate in candidates[:2]] == [
        "MOCK-RELIEF-BALM",
        "MOCK-RELIEF-CREAM",
    ]
    assert candidates[0].confidence > candidates[1].confidence


def test_promotion_match_is_active_current_and_branch_aware() -> None:
    engine = PromotionEngine()

    matches = engine.match("MOCK-P001", "SG-001", now=NOW)

    assert [promotion.id for promotion in matches] == ["MOCK-PR001"]
    assert all(promotion.active for promotion in matches)
    assert all(promotion.branch_id == "SG-001" for promotion in matches)


def test_promotion_match_rejects_wrong_branch() -> None:
    engine = PromotionEngine()

    assert engine.match("MOCK-P001", "SG-002", now=NOW) == []


def test_idle_posters_use_only_eligible_promotions() -> None:
    engine = PosterEngine(PromotionEngine())

    posters = engine.idle("SG-001", now=NOW)

    assert [poster.id for poster in posters] == ["MOCK-POSTER001"]
    assert posters[0].promotion_id == "MOCK-PR001"
    assert posters[0].source == "mock_vitaflow"


def test_leaflets_are_active_current_and_branch_aware() -> None:
    engine = LeafletEngine()

    leaflets = engine.eligible_for_branch("SG-001", now=NOW)

    assert [leaflet.id for leaflet in leaflets] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
        "MOCK-LF-CAMP-001",
    ]
    assert all(leaflet.active for leaflet in leaflets)
    assert all(leaflet.branch_id == "SG-001" for leaflet in leaflets)


def test_product_leaflets_are_product_and_kind_scoped() -> None:
    engine = LeafletEngine()

    relief_promotions = engine.for_product(
        "MOCK-P001",
        "SG-001",
        kind=LeafletKind.PROMOTION,
        now=NOW,
    )
    hydration_campaigns = engine.for_product(
        "MOCK-P002",
        "SG-001",
        kind=LeafletKind.CAMPAIGN,
        now=NOW,
    )

    assert [leaflet.id for leaflet in relief_promotions] == ["MOCK-LF-PROMO-001"]
    assert [leaflet.id for leaflet in hydration_campaigns] == ["MOCK-LF-CAMP-001"]


def test_mock_stt_returns_deterministic_transcript() -> None:
    transcript = MockSTT().transcribe(b"mock audio", "audio/webm")

    assert transcript.transcript == "show me pain relief products"
    assert transcript.provider == "mock_stt"
    assert transcript.language == "english"
    assert transcript.clarification_needed is False


def test_mock_stt_rejects_empty_audio() -> None:
    with pytest.raises(ValueError, match="Audio payload is empty"):
        MockSTT().transcribe(b"", "audio/webm")


def test_mock_tts_returns_playable_wav_header() -> None:
    audio = MockTTS().synthesize("Please speak with our pharmacist.")

    assert audio[:4] == b"RIFF"
    assert audio[8:12] == b"WAVE"
    assert len(audio) > 44


def test_elevenlabs_tts_posts_audio_request_without_real_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    class FakeResponse:
        status_code = 200
        content = b"\xff\xfbmock-mp3"

        def raise_for_status(self) -> None:
            return None

    class FakeClient:
        def __init__(self, *, timeout: float) -> None:
            captured["timeout"] = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(
            self,
            url: str,
            *,
            params: dict[str, str],
            headers: dict[str, str],
            json: dict[str, str],
        ) -> FakeResponse:
            captured["url"] = url
            captured["params"] = params
            captured["headers"] = headers
            captured["json"] = json
            return FakeResponse()

    monkeypatch.setattr("services.voice_ai.httpx.Client", FakeClient)

    audio = ElevenLabsTTS(
        api_key="test-api-key",
        voice_id="test-voice-id",
    ).synthesize("VitaKiosk ElevenLabs voice test.")

    assert audio == b"\xff\xfbmock-mp3"
    assert captured["url"] == (
        "https://api.elevenlabs.io/v1/text-to-speech/test-voice-id"
    )
    assert captured["params"] == {"output_format": "mp3_44100_128"}
    assert captured["headers"] == {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": "test-api-key",
    }
    assert captured["json"] == {
        "text": "VitaKiosk ElevenLabs voice test.",
        "model_id": "eleven_multilingual_v2",
    }


def test_red_flag_is_escalated() -> None:
    decision = SafetyGuardrails().evaluate("I cannot breathe")

    assert decision.allowed is False
    assert decision.requires_pharmacist is True
    assert decision.reason_code == "red_flag"


def test_diagnosis_request_is_blocked_and_handed_off() -> None:
    decision = SafetyGuardrails().evaluate("Can you diagnose this rash?")

    assert decision.allowed is False
    assert decision.requires_pharmacist is True
    assert decision.reason_code == "diagnosis_request"


@pytest.mark.parametrize(
    "text",
    [
        "I am pregnant, can I take this supplement?",
        "pregnancy supplement question",
        "expecting mother asking about vitamins",
        "breast feeding and cough medicine",
        "ibu mengandung boleh makan supplement?",
        "Saya hamil boleh makan supplement ini?",
        "怀孕可以吃这个吗?",
        "孕妇可以吃这个吗?",
        "哺乳可以吃这个吗?",
    ],
)
def test_pregnancy_and_breastfeeding_terms_require_pharmacist_review(text: str) -> None:
    decision = SafetyGuardrails().evaluate(text)

    assert decision.allowed is False
    assert decision.requires_pharmacist is True
    assert decision.reason_code == "pregnancy_safety"


@pytest.mark.parametrize(
    "text",
    [
        "Can a child take this medicine?",
        "I have kidney disease, can I use this?",
        "liver disease and supplement question",
        "I take blood thinner medicine",
        "severe allergy after taking this",
        "chest pain now",
        "breathing difficulty",
        "I feel fainting",
        "high fever for three days",
        "severe symptoms after medicine",
    ],
)
def test_high_risk_condition_terms_escalate_to_pharmacist(text: str) -> None:
    decision = SafetyGuardrails().evaluate(text)

    assert decision.allowed is False
    assert decision.requires_pharmacist is True
    assert decision.reason_code == "red_flag"


def test_safe_product_request_is_allowed() -> None:
    decision = SafetyGuardrails().evaluate("Where is the relief balm?")

    assert decision.allowed is True
    assert decision.requires_pharmacist is False
    assert decision.reason_code is None


def test_product_vision_never_guesses() -> None:
    assert MockProductVision().identify(b"unrecognized image") is None
