import pytest

from services.ai_brain import Intent, MockAIBrain
from services.faster_whisper_stt import FasterWhisperRawResult, FasterWhisperSTT
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.transcript_correction import correct_transcript
from services.vitaflow_api import MockVitaFlowAPI
from services.workflows import EscalationStore, PurchasingQueryStore


MIXED_PHRASE = "\u8fd9\u4e2a probiotic \u6709 promotion \u5417?"


def transcriber(
    text: str,
    *,
    language: str | None = None,
    confidence: float | None = 0.92,
):
    def _fake(_audio: bytes, _content_type: str) -> FasterWhisperRawResult:
        return FasterWhisperRawResult(
            text=text,
            language=language,
            confidence=confidence,
        )

    return _fake


@pytest.mark.parametrize(
    ("text", "expected_language"),
    [
        ("Where is vitamin C?", "english"),
        ("\u8fd9\u4e2a\u591a\u5c11\u94b1?", "chinese"),
        ("Ada ubat batuk?", "malay"),
        (MIXED_PHRASE, "mixed"),
        ("Panadol ada stock \u5417?", "mixed"),
    ],
)
def test_faster_whisper_detects_multilingual_pharmacy_speech(
    text: str,
    expected_language: str,
) -> None:
    stt = FasterWhisperSTT(model_runner=transcriber(text))

    result = stt.transcribe(b"mock audio", "audio/webm")

    assert result.transcript == text
    assert result.language == expected_language
    assert result.provider == "faster_whisper"
    assert result.clarification_needed is False


@pytest.mark.parametrize(
    ("raw_text", "expected_text", "expected_term"),
    [
        ("where is pana doll", "where is Panadol", "Panadol"),
        ("Where is Relief Bomb?", "Where is Relief Balm?", "Relief Balm"),
        ("do you have probio gut", "do you have ProbioGut", "ProbioGut"),
        ("ada ubat batok", "ada ubat batuk", "ubat batuk"),
        ("Aida you bat batuck", "ada ubat batuk", "ubat batuk"),
        ("any cough medicine?", "any cough medicine?", "cough medicine"),
    ],
)
def test_product_dictionary_correction_uses_mock_pharmacy_terms(
    raw_text: str,
    expected_text: str,
    expected_term: str,
) -> None:
    correction = correct_transcript(raw_text)

    assert correction.corrected_transcript == expected_text
    assert expected_term in correction.detected_terms
    assert correction.possible_product_matches[0]["name"] == expected_term


def test_faster_whisper_returns_correction_metadata() -> None:
    stt = FasterWhisperSTT(model_runner=transcriber("pana doll ada stock \u5417?"))

    result = stt.transcribe(b"mock audio", "audio/webm")

    assert result.transcript == "pana doll ada stock \u5417?"
    assert result.corrected_transcript == "Panadol ada stock \u5417?"
    assert result.detected_terms == ("Panadol",)
    assert result.possible_product_matches[0]["name"] == "Panadol"
    assert result.confidence == 0.92
    assert result.language == "mixed"


def test_faster_whisper_corrects_relief_bomb_without_losing_raw_transcript() -> None:
    stt = FasterWhisperSTT(model_runner=transcriber("Where is Relief Bomb?"))

    result = stt.transcribe(b"mock audio", "audio/webm")

    assert result.transcript == "Where is Relief Bomb?"
    assert result.corrected_transcript == "Where is Relief Balm?"
    assert result.detected_terms == ("Relief Balm",)
    assert result.possible_product_matches[0]["id"] == "MOCK-P001"


def test_faster_whisper_low_confidence_requests_clarification_without_guessing() -> None:
    stt = FasterWhisperSTT(
        model_runner=transcriber("pana doll", confidence=0.41),
        low_confidence_threshold=0.55,
    )

    result = stt.transcribe(b"mock audio", "audio/webm")

    assert result.clarification_needed is True
    assert result.corrected_transcript == "Panadol"
    assert result.possible_product_matches[0]["name"] == "Panadol"


def test_faster_whisper_empty_or_too_short_transcript_requests_clarification() -> None:
    stt = FasterWhisperSTT(model_runner=transcriber("uh", confidence=0.95))

    result = stt.transcribe(b"mock audio", "audio/webm")

    assert result.transcript == ""
    assert result.corrected_transcript == ""
    assert result.language == "unknown"
    assert result.clarification_needed is True


def test_red_flag_transcript_still_escalates_through_existing_safety_rules() -> None:
    stt = FasterWhisperSTT(model_runner=transcriber("I cannot breathe", confidence=0.96))
    transcript = stt.transcribe(b"mock audio", "audio/webm")
    escalations = EscalationStore()
    brain = MockAIBrain(
        vitaflow=MockVitaFlowAPI(),
        promotion_engine=PromotionEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=PurchasingQueryStore(),
        escalation_store=escalations,
    )

    result = brain.respond(transcript.corrected_transcript, branch_id="SG-001")

    assert result.intent is Intent.RED_FLAG
    assert result.requires_pharmacist is True
    assert result.escalation_id == escalations.items[0].id


@pytest.mark.parametrize(
    "transcribed_text",
    [
        "I am pregnant, can I take this supplement?",
        "Can pregnant women take this?",
        "Saya hamil boleh makan supplement ini?",
        "孕妇可以吃这个吗?",
    ],
)
def test_pregnancy_transcript_escalates_without_purchasing_query(
    transcribed_text: str,
) -> None:
    stt = FasterWhisperSTT(model_runner=transcriber(transcribed_text, confidence=0.96))
    transcript = stt.transcribe(b"mock audio", "audio/webm")
    purchasing = PurchasingQueryStore()
    escalations = EscalationStore()
    brain = MockAIBrain(
        vitaflow=MockVitaFlowAPI(),
        promotion_engine=PromotionEngine(),
        guardrails=SafetyGuardrails(),
        purchasing_store=purchasing,
        escalation_store=escalations,
    )

    result = brain.respond(transcript.corrected_transcript, branch_id="SG-001")

    assert result.intent is Intent.RED_FLAG
    assert result.requires_pharmacist is True
    assert result.safety_reason == "pregnancy_safety"
    assert result.purchasing_query_id is None
    assert len(purchasing.items) == 0
    assert result.escalation_id == escalations.items[0].id
