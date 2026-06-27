from __future__ import annotations

from dataclasses import asdict
import re
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from backend.app.dependencies import purchasing_store, vitaflow
from services.models import Product, ProductSearchResult


router = APIRouter(prefix="/api/vision", tags=["vision"])

MOCK_BARCODE_INDEX = {
    "955000000001": "relief balm",
    "MOCK-P001": "relief balm",
}


def sanitize_text(value: str) -> str:
    without_tags = re.sub(r"<[^>]*>", " ", value)
    return re.sub(r"\s+", " ", without_tags).strip()[:240]


class VisionScanRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=120)
    branch_id: str = Field(default="SG-001", min_length=1, max_length=40)
    barcode: str | None = Field(default=None, max_length=80)
    ocr_text: str | None = Field(default=None, max_length=240)
    image_signature: str | None = Field(default=None, max_length=120)

    @field_validator("session_id", "branch_id", "barcode", "ocr_text", "image_signature", mode="before")
    @classmethod
    def clean_text(cls, value: object) -> object:
        if isinstance(value, str):
            return sanitize_text(value)
        return value


def _candidate_from_product(
    product: Product,
    *,
    confidence: float,
    reason: str,
    matched_text: str,
) -> ProductSearchResult:
    return ProductSearchResult(
        product=product,
        confidence=confidence,
        match_reason=reason,
        matched_text=matched_text,
    )


def _append_unique(
    candidates: list[ProductSearchResult],
    incoming: list[ProductSearchResult],
) -> None:
    seen = {candidate.product.id for candidate in candidates}
    for candidate in incoming:
        if candidate.product.id in seen:
            continue
        candidates.append(candidate)
        seen.add(candidate.product.id)


@router.post("/scan-product")
def scan_product(payload: VisionScanRequest) -> dict[str, Any]:
    signals: list[str] = []
    candidates: list[ProductSearchResult] = []
    query_terms: list[str] = []

    if payload.barcode:
        signals.append("barcode_lookup")
        barcode_query = MOCK_BARCODE_INDEX.get(payload.barcode.upper())
        if barcode_query:
            query_terms.append(barcode_query)
            exact = vitaflow.search_products(barcode_query, payload.branch_id)
            _append_unique(
                candidates,
                [
                    _candidate_from_product(
                        product,
                        confidence=0.99,
                        reason="mock_barcode_lookup",
                        matched_text=payload.barcode,
                    )
                    for product in exact
                ],
            )

    if payload.ocr_text:
        signals.append("ocr_text")
        query_terms.append(payload.ocr_text)
        exact = vitaflow.search_products(payload.ocr_text, payload.branch_id)
        _append_unique(
            candidates,
            [
                _candidate_from_product(
                    product,
                    confidence=0.92,
                    reason="mock_ocr_exact_text",
                    matched_text=payload.ocr_text or "",
                )
                for product in exact
            ],
        )
        _append_unique(
            candidates,
            vitaflow.search_product_candidates(payload.ocr_text, payload.branch_id),
        )

    if payload.image_signature:
        signals.append("image_similarity_placeholder")
        if "relief" in payload.image_signature.lower() or "balm" in payload.image_signature.lower():
            query_terms.append("relief balm")
            exact = vitaflow.search_products("relief balm", payload.branch_id)
            _append_unique(
                candidates,
                [
                    _candidate_from_product(
                        product,
                        confidence=0.82,
                        reason="mock_image_similarity_candidate",
                        matched_text=payload.image_signature or "",
                    )
                    for product in exact
                ],
            )

    if query_terms:
        signals.append("fuzzy_product_search")

    purchasing_query_id: str | None = None
    if not candidates:
        query = payload.ocr_text or payload.barcode or payload.image_signature or "unmatched product scan"
        purchasing_query_id = purchasing_store.create(query, payload.branch_id).id

    return {
        "status": "mock_candidates" if candidates else "purchasing_query_created",
        "provider": "mock",
        "source": "mock_vitaflow",
        "session_id": payload.session_id,
        "branch_id": payload.branch_id,
        "candidate_generation": signals or ["mock_no_image_guess"],
        "requires_confirmation": bool(candidates),
        "product": None,
        "candidates": [asdict(candidate) for candidate in candidates],
        "purchasing_query_id": purchasing_query_id,
        "message": (
            "Confirm the VitaFlow-backed candidate before showing product details."
            if candidates
            else "No authoritative product match. A purchasing query was created instead of guessing."
        ),
    }
