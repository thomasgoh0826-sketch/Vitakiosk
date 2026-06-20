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
