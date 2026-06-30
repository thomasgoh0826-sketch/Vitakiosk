from __future__ import annotations

from collections.abc import Iterable
from difflib import SequenceMatcher
import re

from services.mock_data import MOCK_PRODUCTS
from services.models import Product, ProductSearchResult


_TOKEN_PATTERN = re.compile(r"[A-Za-z0-9\u3400-\u9fff]+", re.UNICODE)
_FUZZY_THRESHOLD = 0.72


def _tokens(value: str) -> list[str]:
    return _TOKEN_PATTERN.findall(value)


def _normalize(value: str) -> str:
    return " ".join(token.casefold() for token in _tokens(value))


def _window_candidates(query: str, term: str) -> list[str]:
    query_tokens = _tokens(query)
    term_tokens = _tokens(term)
    if not query_tokens or not term_tokens:
        return [query]

    window_sizes = {
        max(1, len(term_tokens) - 1),
        len(term_tokens),
        len(term_tokens) + 1,
    }
    windows: list[str] = []
    for window_size in sorted(window_sizes):
        if window_size > len(query_tokens):
            continue
        for start in range(0, len(query_tokens) - window_size + 1):
            windows.append(" ".join(query_tokens[start : start + window_size]))
    return windows or [query]


def _best_window_match(query: str, term: str) -> tuple[float, str]:
    normalized_term = _normalize(term)
    best_score = 0.0
    best_text = query.strip()
    for window in _window_candidates(query, term):
        normalized_window = _normalize(window)
        if not normalized_window or not normalized_term:
            continue
        score = SequenceMatcher(None, normalized_window, normalized_term).ratio()
        if score > best_score:
            best_score = score
            best_text = window
    return best_score, best_text


def _candidate_values(product: Product) -> tuple[tuple[str, str], ...]:
    values: list[tuple[str, str]] = [
        ("name", product.name),
        ("sku", product.id),
    ]
    values.extend(("alias", alias) for alias in product.aliases)
    return tuple(values)


def _score_candidate(query: str, field: str, value: str) -> tuple[float, str, str] | None:
    normalized_query = _normalize(query)
    normalized_value = _normalize(value)
    if not normalized_query or not normalized_value:
        return None

    if field == "sku" and normalized_query == normalized_value:
        return (1.0, "exact_sku_match", value)

    if normalized_query == normalized_value:
        return (1.0, f"exact_{field}_match", value)

    if normalized_value in normalized_query:
        confidence = 0.98 if field == "name" else 0.96
        return (confidence, f"exact_{field}_match", value)

    if normalized_query in normalized_value:
        return (0.90, f"partial_{field}_match", query.strip())

    score, matched_text = _best_window_match(query, value)
    if score < _FUZZY_THRESHOLD:
        return None
    reason = "near_name_match" if field == "name" else f"near_{field}_match"
    return (round(score, 2), reason, matched_text)


class MockVitaFlowAPI:
    def __init__(self, products: Iterable[Product] = MOCK_PRODUCTS) -> None:
        self._products = tuple(products)

    def search_products(self, query: str, branch_id: str) -> list[Product]:
        normalized_query = _normalize(query)
        if not normalized_query or not branch_id.strip():
            return []

        matches: list[Product] = []
        for product in self._products:
            if product.branch_id != branch_id:
                continue
            searchable = (product.name, *product.aliases)
            if any(
                normalized_query in _normalize(value)
                or _normalize(value) in normalized_query
                for value in searchable
            ):
                matches.append(product)
        return matches

    def search_product_candidates(
        self,
        query: str,
        branch_id: str,
        *,
        limit: int = 5,
    ) -> list[ProductSearchResult]:
        if not _normalize(query) or not branch_id.strip() or limit <= 0:
            return []

        best_by_product: dict[str, ProductSearchResult] = {}
        for product in self._products:
            if product.branch_id != branch_id:
                continue

            best_for_product: ProductSearchResult | None = None
            for field, value in _candidate_values(product):
                scored = _score_candidate(query, field, value)
                if scored is None:
                    continue
                confidence, match_reason, matched_text = scored
                candidate = ProductSearchResult(
                    product=product,
                    confidence=confidence,
                    match_reason=match_reason,
                    matched_text=matched_text,
                )
                if (
                    best_for_product is None
                    or candidate.confidence > best_for_product.confidence
                ):
                    best_for_product = candidate

            if best_for_product is not None:
                best_by_product[product.id] = best_for_product

        return sorted(
            best_by_product.values(),
            key=lambda item: (
                item.confidence,
                item.match_reason.startswith("exact_"),
                item.match_reason.startswith("partial_"),
            ),
            reverse=True,
        )[:limit]

    def get_product(self, product_id: str, branch_id: str) -> Product | None:
        return next(
            (
                product
                for product in self._products
                if product.id == product_id and product.branch_id == branch_id
            ),
            None,
        )

    def get_product_by_barcode(self, barcode: str, branch_id: str) -> Product | None:
        normalized_barcode = barcode.strip()
        if not normalized_barcode or not branch_id.strip():
            return None
        return next(
            (
                product
                for product in self._products
                if product.branch_id == branch_id and product.barcode == normalized_barcode
            ),
            None,
        )


class ReadOnlyVitaFlowAPI:
    """Placeholder for the first future live VitaFlow integration.

    The first live connector must stay read-only and must not write customer,
    stock, purchasing, or sales data.
    """

    provider_name = "readonly_api"

    def __init__(self, *, base_url: str) -> None:
        self._base_url = base_url.rstrip("/")

    def search_products(self, query: str, branch_id: str) -> list[Product]:
        del query, branch_id
        raise RuntimeError(
            "Read-only VitaFlow API is a live-provider placeholder and is not "
            "implemented in the mock-first demo."
        )

    def search_product_candidates(
        self,
        query: str,
        branch_id: str,
        *,
        limit: int = 5,
    ) -> list[ProductSearchResult]:
        del query, branch_id, limit
        raise RuntimeError(
            "Read-only VitaFlow API fuzzy search is a live-provider placeholder "
            "and is not implemented in the mock-first demo."
        )

    def get_product(self, product_id: str, branch_id: str) -> Product | None:
        del product_id, branch_id
        raise RuntimeError(
            "Read-only VitaFlow API product lookup is a live-provider placeholder "
            "and is not implemented in the mock-first demo."
        )

    def get_product_by_barcode(self, barcode: str, branch_id: str) -> Product | None:
        del barcode, branch_id
        raise RuntimeError(
            "Read-only VitaFlow API barcode lookup is a live-provider placeholder "
            "and is not implemented in the mock-first demo."
        )
