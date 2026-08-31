from __future__ import annotations

from typing import Protocol

from services.models import (
    AIResult,
    BranchShelfMap,
    Leaflet,
    LeafletKind,
    Product,
    Promotion,
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
    def get_shelf_map(self, branch_id: str) -> BranchShelfMap | None: ...
    def match_promotions(self, product_id: str, branch_id: str) -> list[Promotion]: ...
    def eligible_leaflets(
        self,
        branch_id: str,
        kind: LeafletKind | None = None,
    ) -> list[Leaflet]: ...
    def search_product_candidates(
        self,
        query: str,
        branch_id: str,
        *,
        limit: int = 5,
    ) -> list[ProductSearchResult]: ...
    def create_purchasing_miss(
        self,
        *,
        branch_id: str,
        request_source: str,
        raw_query: str | None = None,
        normalized_query: str | None = None,
        barcode: str | None = None,
        ocr_text: str | None = None,
        corrected_text: str | None = None,
        source_session_id: str | None = None,
    ) -> dict[str, object] | None: ...


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
        current_product_id: str | None = None,
    ) -> AIResult: ...
