from __future__ import annotations

import re
from typing import Any

import httpx

from services.models import TranscriptionResult


OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions"
DEFAULT_WHISPER_MODEL = "whisper-1"
TRANSCRIPTION_PROMPT = (
    "Transcribe pharmacy kiosk customer speech. Preserve medicine, product, "
    "brand, supplement, and mixed-language words exactly when possible."
)

_CJK_PATTERN = re.compile(r"[\u3400-\u9fff]")
_LATIN_WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]*")
_MEANINGFUL_PATTERN = re.compile(r"[\w\u3400-\u9fff]", re.UNICODE)

_UNCLEAR_PHRASES = {
    "",
    ".",
    "..",
    "...",
    "…",
    "um",
    "uh",
    "erm",
    "hmm",
    "mhm",
    "[inaudible]",
    "(inaudible)",
}

_MALAY_WORDS = {
    "ada",
    "ubat",
    "batuk",
    "sakit",
    "boleh",
    "berapa",
    "promosi",
    "demam",
    "selesema",
    "makan",
    "minum",
    "untuk",
    "saya",
    "mana",
    "dekat",
    "kahak",
}

_ENGLISH_WORDS = {
    "where",
    "is",
    "are",
    "the",
    "this",
    "that",
    "price",
    "stock",
    "promotion",
    "campaign",
    "product",
    "medicine",
    "supplement",
    "can",
    "take",
    "pregnant",
    "pregnancy",
}

_PROVIDER_LANGUAGE_ALIASES = {
    "en": "english",
    "eng": "english",
    "english": "english",
    "zh": "chinese",
    "zho": "chinese",
    "chi": "chinese",
    "cn": "chinese",
    "chinese": "chinese",
    "mandarin": "chinese",
    "ms": "malay",
    "msa": "malay",
    "may": "malay",
    "malay": "malay",
    "bahasa melayu": "malay",
}


def _normalise_provider_language(language: object | None) -> str | None:
    if not isinstance(language, str):
        return None
    return _PROVIDER_LANGUAGE_ALIASES.get(language.strip().casefold())


def transcript_needs_clarification(transcript: str) -> bool:
    normalized = transcript.strip().casefold()
    if normalized in _UNCLEAR_PHRASES:
        return True
    return _MEANINGFUL_PATTERN.search(normalized) is None


def detect_transcript_language(
    transcript: str,
    provider_language: object | None = None,
) -> str:
    """Infer customer speech language for subtitle metadata.

    STT remains conversion-only: this does not diagnose, recommend, or enrich
    product facts. It only labels transcript text so downstream UI can present
    mixed English/Chinese/Malay speech more clearly.
    """

    if transcript_needs_clarification(transcript):
        return "unknown"

    provider_inference = _normalise_provider_language(provider_language)
    lower_words = {
        word.casefold()
        for word in _LATIN_WORD_PATTERN.findall(transcript)
    }
    has_chinese = _CJK_PATTERN.search(transcript) is not None
    has_latin_words = bool(lower_words)
    has_malay = bool(lower_words & _MALAY_WORDS)
    has_english = bool(lower_words & _ENGLISH_WORDS)

    if has_chinese and has_latin_words:
        return "mixed"
    if has_malay and has_english:
        return "mixed"
    if has_chinese:
        return "chinese"
    if has_malay:
        return "malay"
    if has_english:
        return "english"
    if provider_inference:
        return provider_inference
    if has_latin_words:
        return "english"
    return "unknown"


class OpenAIWhisperSTT:
    """Explicitly enabled OpenAI Whisper/STT adapter.

    The adapter is selected only through STT_PROVIDER=openai_whisper and never
    called by tests without a mocked httpx transport.
    """

    provider_name = "openai_whisper"

    def __init__(
        self,
        *,
        api_key: str,
        http_client: httpx.Client | None = None,
        model: str = DEFAULT_WHISPER_MODEL,
        endpoint: str = OPENAI_TRANSCRIPTIONS_URL,
    ) -> None:
        if not api_key.strip():
            raise RuntimeError("OPENAI_API_KEY is required when STT_PROVIDER=openai_whisper")
        self._api_key = api_key.strip()
        self._client = http_client or httpx.Client(timeout=30)
        self._model = model
        self._endpoint = endpoint

    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
        if not audio:
            raise ValueError("Audio payload is empty")

        response = self._client.post(
            self._endpoint,
            headers={"Authorization": f"Bearer {self._api_key}"},
            data={
                "model": self._model,
                "response_format": "verbose_json",
                "prompt": TRANSCRIPTION_PROMPT,
            },
            files={
                "file": (
                    "voice.webm",
                    audio,
                    content_type or "application/octet-stream",
                )
            },
        )

        if response.status_code >= 400:
            raise RuntimeError("OpenAI STT request failed")

        payload = response.json()
        transcript = self._extract_text(payload)
        if transcript_needs_clarification(transcript):
            return TranscriptionResult(
                transcript="",
                provider=self.provider_name,
                language="unknown",
                clarification_needed=True,
            )

        return TranscriptionResult(
            transcript=transcript,
            provider=self.provider_name,
            language=detect_transcript_language(
                transcript,
                provider_language=payload.get("language")
                if isinstance(payload, dict)
                else None,
            ),
            clarification_needed=False,
        )

    @staticmethod
    def _extract_text(payload: Any) -> str:
        if isinstance(payload, dict):
            value = payload.get("text")
            return value.strip() if isinstance(value, str) else ""
        return ""
