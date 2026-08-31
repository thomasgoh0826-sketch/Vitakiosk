from __future__ import annotations

import math

import httpx

from services.models import TranscriptionResult
from services.transcript_correction import correct_transcript


_LANGUAGE_NAMES = {
    "eng": "english",
    "en": "english",
    "zho": "chinese",
    "cmn": "chinese",
    "zh": "chinese",
    "msa": "malay",
    "ms": "malay",
}


def _language_name(value: object) -> str:
    return _LANGUAGE_NAMES.get(str(value or "").strip().casefold(), "unknown")


def _word_confidence(value: object) -> float | None:
    if not isinstance(value, list):
        return None
    probabilities: list[float] = []
    for item in value:
        if not isinstance(item, dict) or item.get("type") != "word":
            continue
        try:
            log_probability = float(item.get("logprob"))
        except (TypeError, ValueError):
            continue
        probabilities.append(min(max(math.exp(log_probability), 0.0), 1.0))
    if not probabilities:
        return None
    return sum(probabilities) / len(probabilities)


class ElevenLabsSTT:
    """Explicit ElevenLabs Scribe v2 speech-to-text adapter."""

    provider_name = "elevenlabs"

    def __init__(
        self,
        *,
        api_key: str,
        model_id: str = "scribe_v2",
        low_confidence_threshold: float = 0.55,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._api_key = api_key
        self._model_id = model_id.strip() or "scribe_v2"
        self._threshold = low_confidence_threshold
        self._client = http_client or httpx.Client(timeout=30.0)

    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
        if not audio:
            raise ValueError("Audio payload is empty")
        safe_content_type = content_type.strip() or "application/octet-stream"
        try:
            response = self._client.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={"xi-api-key": self._api_key},
                files={"file": ("kiosk-turn.webm", audio, safe_content_type)},
                data={"model_id": self._model_id, "tag_audio_events": "false"},
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise RuntimeError("ElevenLabs STT request failed") from exc
        if not isinstance(payload, dict):
            raise RuntimeError("ElevenLabs STT request failed")

        transcript = str(payload.get("text") or "").strip()
        correction = correct_transcript(transcript)
        confidence = _word_confidence(payload.get("words"))
        clarification_needed = (
            not transcript
            or confidence is None
            or confidence < self._threshold
        )
        return TranscriptionResult(
            transcript=transcript,
            provider=self.provider_name,
            language=_language_name(payload.get("language_code")),
            confidence=confidence,
            clarification_needed=clarification_needed,
            corrected_transcript=correction.corrected_transcript or transcript,
            detected_terms=correction.detected_terms,
            possible_product_matches=correction.possible_product_matches,
        )
