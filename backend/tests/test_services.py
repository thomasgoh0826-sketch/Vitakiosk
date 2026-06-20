from datetime import UTC, datetime

import pytest

from services.poster_engine import PosterEngine
from services.product_vision import MockProductVision
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.vitaflow_api import MockVitaFlowAPI
from services.voice_ai import MockSTT, MockTTS


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


def test_mock_stt_returns_deterministic_transcript() -> None:
    transcript = MockSTT().transcribe(b"mock audio", "audio/webm")

    assert transcript == "show me pain relief products"


def test_mock_stt_rejects_empty_audio() -> None:
    with pytest.raises(ValueError, match="Audio payload is empty"):
        MockSTT().transcribe(b"", "audio/webm")


def test_mock_tts_returns_playable_wav_header() -> None:
    audio = MockTTS().synthesize("Please speak with our pharmacist.")

    assert audio[:4] == b"RIFF"
    assert audio[8:12] == b"WAVE"
    assert len(audio) > 44


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


def test_safe_product_request_is_allowed() -> None:
    decision = SafetyGuardrails().evaluate("Where is the relief balm?")

    assert decision.allowed is True
    assert decision.requires_pharmacist is False
    assert decision.reason_code is None


def test_product_vision_never_guesses() -> None:
    assert MockProductVision().identify(b"unrecognized image") is None
