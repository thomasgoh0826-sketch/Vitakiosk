from __future__ import annotations

from typing import Protocol

from services.models import AIResult, Product, ProductSearchResult, TranscriptionResult


class STTAdapter(Protocol):
    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult: ...


class TTSAdapter(Protocol):
    def synthesize(self, text: str) -> bytes: ...


class VitaFlowAdapter(Protocol):
    def search_products(self, query: str, branch_id: str) -> list[Product]: ...
    def search_product_candidates(
        self,
        query: str,
        branch_id: str,
        *,
        limit: int = 5,
    ) -> list[ProductSearchResult]: ...


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
