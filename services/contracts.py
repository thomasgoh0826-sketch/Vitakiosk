from __future__ import annotations

from typing import Protocol

from services.models import Product


class STTAdapter(Protocol):
    def transcribe(self, audio: bytes, content_type: str) -> str: ...


class TTSAdapter(Protocol):
    def synthesize(self, text: str) -> bytes: ...


class VitaFlowAdapter(Protocol):
    def search_products(self, query: str, branch_id: str) -> list[Product]: ...


class ProductVisionAdapter(Protocol):
    def identify(self, image: bytes) -> str | None: ...
