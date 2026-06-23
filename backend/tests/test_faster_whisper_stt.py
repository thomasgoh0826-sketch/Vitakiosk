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
        ("do you have probio gut", "do you have ProbioGut", "ProbioGut"),
        ("ada ubat batok", "ada ubat batuk", "ubat batuk"),
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
