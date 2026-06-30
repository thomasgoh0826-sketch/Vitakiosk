from __future__ import annotations

from typing import Protocol

from services.models import (
    AIResult,
    Product,
    ProductScanResult,
    ProductSearchResult,
    TranscriptionResult,
)


class STTAdapter(Protocol):
    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult: ...


class TTSAdapter(Protocol):
    def synthesize(self, text: str) -> bytes: ...


class VitaFlowAdapter(Protocol):
    def search_products(self, query: str, branch_id: str) -> list[Product]: ...
    def get_product(self, product_id: str, branch_id: str) -> Product | None: ...
    def get_product_by_barcode(self, barcode: str, branch_id: str) -> Product | None: ...
    def search_product_candidates(
        self,
        query: str,
        branch_id: str,
        *,
        limit: int = 5,
    ) -> list[ProductSearchResult]: ...


class ProductVisionAdapter(Protocol):
    def identify(self, image: bytes) -> str | None: ...
    def scan_product(
        self,
        image: bytes,
        content_type: str,
        branch_id: str,
        mode: str,
        vitaflow: VitaFlowAdapter,
    ) -> ProductScanResult: ...


class AIBrain(Protocol):
    def respond(
        self,
        text: str,
        branch_id: str,
        session_id: str | None = None,
        preferred_language: str = "auto",
    ) -> AIResult: ...
