from __future__ import annotations

from typing import Protocol

from services.models import AIResult, Product, TranscriptionResult


class STTAdapter(Protocol):
    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult: ...


class TTSAdapter(Protocol):
    def synthesize(self, text: str) -> bytes: ...


class VitaFlowAdapter(Protocol):
    def search_products(self, query: str, branch_id: str) -> list[Product]: ...


class ProductVisionAdapter(Protocol):
    def identify(self, image: bytes) -> str | None: ...


class AIBrain(Protocol):
    def respond(
        self,
        text: str,
        branch_id: str,
        session_id: str | None = None,
        preferred_language: str = "auto",
    ) -> AIResult: ...
