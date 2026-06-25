from __future__ import annotations

import io
import math
import struct
import wave

import httpx

from services.models import TranscriptionResult


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
                        "text": clean_text,
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
