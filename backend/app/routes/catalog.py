from __future__ import annotations

from dataclasses import asdict
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, HTTPException, Query, Response

from backend.app.dependencies import (
    leaflet_engine,
    poster_engine,
    promotion_engine,
    purchasing_store,
    settings,
    vitaflow,
)
from services.models import Poster


router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/vitaflow-assets/{asset_path:path}")
def vitaflow_asset(asset_path: str) -> Response:
    """Serve read-only VitaFlow images through the Kiosk origin.

    This keeps product and leaflet images reachable from an iPad/Cloudflare
    demo without exposing the workstation-only VitaFlow host to the browser.
    """

    normalized_path = asset_path.strip("/")
    parts = normalized_path.split("/")
    base_url = settings.vitaflow_api_base_url.rstrip("/")
    if not base_url or not normalized_path or any(part in {"", ".", ".."} for part in parts):
        raise HTTPException(status_code=404, detail="VitaFlow asset unavailable")

    try:
        upstream = httpx.get(
            f"{base_url}/{normalized_path}",
            timeout=8.0,
            follow_redirects=False,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="VitaFlow asset unavailable") from exc

    content_type = upstream.headers.get("content-type", "").split(";", 1)[0].strip()
    if upstream.status_code != 200 or not content_type.startswith("image/"):
        raise HTTPException(status_code=404, detail="VitaFlow asset unavailable")

    return Response(
        content=upstream.content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=300"},
    )


@router.get("/products/search")
def search_products(
    query: Annotated[str, Query(min_length=1, max_length=200)],
    branch_id: Annotated[str, Query(min_length=1, max_length=40)],
) -> dict[str, Any]:
    products = vitaflow.search_products(query, branch_id)
    candidates = []
    purchasing_query_id: str | None = None
    purchasing_request_status: str | None = None
    message: str | None = None
    if not products:
        candidates = vitaflow.search_product_candidates(query, branch_id)
    if not products and not candidates:
        purchasing_query_id = purchasing_store.create(query, branch_id).id
    return {
        "items": [asdict(product) for product in products],
        "candidates": [asdict(candidate) for candidate in candidates],
        "purchasing_query_id": purchasing_query_id,
        "purchasing_request_status": purchasing_request_status,
        "message": message,
        "source": getattr(vitaflow, "provider_name", "mock_vitaflow"),
    }


@router.get("/promotions/match")
def match_promotions(
    product_id: Annotated[str, Query(min_length=1, max_length=80)],
    branch_id: Annotated[str, Query(min_length=1, max_length=40)],
) -> dict[str, Any]:
    if getattr(vitaflow, "provider_name", "") == "readonly_api" and hasattr(
        vitaflow,
        "match_promotions",
    ):
        promotions = vitaflow.match_promotions(product_id, branch_id)
        source = "vitaflow_erp"
    else:
        promotions = promotion_engine.match(product_id, branch_id)
        source = "mock_vitaflow"
    return {
        "items": [asdict(promotion) for promotion in promotions],
        "source": source,
    }


@router.get("/posters/idle")
def idle_posters(
    branch_id: Annotated[str, Query(min_length=1, max_length=40)],
) -> dict[str, Any]:
    if getattr(vitaflow, "provider_name", "") == "readonly_api" and hasattr(
        vitaflow,
        "eligible_leaflets",
    ):
        posters = [
            Poster(
                id=f"{leaflet.kind.value}-{leaflet.id}",
                title=leaflet.title,
                branch_id=leaflet.branch_id,
                promotion_id=leaflet.id,
                asset_path=leaflet.image_url,
                source=leaflet.source,
            )
            for leaflet in vitaflow.eligible_leaflets(branch_id)
        ]
        source = "vitaflow_erp"
    else:
        posters = poster_engine.idle(branch_id)
        source = "mock_vitaflow"
    return {
        "items": [asdict(poster) for poster in posters],
        "source": source,
    }


@router.get("/leaflets/active")
def active_leaflets(
    branch_id: Annotated[str, Query(min_length=1, max_length=40)],
) -> dict[str, Any]:
    """Return the source-backed, current leaflet deck for one branch."""

    leaflets = leaflet_engine.eligible_for_branch(branch_id)
    return {
        "items": [asdict(leaflet) for leaflet in leaflets],
        "source": getattr(vitaflow, "provider_name", "mock_vitaflow"),
    }


@router.get("/shelf-map")
def shelf_map(
    branch_id: Annotated[str, Query(min_length=1, max_length=40)],
) -> dict[str, Any]:
    shelf_map_data = vitaflow.get_shelf_map(branch_id)
    source = getattr(vitaflow, "provider_name", "mock_vitaflow")
    if shelf_map_data is None:
        return {
            "map": None,
            "source": source,
            "unavailable_reason": "ERP shelf map unavailable; using local mock fallback.",
        }
    return {
        "map": asdict(shelf_map_data),
        "source": shelf_map_data.source,
        "unavailable_reason": shelf_map_data.unavailable_reason,
    }
