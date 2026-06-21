from __future__ import annotations

import io
import math
import struct
import wave


class MockSTT:
    def transcribe(self, audio: bytes, content_type: str) -> str:
        del content_type
        if not audio:
            raise ValueError("Audio payload is empty")
        return "show me pain relief products"


class MockTTS:
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


class OpenAIWhisperSTT:
    """Placeholder adapter for a future explicitly enabled OpenAI Whisper/STT layer."""

    provider_name = "openai_whisper"

    def __init__(self, *, api_key: str) -> None:
        self._api_key = api_key

    def transcribe(self, audio: bytes, content_type: str) -> str:
        del audio, content_type
        raise RuntimeError(
            "OpenAI Whisper STT is a live-provider placeholder and is not "
            "implemented in the mock-first demo."
        )


class ElevenLabsTTS:
    """Placeholder adapter for a future explicitly enabled ElevenLabs TTS layer."""

    provider_name = "elevenlabs"

    def __init__(self, *, api_key: str, voice_id: str) -> None:
        self._api_key = api_key
        self._voice_id = voice_id

    def synthesize(self, text: str) -> bytes:
        del text
        raise RuntimeError(
            "ElevenLabs TTS is a live-provider placeholder and is not "
            "implemented in the mock-first demo."
        )
