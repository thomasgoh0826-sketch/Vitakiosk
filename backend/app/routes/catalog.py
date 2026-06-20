from __future__ import annotations

from dataclasses import asdict
from typing import Annotated, Any

from fastapi import APIRouter, Query

from backend.app.dependencies import (
    poster_engine,
    promotion_engine,
    purchasing_store,
    vitaflow,
)


router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/products/search")
def search_products(
    query: Annotated[str, Query(min_length=1, max_length=200)],
    branch_id: Annotated[str, Query(min_length=1, max_length=40)],
) -> dict[str, Any]:
    products = vitaflow.search_products(query, branch_id)
    purchasing_query_id: str | None = None
    if not products:
        purchasing_query_id = purchasing_store.create(query, branch_id).id
    return {
        "items": [asdict(product) for product in products],
        "purchasing_query_id": purchasing_query_id,
        "source": "mock_vitaflow",
    }


@router.get("/promotions/match")
def match_promotions(
    product_id: Annotated[str, Query(min_length=1, max_length=80)],
    branch_id: Annotated[str, Query(min_length=1, max_length=40)],
) -> dict[str, Any]:
    promotions = promotion_engine.match(product_id, branch_id)
    return {
        "items": [asdict(promotion) for promotion in promotions],
        "source": "mock_vitaflow",
    }


@router.get("/posters/idle")
def idle_posters(
    branch_id: Annotated[str, Query(min_length=1, max_length=40)],
) -> dict[str, Any]:
    posters = poster_engine.idle(branch_id)
    return {
        "items": [asdict(poster) for poster in posters],
        "source": "mock_vitaflow",
    }
