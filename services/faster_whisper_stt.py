from __future__ import annotations

import tempfile
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from services.models import TranscriptionResult
from services.openai_stt import detect_transcript_language, transcript_needs_clarification
from services.transcript_correction import correct_transcript


@dataclass(frozen=True)
class FasterWhisperRawResult:
    text: str
    language: str | None = None
    confidence: float | None = None


ModelRunner = Callable[[bytes, str], FasterWhisperRawResult]


class FasterWhisperSTT:
    """Explicit local faster-whisper STT adapter.

    The actual faster-whisper import and model load are lazy so CI can select
    and type-check the adapter without downloading models or requiring a GPU.
    """

    provider_name = "faster_whisper"

    def __init__(
        self,
        *,
        model_size: str = "small",
        device: str = "cpu",
        compute_type: str = "int8",
        model_dir: str = ".models/whisper",
        language: str = "auto",
        low_confidence_threshold: float = 0.55,
        model_runner: ModelRunner | None = None,
    ) -> None:
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._model_dir = model_dir
        self._language = language
        self._low_confidence_threshold = low_confidence_threshold
        self._model_runner = model_runner or self._run_faster_whisper
        self._model: Any | None = None

    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
        if not audio:
            raise ValueError("Audio payload is empty")

        raw = self._model_runner(audio, content_type)
        raw_text = " ".join(raw.text.split())
        if transcript_needs_clarification(raw_text):
            return TranscriptionResult(
                transcript="",
                provider=self.provider_name,
                language="unknown",
                confidence=raw.confidence,
                clarification_needed=True,
                corrected_transcript="",
            )

        correction = correct_transcript(raw_text)
        language = detect_transcript_language(
            correction.corrected_transcript,
            provider_language=raw.language,
        )
        low_confidence = (
            raw.confidence is not None
            and raw.confidence < self._low_confidence_threshold
        )

        return TranscriptionResult(
            transcript=raw_text,
            provider=self.provider_name,
            language=language,
            confidence=raw.confidence,
            clarification_needed=low_confidence,
            corrected_transcript=correction.corrected_transcript,
            detected_terms=correction.detected_terms,
            possible_product_matches=correction.possible_product_matches,
        )

    def _run_faster_whisper(
        self,
        audio: bytes,
        content_type: str,
    ) -> FasterWhisperRawResult:
        model = self._get_model()
        audio_path = self._write_temp_audio(audio, content_type)
        try:
            segments, info = model.transcribe(
                str(audio_path),
                language=None if self._language == "auto" else self._language,
                vad_filter=True,
            )
            text = " ".join(
                segment.text.strip()
                for segment in segments
                if getattr(segment, "text", "").strip()
            )
            return FasterWhisperRawResult(
                text=text,
                language=getattr(info, "language", None),
                confidence=getattr(info, "language_probability", None),
            )
        finally:
            try:
                audio_path.unlink(missing_ok=True)
            except OSError:
                pass

    def _get_model(self) -> Any:
        if self._model is None:
            from faster_whisper import WhisperModel

            model_dir = self._model_dir.strip()
            Path(model_dir).mkdir(parents=True, exist_ok=True)
            self._model = WhisperModel(
                self._model_size,
                device=self._device,
                compute_type=self._compute_type,
                download_root=model_dir,
            )
        return self._model

    @staticmethod
    def _write_temp_audio(audio: bytes, content_type: str) -> Path:
        suffix = ".webm"
        if "wav" in content_type:
            suffix = ".wav"
        elif "mpeg" in content_type or "mp3" in content_type:
            suffix = ".mp3"
        handle = tempfile.NamedTemporaryFile(
            prefix="vitakiosk-stt-",
            suffix=suffix,
            delete=False,
        )
        try:
            handle.write(audio)
            return Path(handle.name)
        finally:
            handle.close()
