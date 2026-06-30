from __future__ import annotations

import re
from dataclasses import replace

from services.contracts import VitaFlowAdapter
from services.models import (
    Product,
    ProductScanCandidate,
    ProductScanResult,
    ProductScanSignals,
)
from services.transcript_correction import correct_transcript


_BARCODE_PATTERN = re.compile(r"BARCODE:([A-Za-z0-9\-]+)", re.IGNORECASE)
_IMAGE_PATTERN = re.compile(r"IMAGE:([A-Za-z0-9\-]+)", re.IGNORECASE)
_OCR_PATTERN = re.compile(r"OCR:([^\r\n]+)", re.IGNORECASE)


def _decode_demo_frame(image: bytes) -> str:
    return image.decode("utf-8", errors="ignore")


def _candidate(
    product: Product,
    *,
    confidence: float,
    match_reason: str,
    matched_text: str | None = None,
) -> ProductScanCandidate:
    return ProductScanCandidate(
        product=product,
        confidence=round(confidence, 2),
        matchReason=match_reason,
        matchedText=matched_text,
    )


def _sort_candidates(
    candidates: list[ProductScanCandidate],
    *,
    limit: int = 5,
) -> tuple[ProductScanCandidate, ...]:
    return tuple(
        sorted(candidates, key=lambda item: item.confidence, reverse=True)[:limit]
    )


class MockProductVision:
    """Mock-safe local product scan.

    It uses deterministic demo markers embedded in test bytes:
    `BARCODE:<value>`, `IMAGE:<product-id>`, and `OCR:<label text>`.
    No camera frame is saved, no cloud OCR is called, and product facts are
    fetched from the VitaFlow adapter passed into the scan.
    """

    provider_name = "mock"

    def identify(self, image: bytes) -> str | None:
        del image
        return None

    def scan_product(
        self,
        image: bytes,
        content_type: str,
        branch_id: str,
        mode: str,
        vitaflow: VitaFlowAdapter,
    ) -> ProductScanResult:
        del content_type
        text = _decode_demo_frame(image)
        normalized_mode = (mode or "auto").strip().casefold()
        steps = _ordered_steps(normalized_mode)

        barcode_value: str | None = None
        ocr_text: str | None = None
        corrected_text: str | None = None
        image_similarity_seen = False
        candidates: list[ProductScanCandidate] = []

        for step in steps:
            if step == "barcode":
                barcode_value, barcode_candidates = self._scan_barcode(
                    text,
                    branch_id,
                    vitaflow,
                )
                if barcode_candidates:
                    return ProductScanResult(
                        ok=True,
                        provider=self.provider_name,
                        scanSignals=ProductScanSignals(
                            barcode=barcode_value,
                            imageSimilarity=False,
                            ocr=False,
                        ),
                        candidates=tuple(barcode_candidates),
                        requiresConfirmation=False,
                        message="Scanned product found.",
                        barcodeResult=barcode_value,
                    )
            elif step == "image":
                image_candidates = self._scan_image_similarity(text, branch_id, vitaflow)
                if image_candidates:
                    image_similarity_seen = True
                    candidates.extend(image_candidates)
            elif step == "ocr":
                ocr_text, corrected_text, ocr_candidates = self._scan_ocr(
                    text,
                    branch_id,
                    vitaflow,
                )
                candidates.extend(ocr_candidates)

        sorted_candidates = _sort_candidates(candidates)
        return ProductScanResult(
            ok=True,
            provider=self.provider_name,
            scanSignals=ProductScanSignals(
                barcode=barcode_value,
                imageSimilarity=image_similarity_seen,
                ocr=ocr_text is not None,
            ),
            candidates=sorted_candidates,
            requiresConfirmation=bool(sorted_candidates),
            message=(
                "Do you mean this item?"
                if sorted_candidates
                else "Product not found. Please try again or type the product name."
            ),
            barcodeResult=barcode_value,
            ocrText=ocr_text,
            correctedText=corrected_text,
        )

    def _scan_barcode(
        self,
        text: str,
        branch_id: str,
        vitaflow: VitaFlowAdapter,
    ) -> tuple[str | None, list[ProductScanCandidate]]:
        match = _BARCODE_PATTERN.search(text)
        if not match:
            return None, []
        barcode = match.group(1).strip()
        product = vitaflow.get_product_by_barcode(barcode, branch_id)
        if product is None:
            return barcode, []
        return barcode, [
            _candidate(
                product,
                confidence=0.99,
                match_reason="barcode_match",
                matched_text=barcode,
            )
        ]

    def _scan_image_similarity(
        self,
        text: str,
        branch_id: str,
        vitaflow: VitaFlowAdapter,
    ) -> list[ProductScanCandidate]:
        candidates: list[ProductScanCandidate] = []
        for index, product_id in enumerate(_IMAGE_PATTERN.findall(text)):
            product = vitaflow.get_product(product_id.strip(), branch_id)
            if product is None:
                continue
            candidates.append(
                _candidate(
                    product,
                    confidence=max(0.78, 0.93 - index * 0.05),
                    match_reason="product_image_similarity",
                    matched_text=None,
                )
            )
        return candidates

    def _scan_ocr(
        self,
        text: str,
        branch_id: str,
        vitaflow: VitaFlowAdapter,
    ) -> tuple[str | None, str | None, list[ProductScanCandidate]]:
        match = _OCR_PATTERN.search(text)
        if not match:
            return None, None, []

        ocr_text = match.group(1).strip()
        correction = correct_transcript(ocr_text)
        corrected = correction.corrected_transcript or ocr_text
        products = vitaflow.search_products(corrected, branch_id)
        if products:
            return (
                ocr_text,
                corrected,
                [
                    _candidate(
                        product,
                        confidence=0.88,
                        match_reason="ocr_text_match",
                        matched_text=ocr_text,
                    )
                    for product in products
                ],
            )

        candidates = [
            ProductScanCandidate(
                product=item.product,
                confidence=item.confidence,
                matchReason=item.match_reason,
                matchedText=item.matched_text,
            )
            for item in vitaflow.search_product_candidates(corrected, branch_id)
        ]
        return ocr_text, corrected, candidates


class LocalProductScanVision(MockProductVision):
    """Local-only product scan skeleton.

    This intentionally reuses the deterministic local pipeline until a reviewed
    local barcode/OCR/image-matching library is installed. It still does not
    call cloud image recognition or save raw camera frames.
    """

    provider_name = "local_product_scan"

    def scan_product(
        self,
        image: bytes,
        content_type: str,
        branch_id: str,
        mode: str,
        vitaflow: VitaFlowAdapter,
    ) -> ProductScanResult:
        result = super().scan_product(image, content_type, branch_id, mode, vitaflow)
        return replace(result, provider=self.provider_name)


class BarcodeOCRVision(LocalProductScanVision):
    """Backward-compatible placeholder alias for older config docs."""

    provider_name = "barcode_ocr"


def _ordered_steps(mode: str) -> tuple[str, ...]:
    if mode == "barcode_first":
        return ("barcode", "image", "ocr")
    if mode == "image_first":
        return ("image", "barcode", "ocr")
    if mode == "ocr_first":
        return ("ocr", "barcode", "image")
    return ("barcode", "image", "ocr")
