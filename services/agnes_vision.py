from __future__ import annotations

import base64
from dataclasses import dataclass, replace
import time
from typing import Callable

import httpx

from services.agnes_json import parse_agnes_json_object
from services.contracts import ProductVisionAdapter, VitaFlowAdapter
from services.models import (
    Product,
    ProductScanCandidate,
    ProductScanResult,
    ProductScanSignals,
)


_SIGNAL_FIELDS = {"brand", "product_name", "pack_size", "barcode", "label_text"}
_GENERIC_PACKAGE_TOKENS = {
    "and",
    "brand",
    "for",
    "only",
    "product",
    "the",
    "use",
    "with",
}
_GENERIC_FAMILY_TOKENS = _GENERIC_PACKAGE_TOKENS | {
    "brand",
    "cap",
    "caps",
    "capsule",
    "capsules",
    "gm",
    "mg",
    "ml",
    "pack",
    "slow",
    "release",
    "tab",
    "tabs",
    "tablet",
    "tablets",
}
_MIN_VISION_MATCH_CONFIDENCE = 0.82
_AMBIGUOUS_UNRELATED_SCORE_GAP = 0.08
_RELATED_VARIANT_SCORE_GAP = 0.06


def _identity_tokens(value: str) -> tuple[str, ...]:
    tokens: list[str] = []
    current: list[str] = []
    for character in value.casefold():
        if character.isalnum():
            current.append(character)
            continue
        if current:
            tokens.append("".join(current))
            current = []
    if current:
        tokens.append("".join(current))
    return tuple(tokens)


def _query_matches_product_identity(query: str, product: Product) -> bool:
    query_tokens = _identity_tokens(query)
    if not query_tokens:
        return False
    identity_values = (
        product.name,
        *product.aliases,
        product.barcode or "",
    )
    return any(
        all(token in set(_identity_tokens(value)) for token in query_tokens)
        for value in identity_values
        if value
    )


def _product_family_tokens(product: Product) -> tuple[str, ...]:
    return tuple(
        token
        for token in _identity_tokens(product.name)
        if (
            len(token) >= 2
            and not token.isdigit()
            and token not in _GENERIC_FAMILY_TOKENS
        )
    )


def _same_product_family(left: Product, right: Product) -> bool:
    left_tokens = _product_family_tokens(left)
    right_tokens = _product_family_tokens(right)
    if not left_tokens or not right_tokens or left_tokens[0] != right_tokens[0]:
        return False
    return len(set(left_tokens) & set(right_tokens)) >= 2


def _select_coherent_candidates(
    candidates: list[ProductScanCandidate],
) -> tuple[ProductScanCandidate, ...]:
    best_by_product: dict[str, ProductScanCandidate] = {}
    for candidate in candidates:
        current = best_by_product.get(candidate.product.id)
        if current is None or candidate.confidence > current.confidence:
            best_by_product[candidate.product.id] = candidate

    ranked = sorted(
        best_by_product.values(),
        key=lambda candidate: candidate.confidence,
        reverse=True,
    )
    if not ranked or ranked[0].confidence < _MIN_VISION_MATCH_CONFIDENCE:
        return ()

    top = ranked[0]
    close_unrelated = any(
        top.confidence - candidate.confidence <= _AMBIGUOUS_UNRELATED_SCORE_GAP
        and not _same_product_family(top.product, candidate.product)
        for candidate in ranked[1:]
    )
    if close_unrelated:
        return ()

    return tuple(
        candidate
        for candidate in ranked
        if (
            candidate is top
            or (
                top.confidence - candidate.confidence <= _RELATED_VARIANT_SCORE_GAP
                and _same_product_family(top.product, candidate.product)
            )
        )
    )[:3]


@dataclass(frozen=True)
class AgnesLabelSignals:
    brand: str = ""
    product_name: str = ""
    pack_size: str = ""
    barcode: str = ""
    label_text: str = ""


class AgnesProductVision:
    """Extract package identity, then resolve it only through VitaFlow."""

    provider_name = "agnes"

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        timeout_seconds: int,
        http_client: httpx.Client | None = None,
        fallback: ProductVisionAdapter | None = None,
        retry_sleeper: Callable[[float], None] = time.sleep,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout_seconds = timeout_seconds
        self._client = http_client or httpx.Client(timeout=timeout_seconds)
        self.fallback = fallback
        self._retry_sleeper = retry_sleeper

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
        del mode
        local_result = self._scan_fallback(
            image,
            content_type,
            branch_id,
            vitaflow,
        )
        if local_result is not None and local_result.candidates:
            return local_result

        try:
            signals = self._extract_signals(image, content_type)
        except RuntimeError:
            if local_result is not None:
                return replace(
                    local_result,
                    message=(
                        "Cloud vision is unavailable and the local scan found no "
                        "VitaFlow match. Please scan again or search manually."
                    ),
                )
            raise

        if signals.barcode:
            product = vitaflow.get_product_by_barcode(signals.barcode, branch_id)
            if product is not None:
                return ProductScanResult(
                    ok=True,
                    provider=self.provider_name,
                    scanSignals=ProductScanSignals(
                        barcode=signals.barcode,
                        imageSimilarity=True,
                        ocr=bool(signals.label_text),
                    ),
                    candidates=(
                        ProductScanCandidate(
                            product=product,
                            confidence=0.99,
                            matchReason="barcode_match",
                            matchedText=signals.barcode,
                        ),
                    ),
                    requiresConfirmation=False,
                    message="Scanned product found.",
                    barcodeResult=signals.barcode,
                    ocrText=signals.label_text or None,
                    correctedText=signals.label_text or None,
                )

        queries = self._product_lookup_queries(signals)
        resolved_candidates: list[ProductScanCandidate] = []
        matched_text = ""
        for query in queries:
            products = [
                product
                for product in vitaflow.search_products(query, branch_id)
                if _query_matches_product_identity(query, product)
            ]
            if products:
                scored_by_product = {
                    candidate.product.id: candidate
                    for candidate in vitaflow.search_product_candidates(
                        query,
                        branch_id,
                        limit=5,
                    )
                    if (
                        candidate.product.id in {product.id for product in products}
                        and _query_matches_product_identity(query, candidate.product)
                    )
                }
                matched_text = query
                resolved_candidates = [
                    ProductScanCandidate(
                        product=product,
                        confidence=(
                            scored_by_product[product.id].confidence
                            if product.id in scored_by_product
                            else 0.93
                        ),
                        matchReason=(
                            scored_by_product[product.id].match_reason
                            if product.id in scored_by_product
                            else "agnes_label_match"
                        ),
                        matchedText=(
                            scored_by_product[product.id].matched_text
                            if product.id in scored_by_product
                            else query
                        ),
                    )
                    for product in products
                ]
                break
        if not resolved_candidates:
            for query in queries:
                matches = vitaflow.search_product_candidates(
                    query,
                    branch_id,
                    limit=5,
                )
                matches = [
                    candidate
                    for candidate in matches
                    if _query_matches_product_identity(query, candidate.product)
                ]
                if matches:
                    matched_text = query
                    resolved_candidates = [
                        ProductScanCandidate(
                            product=match.product,
                            confidence=match.confidence,
                            matchReason=match.match_reason,
                            matchedText=match.matched_text or query,
                        )
                        for match in matches
                    ]
                    break

        candidates = _select_coherent_candidates(resolved_candidates)
        return ProductScanResult(
            ok=True,
            provider=self.provider_name,
            scanSignals=ProductScanSignals(
                barcode=signals.barcode or None,
                imageSimilarity=True,
                ocr=bool(signals.label_text),
            ),
            candidates=candidates,
            requiresConfirmation=bool(candidates),
            message=(
                "Do you mean this item?"
                if candidates
                else "No VitaFlow match yet. Please scan again or search manually."
            ),
            barcodeResult=signals.barcode or None,
            ocrText=signals.label_text or None,
            correctedText=signals.label_text or None,
        )

    def _scan_fallback(
        self,
        image: bytes,
        content_type: str,
        branch_id: str,
        vitaflow: VitaFlowAdapter,
    ) -> ProductScanResult | None:
        if self.fallback is None:
            return None
        try:
            return self.fallback.scan_product(
                image,
                content_type,
                branch_id,
                "auto",
                vitaflow,
            )
        except (RuntimeError, ValueError):
            return None

    @staticmethod
    def _product_lookup_queries(signals: AgnesLabelSignals) -> tuple[str, ...]:
        raw_queries = [
            " ".join(
                value
                for value in (
                    signals.brand,
                    signals.product_name,
                    signals.pack_size,
                )
                if value
            ),
            " ".join(
                value
                for value in (signals.brand, signals.product_name)
                if value
            ),
            signals.product_name,
        ]

        product_tokens = signals.product_name.split()[:8]
        label_tokens = signals.label_text.split()[:12]
        for source_tokens in (product_tokens, label_tokens):
            for window_size in range(len(source_tokens) - 1, 1, -1):
                for start in range(0, len(source_tokens) - window_size + 1):
                    raw_queries.append(
                        " ".join(source_tokens[start : start + window_size])
                    )
                    if len(raw_queries) >= 18:
                        break
                if len(raw_queries) >= 18:
                    break
        raw_queries.append(signals.brand)
        raw_queries.extend(
            token
            for token in reversed((*product_tokens, *label_tokens))
            if (
                len("".join(character for character in token if character.isalnum()))
                >= 3
                and token.casefold() not in _GENERIC_PACKAGE_TOKENS
            )
        )
        raw_queries.append(signals.label_text)

        queries: list[str] = []
        seen: set[str] = set()
        for query in raw_queries:
            clean_query = " ".join(query.split())
            normalized = clean_query.casefold()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            queries.append(clean_query)
        return tuple(queries)

    def _extract_signals(self, image: bytes, content_type: str) -> AgnesLabelSignals:
        if not image:
            raise ValueError("Camera frame is empty")
        encoded = base64.b64encode(image).decode("ascii")
        endpoint = (
            self._base_url
            if self._base_url.endswith("/v1/chat/completions")
            else f"{self._base_url}/v1/chat/completions"
        )
        payload = {
            "model": self._model,
            "temperature": 0,
            "max_tokens": 2000,
            "stream": False,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Identify only the physical product package held closest to the "
                        "camera. Ignore people, room background, kiosk UI, retailer price "
                        "stickers, THANK YOU stickers, shelf labels, and handwritten text. "
                        "The package may be small and may use Chinese, Malay, English, or "
                        "another language. Cross-check the visible logo, trademark, bottle "
                        "shape, label colours, and multilingual words instead of stopping "
                        "after one uncertain OCR fragment. "
                        "Return only strict JSON package identity signals. Do not give "
                        "medical advice or infer product facts."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Read the visible manufacturer branding, trademark, core "
                                "product name or flavour from the package. Use the visible "
                                "logo, Chinese trademark, Malay or English words, bottle shape, "
                                "and label colours together to identify the standard retail "
                                "product name only when supported by the package. Return JSON "
                                "with brand, product_name, pack_size, barcode, and label_text. "
                                "Put all useful package identity words in label_text. Do not "
                                "use a price sticker or retailer sticker as the product name. "
                                "Use null for any identity field that is not visible. Do not "
                                "give medical advice, product facts, price, stock, or location."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{content_type};base64,{encoded}"
                            },
                        },
                    ],
                },
            ],
        }
        try:
            response = None
            for attempt in range(2):
                try:
                    response = self._client.post(
                        endpoint,
                        headers={"Authorization": f"Bearer {self._api_key}"},
                        json=payload,
                        timeout=self._timeout_seconds,
                    )
                    response.raise_for_status()
                    break
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code in {400, 415}:
                        raise RuntimeError(
                            "agnes_direct_image_input_not_supported"
                        ) from exc
                    if attempt == 0 and exc.response.status_code in {
                        500,
                        502,
                        503,
                        504,
                    }:
                        self._retry_sleeper(1.0)
                        continue
                    raise RuntimeError("agnes_product_vision_unavailable") from exc
                except httpx.TransportError as exc:
                    if attempt == 0:
                        self._retry_sleeper(1.0)
                        continue
                    raise RuntimeError("agnes_product_vision_unavailable") from exc
            if response is None:
                raise RuntimeError("agnes_product_vision_unavailable")
            content = response.json()["choices"][0]["message"]["content"]
            parsed = parse_agnes_json_object(content)
            return self._parse_signals(parsed)
        except RuntimeError:
            raise
        except (httpx.HTTPError, ValueError, TypeError, KeyError, IndexError) as exc:
            raise RuntimeError("agnes_product_vision_unavailable") from exc

    @staticmethod
    def _parse_signals(payload: object) -> AgnesLabelSignals:
        if not isinstance(payload, dict) or set(payload) != _SIGNAL_FIELDS:
            raise ValueError("Invalid Agnes vision signals")
        values: dict[str, str] = {}
        for field in _SIGNAL_FIELDS:
            value = payload[field]
            if value is None:
                value = ""
            if not isinstance(value, str) or len(value) > 300:
                raise ValueError("Invalid Agnes vision signal value")
            values[field] = " ".join(value.split())
        return AgnesLabelSignals(**values)
