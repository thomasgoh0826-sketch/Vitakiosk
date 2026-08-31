from __future__ import annotations

import io
import math
from pathlib import Path
import re
import struct
import subprocess
import tempfile
import wave

import httpx

from services.models import TranscriptionResult


_SMALL_NUMBER_WORDS = (
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
)
_TENS_NUMBER_WORDS = (
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
)
_MALAYSIAN_CURRENCY_PATTERN = re.compile(
    r"(?<![A-Za-z0-9])RM\s*"
    r"([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)"
    r"(?:\.([0-9]{1,2}))?"
    r"(?![A-Za-z0-9])",
    flags=re.IGNORECASE,
)


def _integer_to_english_words(value: int) -> str:
    if value < 20:
        return _SMALL_NUMBER_WORDS[value]
    if value < 100:
        tens, remainder = divmod(value, 10)
        return " ".join(
            part
            for part in (
                _TENS_NUMBER_WORDS[tens],
                _integer_to_english_words(remainder) if remainder else "",
            )
            if part
        )
    if value < 1_000:
        hundreds, remainder = divmod(value, 100)
        return " ".join(
            part
            for part in (
                f"{_integer_to_english_words(hundreds)} hundred",
                _integer_to_english_words(remainder) if remainder else "",
            )
            if part
        )
    for scale, label in (
        (1_000_000_000, "billion"),
        (1_000_000, "million"),
        (1_000, "thousand"),
    ):
        if value >= scale:
            leading, remainder = divmod(value, scale)
            return " ".join(
                part
                for part in (
                    f"{_integer_to_english_words(leading)} {label}",
                    _integer_to_english_words(remainder) if remainder else "",
                )
                if part
            )
    return str(value)


def normalize_malaysian_currency_for_speech(text: str) -> str:
    """Render RM amounts as natural ringgit/sen speech without changing UI text."""

    def replace_amount(match: re.Match[str]) -> str:
        ringgit = int(match.group(1).replace(",", ""))
        cents_text = match.group(2) or ""
        sen = int(cents_text.ljust(2, "0")) if cents_text else 0
        parts: list[str] = []
        if ringgit:
            parts.append(f"{_integer_to_english_words(ringgit)} ringgit")
        if sen:
            parts.append(f"{_integer_to_english_words(sen)} sen")
        return " ".join(parts) or "zero ringgit"

    return _MALAYSIAN_CURRENCY_PATTERN.sub(replace_amount, text)


class MockSTT:
    provider_name = "mock_stt"

    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
        del content_type
        if not audio:
            raise ValueError("Audio payload is empty")
        return TranscriptionResult(
            transcript="show me pain relief products",
            provider=self.provider_name,
            language="english",
            confidence=1.0,
            clarification_needed=False,
            corrected_transcript="show me pain relief products",
        )


class MockTTS:
    provider_name = "mock_tts"

    def synthesize(self, text: str) -> bytes:
        if not text.strip():
            raise ValueError("Text payload is empty")

        sample_rate = 16_000
        duration_seconds = 0.18
        frame_count = int(sample_rate * duration_seconds)
        frequency = 440 + min(len(text), 80)
        amplitude = 8_000

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            frames = bytearray()
            for index in range(frame_count):
                sample = int(
                    amplitude
                    * math.sin(2 * math.pi * frequency * index / sample_rate)
                )
                frames.extend(struct.pack("<h", sample))
            wav_file.writeframes(bytes(frames))
        return buffer.getvalue()


class ElevenLabsTTS:
    """Explicitly enabled ElevenLabs text-to-speech adapter."""

    provider_name = "elevenlabs"
    media_type = "audio/mpeg"

    def __init__(
        self,
        *,
        api_key: str,
        voice_id: str,
        model_id: str = "eleven_multilingual_v2",
    ) -> None:
        self._api_key = api_key
        self._voice_id = voice_id
        self._model_id = model_id or "eleven_multilingual_v2"

    def synthesize(self, text: str) -> bytes:
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Text payload is empty")
        spoken_text = normalize_malaysian_currency_for_speech(clean_text)

        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self._voice_id}"
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    url,
                    params={"output_format": "mp3_44100_128"},
                    headers={
                        "Accept": "audio/mpeg",
                        "Content-Type": "application/json",
                        "xi-api-key": self._api_key,
                    },
                    json={
                        "text": spoken_text,
                        "model_id": self._model_id,
                    },
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                "ElevenLabs TTS request failed with status "
                f"{exc.response.status_code}"
            ) from exc
        except httpx.HTTPError as exc:
            raise RuntimeError("ElevenLabs TTS request failed") from exc

        return response.content


class PiperTTS:
    """Explicitly enabled local Piper text-to-speech adapter.

    The backend can start with this provider selected even before Piper is
    installed. Synthesis fails closed with a controlled provider error if the
    executable or model is unavailable.
    """

    provider_name = "piper"
    media_type = "audio/wav"

    def __init__(
        self,
        *,
        command: str = "piper",
        model_path: str = "",
        config_path: str = "",
        speaker: str = "",
    ) -> None:
        self._command = command.strip() or "piper"
        self._model_path = model_path.strip()
        self._config_path = config_path.strip()
        self._speaker = speaker.strip()

    def synthesize(self, text: str) -> bytes:
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Text payload is empty")
        if not self._model_path:
            raise RuntimeError("PIPER_MODEL_PATH is required for TTS_PROVIDER=piper")

        output_path: Path | None = None
        try:
            Path("tmp").mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                suffix=".wav",
                prefix="vitakiosk-piper-",
                dir="tmp",
                delete=False,
            ) as output_file:
                output_path = Path(output_file.name)

            command = [
                self._command,
                "--model",
                self._model_path,
                "--output_file",
                str(output_path),
            ]
            if self._config_path:
                command.extend(["--config", self._config_path])
            if self._speaker:
                command.extend(["--speaker", self._speaker])

            completed = subprocess.run(
                command,
                input=clean_text,
                text=True,
                capture_output=True,
                timeout=30,
                check=False,
            )
            if completed.returncode != 0:
                raise RuntimeError("Piper TTS request failed")
            audio = output_path.read_bytes()
            if not audio.startswith(b"RIFF"):
                raise RuntimeError("Piper TTS did not return WAV audio")
            return audio
        except FileNotFoundError as exc:
            raise RuntimeError("Piper executable was not found") from exc
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("Piper TTS request timed out") from exc
        finally:
            if output_path is not None:
                output_path.unlink(missing_ok=True)
