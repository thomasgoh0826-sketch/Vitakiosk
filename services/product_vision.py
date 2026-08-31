from __future__ import annotations

import re
from typing import Callable

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

_KIOSK_OCR_COPY = {
    "mock vitaflow",
    "vitaflow",
    "scan product",
    "place product inside the frame",
    "place the product inside the frame",
    "place product barcode package front or label inside this area",
    "looking for product",
    "hold steady",
    "capturing",
    "searching product",
    "scan again",
    "search manually",
}


def _decode_demo_frame(image: bytes) -> str:
    return image.decode("utf-8", errors="ignore")


def _normalize_ocr_label(text: str) -> str:
    normalized = text.replace("’", "'")
    normalized = re.sub(r"[^\w\s-]", " ", normalized, flags=re.UNICODE)
    normalized = " ".join(normalized.split())
    # Product labels often render vitamin letters without a visible gap.
    normalized = re.sub(r"(?i)\b(buffered|vitamin|vit)([cdek])\b", r"\1 \2", normalized)
    return normalized


def _is_kiosk_ocr_copy(text: str) -> bool:
    normalized = _normalize_ocr_label(text).casefold()
    compact = re.sub(r"[^\w]", "", normalized, flags=re.UNICODE)
    return normalized in _KIOSK_OCR_COPY or any(
        normalized.startswith(f"{phrase} ")
        or compact == re.sub(r"[^\w]", "", phrase, flags=re.UNICODE)
        or compact.startswith(re.sub(r"[^\w]", "", phrase, flags=re.UNICODE))
        for phrase in _KIOSK_OCR_COPY
    )


def _ocr_query_variants(text: str) -> tuple[str, ...]:
    """Return conservative label variants for punctuation commonly lost by OCR."""

    normalized = _normalize_ocr_label(text)
    tokens = normalized.split()
    possessive_tokens = [
        f"{token[:-1]} S" if len(token) >= 6 and token.casefold().endswith("s") else token
        for token in tokens
    ]
    possessive_variant = " ".join(possessive_tokens)
    if possessive_variant.casefold() == normalized.casefold():
        return (normalized,)
    return (normalized, possessive_variant)


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


def _purchasing_miss_message(miss: dict[str, object] | None) -> str | None:
    if not isinstance(miss, dict):
        return None
    message = str(miss.get("message") or "").strip()
    if message:
        return message
    request_id = str(miss.get("requestId") or "").strip()
    if not request_id:
        return None
    if bool(miss.get("deduplicated")) or str(miss.get("status") or "").lower() == "updated":
        return f"Existing purchase request updated: {request_id}."
    return f"Item not found. Purchase request sent to branch purchasing: {request_id}."


def _request_purchasing_miss(
    vitaflow: VitaFlowAdapter,
    *,
    branch_id: str,
    barcode_value: str | None,
    ocr_text: str | None,
    corrected_text: str | None,
) -> dict[str, object] | None:
    if getattr(vitaflow, "provider_name", "") == "readonly_api":
        return None
    create_miss = getattr(vitaflow, "create_purchasing_miss", None)
    if not callable(create_miss):
        return None
    if barcode_value:
        return create_miss(
            branch_id=branch_id,
            request_source="barcode_scan",
            raw_query=barcode_value,
            normalized_query=barcode_value,
            barcode=barcode_value,
        )
    readable_text = corrected_text or ocr_text
    if readable_text:
        return create_miss(
            branch_id=branch_id,
            request_source="ocr_scan",
            raw_query=ocr_text or readable_text,
            normalized_query=readable_text,
            ocr_text=ocr_text,
            corrected_text=corrected_text,
        )
    return None


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
        can_create_purchasing_miss = (
            getattr(vitaflow, "provider_name", "") != "readonly_api"
            and callable(getattr(vitaflow, "create_purchasing_miss", None))
        )
        miss = None if sorted_candidates else _request_purchasing_miss(
            vitaflow,
            branch_id=branch_id,
            barcode_value=barcode_value,
            ocr_text=ocr_text,
            corrected_text=corrected_text,
        )
        purchasing_query_id = str(miss.get("requestId") or miss.get("purchasingQueryId") or "") if miss else None
        purchasing_request_status = str(miss.get("status") or "").strip() if miss else None
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
                else (
                    _purchasing_miss_message(miss)
                    or (
                        "Item not recognized, please type item name."
                        if not barcode_value and not ocr_text and not corrected_text
                        else (
                            "Product not found. Purchase request could not be sent to branch purchasing."
                            if can_create_purchasing_miss
                            else "Product not found. Please try again or type the product name."
                        )
                    )
                )
            ),
            barcodeResult=barcode_value,
            ocrText=ocr_text,
            correctedText=corrected_text,
            purchasingQueryId=purchasing_query_id or None,
            purchasingRequestStatus=purchasing_request_status or None,
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
    """Local barcode/OCR product scan without persisting camera frames."""

    provider_name = "local_product_scan"

    def __init__(
        self,
        *,
        ocr_reader: Callable[[bytes], tuple[tuple[str, float], ...]] | None = None,
        barcode_reader: Callable[[bytes], tuple[str, ...]] | None = None,
    ) -> None:
        self._ocr_reader = ocr_reader or self._read_ocr_locally
        self._barcode_reader = barcode_reader or self._read_barcodes_locally

    def scan_product(
        self,
        image: bytes,
        content_type: str,
        branch_id: str,
        mode: str,
        vitaflow: VitaFlowAdapter,
    ) -> ProductScanResult:
        barcode_values = self._barcode_reader(image)
        for barcode in barcode_values:
            product = vitaflow.get_product_by_barcode(barcode, branch_id)
            if product is not None:
                return ProductScanResult(
                    ok=True,
                    provider=self.provider_name,
                    scanSignals=ProductScanSignals(
                        barcode=barcode,
                        imageSimilarity=False,
                        ocr=False,
                    ),
                    candidates=(
                        _candidate(
                            product,
                            confidence=0.99,
                            match_reason="barcode_match",
                            matched_text=barcode,
                        ),
                    ),
                    requiresConfirmation=False,
                    message="Scanned product found.",
                    barcodeResult=barcode,
                )

        ocr_lines = tuple(
            (text.strip(), confidence)
            for text, confidence in self._ocr_reader(image)
            if text.strip() and confidence >= 0.45
        )
        ocr_text = _normalize_ocr_label(
            " ".join(text for text, _ in ocr_lines).strip()
        )
        correction = correct_transcript(ocr_text) if ocr_text else None
        corrected_text = (
            correction.corrected_transcript if correction is not None else None
        ) or ocr_text or None
        candidates = self._match_ocr_queries(
            ocr_lines,
            corrected_text,
            branch_id,
            vitaflow,
        )
        sorted_candidates = _sort_candidates(candidates)

        return ProductScanResult(
            ok=True,
            provider=self.provider_name,
            scanSignals=ProductScanSignals(
                barcode=barcode_values[0] if barcode_values else None,
                imageSimilarity=False,
                ocr=bool(ocr_text),
            ),
            candidates=sorted_candidates,
            requiresConfirmation=bool(sorted_candidates),
            message=(
                "Do you mean this item?"
                if sorted_candidates
                else "Item not recognized, please keep the label steady or type the product name."
            ),
            barcodeResult=barcode_values[0] if barcode_values else None,
            ocrText=ocr_text or None,
            correctedText=corrected_text,
        )

    def _match_ocr_queries(
        self,
        ocr_lines: tuple[tuple[str, float], ...],
        corrected_text: str | None,
        branch_id: str,
        vitaflow: VitaFlowAdapter,
    ) -> list[ProductScanCandidate]:
        queries: list[tuple[str, float]] = []
        product_lines = [
            (_normalize_ocr_label(text), confidence)
            for text, confidence in ocr_lines
            if not _is_kiosk_ocr_copy(text)
        ]
        line_texts = [text for text, _ in product_lines if text]

        # Camera labels are usually the clearest, highest-confidence adjacent
        # OCR lines. Search that compact brand/range phrase before lower-
        # confidence price stickers or background copy can pollute the query.
        # This is generic confidence/shape filtering; it does not know any
        # product or brand name.
        high_confidence_label_lines = [
            text
            for text, confidence in product_lines
            if confidence >= 0.90 and any(character.isalpha() for character in text)
        ]
        if high_confidence_label_lines:
            for variant in _ocr_query_variants(" ".join(high_confidence_label_lines)):
                queries.append((variant, 0.94))
            for window_size in range(
                min(4, len(high_confidence_label_lines)),
                1,
                -1,
            ):
                for index in range(len(high_confidence_label_lines) - window_size + 1):
                    for variant in _ocr_query_variants(
                        " ".join(
                            high_confidence_label_lines[index : index + window_size]
                        )
                    ):
                        queries.append((variant, 0.93))

        # Product packaging commonly splits brand, range, flavour and pack size
        # across separate lines. Prefer the complete cleaned label, then
        # contiguous windows, before trying isolated words. This keeps kiosk UI
        # copy out of ERP searches without hardcoding any product or brand.
        if line_texts:
            for variant in _ocr_query_variants(" ".join(line_texts)):
                queries.append((variant, 0.93))
            for window_size in range(min(4, len(line_texts)), 1, -1):
                for index in range(len(line_texts) - window_size + 1):
                    for variant in _ocr_query_variants(
                        " ".join(line_texts[index : index + window_size])
                    ):
                        queries.append((variant, 0.92))
        elif corrected_text:
            queries.append((corrected_text, 0.90))

        queries.extend(
            (text, max(0.82, min(0.91, confidence)))
            for text, confidence in product_lines
            if len(text) >= 4
        )

        seen_queries: set[str] = set()
        candidates_by_id: dict[str, ProductScanCandidate] = {}
        for query, confidence in queries[:12]:
            normalized_query = " ".join(query.casefold().split())
            if not normalized_query or normalized_query in seen_queries:
                continue
            seen_queries.add(normalized_query)
            products = vitaflow.search_products(query, branch_id)
            for product in products:
                candidate = _candidate(
                    product,
                    confidence=confidence,
                    match_reason="ocr_text_match",
                    matched_text=query,
                )
                current = candidates_by_id.get(product.id)
                if current is None or candidate.confidence > current.confidence:
                    candidates_by_id[product.id] = candidate
            if not products:
                fuzzy_matches = vitaflow.search_product_candidates(
                    query,
                    branch_id,
                    limit=5,
                )
                for match in fuzzy_matches:
                    candidate = _candidate(
                        match.product,
                        confidence=min(confidence, match.confidence),
                        match_reason="ocr_text_match",
                        matched_text=query,
                    )
                    current = candidates_by_id.get(match.product.id)
                    if current is None or candidate.confidence > current.confidence:
                        candidates_by_id[match.product.id] = candidate
                if fuzzy_matches:
                    break
            if products:
                break

        return list(candidates_by_id.values())

    @staticmethod
    def _decode_image(image: bytes):
        try:
            import cv2
            import numpy as np
        except ImportError as exc:  # pragma: no cover - guarded by provider config
            raise RuntimeError(
                "Local product scan requires rapidocr-onnxruntime and OpenCV."
            ) from exc

        frame = cv2.imdecode(np.frombuffer(image, dtype=np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Camera frame could not be decoded.")
        return frame

    @classmethod
    def _read_ocr_locally(cls, image: bytes) -> tuple[tuple[str, float], ...]:
        try:
            from rapidocr_onnxruntime import RapidOCR
        except ImportError as exc:  # pragma: no cover - guarded by provider config
            raise RuntimeError(
                "Local product scan requires rapidocr-onnxruntime."
            ) from exc

        result, _ = RapidOCR()(cls._decode_image(image))
        if not result:
            return ()
        return tuple(
            (str(item[1]), float(item[2]))
            for item in result
            if len(item) >= 3
        )

    @classmethod
    def _read_barcodes_locally(cls, image: bytes) -> tuple[str, ...]:
        import cv2

        detector = cv2.barcode_BarcodeDetector()
        try:
            decoded_info, _decoded_type, _points = detector.detectAndDecode(
                cls._decode_image(image)
            )
        except (cv2.error, ValueError):
            return ()
        if isinstance(decoded_info, str):
            decoded_info = (decoded_info,)
        return tuple(str(value).strip() for value in decoded_info if str(value).strip())


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
