from __future__ import annotations

from collections.abc import Iterable

from services.mock_data import MOCK_PRODUCTS
from services.models import Product


def _normalize(value: str) -> str:
    return " ".join(value.casefold().split())


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

    def get_product(self, product_id: str, branch_id: str) -> Product | None:
        return next(
            (
                product
                for product in self._products
                if product.id == product_id and product.branch_id == branch_id
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
