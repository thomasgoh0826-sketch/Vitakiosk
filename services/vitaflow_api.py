from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timezone
from difflib import SequenceMatcher
import re

import httpx

from services.mock_data import MOCK_BRANCH_SHELF_MAPS, MOCK_PRODUCTS
from services.models import (
    BranchShelfMap,
    Leaflet,
    LeafletKind,
    Product,
    ProductImage,
    ProductLocation,
    ProductSearchResult,
    Promotion,
    ShelfMapPoint,
    ShelfMapRegion,
)


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

    def get_shelf_map(self, branch_id: str) -> BranchShelfMap | None:
        return next(
            (
                shelf_map
                for shelf_map in MOCK_BRANCH_SHELF_MAPS
                if shelf_map.branch_id == branch_id
            ),
            None,
        )


class ReadOnlyVitaFlowAPI:
    """Read approved customer-facing product facts from VitaFlow ERP."""

    provider_name = "readonly_api"

    def __init__(
        self,
        *,
        base_url: str,
        token: str = "",
        timeout_seconds: float = 3.0,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._token = token.strip()
        self._client = http_client or httpx.Client(timeout=timeout_seconds)
        self._verified_products: dict[tuple[str, str], Product] = {}

    def _remember_verified_product(self, product: Product) -> None:
        key = (product.branch_id.casefold(), product.id)
        self._verified_products.pop(key, None)
        self._verified_products[key] = product
        while len(self._verified_products) > 256:
            self._verified_products.pop(next(iter(self._verified_products)))

    def _headers(self) -> dict[str, str]:
        if not self._token:
            return {}
        return {"Authorization": f"Bearer {self._token}"}

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, object] | None = None,
        json_body: dict[str, object] | None = None,
    ) -> dict[str, object] | list[object] | None:
        try:
            response = self._client.request(
                method,
                f"{self._base_url}{path}",
                params={key: value for key, value in (params or {}).items() if value not in (None, "")},
                json=json_body,
                headers=self._headers(),
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError, TypeError):
            return None
        if not isinstance(payload, dict) or payload.get("ok") is False:
            return None
        data = payload.get("data")
        return data if isinstance(data, (dict, list)) else None

    @staticmethod
    def _text(value: object) -> str:
        return str(value or "").strip()

    @staticmethod
    def _display_location(value: object) -> str:
        words = ReadOnlyVitaFlowAPI._text(value).split()
        while len(words) > 1 and words[0].casefold() == words[1].casefold():
            words.pop(0)
        return " ".join(words)

    def _asset_url(self, value: object) -> str | None:
        url = self._text(value)
        if not url:
            return None
        if url.startswith("data:"):
            return url
        base_url = self._base_url.rstrip("/")
        if url.startswith(f"{base_url}/"):
            url = url[len(base_url):]
        if url.startswith("/"):
            return f"/api/vitaflow-assets/{url.lstrip('/')}"
        if url.startswith(("http://", "https://")):
            return url
        return url

    @staticmethod
    def _float_or_none(value: object) -> float | None:
        try:
            if value is None or value == "":
                return None
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _int_or_none(value: object) -> int | None:
        try:
            if value is None or value == "":
                return None
            return int(float(value))
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _percent(value: object) -> float | None:
        numeric_value = ReadOnlyVitaFlowAPI._float_or_none(value)
        if numeric_value is None:
            return None
        return min(max(numeric_value, 0), 100)

    @staticmethod
    def _datetime(value: object) -> datetime:
        raw = str(value or "").strip()
        if not raw:
            return datetime.now(tz=timezone.utc)
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return datetime.now(tz=timezone.utc)

    def _map_image(self, row: dict[str, object]) -> ProductImage | None:
        url = self._asset_url(row.get("url") or row.get("imageUrl"))
        if not url:
            return None
        return ProductImage(
            url=url,
            type=self._text(row.get("type")) or "gallery",
            isPrimary=bool(row.get("isPrimary")),
            alt=self._text(row.get("alt") or row.get("imageAltText")) or None,
        )

    def _map_product_location(self, row: dict[str, object]) -> ProductLocation | None:
        location = row.get("location") if isinstance(row.get("location"), dict) else {}
        location_row = location if isinstance(location, dict) else {}

        region_name = self._text(
            location_row.get("regionName")
            or location_row.get("region_name")
            or row.get("regionName")
        )
        area_zone = self._text(location_row.get("areaZone") or row.get("areaZone"))
        shelf_rack_bay = self._text(
            location_row.get("shelfRackBay")
            or location_row.get("shelf")
            or row.get("shelfRackBay")
        )
        row_level = self._text(location_row.get("rowLevel") or row.get("rowLevel"))
        bin_position = self._text(location_row.get("binPosition") or row.get("binPosition"))
        location_code = self._text(
            location_row.get("locationCode")
            or row.get("locationCode")
            or row.get("shelfLocation")
        )
        location_note = self._text(location_row.get("locationNote") or row.get("locationNote"))
        pin_x = self._percent(location_row.get("pinX") or row.get("pinX"))
        pin_y = self._percent(location_row.get("pinY") or row.get("pinY"))

        if not any(
            (
                region_name,
                area_zone,
                shelf_rack_bay,
                row_level,
                bin_position,
                location_code,
                location_note,
                pin_x is not None,
                pin_y is not None,
            )
        ):
            return None

        return ProductLocation(
            regionName=region_name or None,
            areaZone=area_zone or None,
            shelfRackBay=shelf_rack_bay or None,
            rowLevel=row_level or None,
            binPosition=bin_position or None,
            locationCode=location_code or None,
            locationNote=location_note or None,
            pinX=pin_x,
            pinY=pin_y,
        )

    def _map_product(self, row: dict[str, object]) -> Product | None:
        product_id = self._text(row.get("id") or row.get("productId"))
        branch_id = self._text(row.get("branchCode") or row.get("branch_id") or row.get("branchId"))
        name = self._text(row.get("name"))
        if not product_id or not branch_id or not name:
            return None
        image_rows = row.get("images") if isinstance(row.get("images"), list) else []
        images = tuple(
            image
            for image in (
                self._map_image(item)
                for item in image_rows
                if isinstance(item, dict)
            )
            if image is not None
        )
        aliases = row.get("aliases")
        safe_aliases = tuple(
            self._text(alias)
            for alias in aliases
            if self._text(alias)
        ) if isinstance(aliases, list) else ()
        summary = row.get("productSummary")
        return Product(
            id=product_id,
            name=name,
            aliases=safe_aliases,
            branch_id=branch_id,
            price=self._float_or_none(row.get("price")),
            stock=self._int_or_none(row.get("stock")),
            shelf_location=self._display_location(row.get("shelfLocation")) or None,
            source=self._text(row.get("source")) or "vitaflow_erp",
            productSummary=summary if isinstance(summary, dict) else None,
            barcode=self._text(row.get("barcode")) or None,
            imageUrl=self._asset_url(row.get("imageUrl")),
            thumbnailUrl=self._asset_url(row.get("thumbnailUrl")),
            images=images,
            location=self._map_product_location(row),
            kiosk_category=(
                self._text(row.get("kioskCategory") or row.get("category")) or None
            ),
        )

    def _map_shelf_map_region(self, row: dict[str, object]) -> ShelfMapRegion | None:
        if row.get("isVisible") is False:
            return None
        region_id = self._text(row.get("id") or row.get("regionId") or row.get("code"))
        name = self._text(row.get("name") or row.get("regionName") or row.get("label"))
        x = self._percent(row.get("x") or row.get("left") or row.get("pinX"))
        y = self._percent(row.get("y") or row.get("top") or row.get("pinY"))
        width = self._percent(row.get("width") or row.get("w"))
        height = self._percent(row.get("height") or row.get("h"))
        if not region_id and name:
            region_id = name.casefold().replace(" ", "-")
        if not region_id or not name:
            return None
        safe_width = min(max(width if width is not None else 10, 2), 100)
        safe_height = min(max(height if height is not None else 10, 2), 100)
        safe_x = min(
            max(x if x is not None else safe_width / 2, safe_width / 2),
            100 - safe_width / 2,
        )
        safe_y = min(
            max(y if y is not None else safe_height / 2, safe_height / 2),
            100 - safe_height / 2,
        )
        shape = self._text(row.get("shape")).casefold()
        if shape not in {"rounded", "square", "pill"}:
            shape = "rounded"
        return ShelfMapRegion(
            id=region_id,
            name=name,
            type=self._text(row.get("type") or row.get("regionType")) or "region",
            x=safe_x,
            y=safe_y,
            width=safe_width,
            height=safe_height,
            label=self._text(row.get("label") or row.get("displayLabel")) or None,
            color=self._text(row.get("color") or row.get("regionColor")) or None,
            shape=shape,
            rotation=self._float_or_none(row.get("rotation")) or 0,
            z_index=self._int_or_none(row.get("zIndex") or row.get("z_index")) or 0,
            layer_kind=self._text(row.get("layerKind") or row.get("layer_kind")) or None,
        )

    def _map_shelf_map(self, data: dict[str, object] | list[object] | None, branch_id: str) -> BranchShelfMap | None:
        if not isinstance(data, dict):
            return None
        row = data.get("map") if isinstance(data.get("map"), dict) else data
        if not isinstance(row, dict):
            return None
        raw_regions = (
            row.get("regions")
            or row.get("mapRegions")
            or row.get("branchMapRegions")
            or data.get("regions")
            or []
        )
        regions = tuple(
            region
            for region in (
                self._map_shelf_map_region(item)
                for item in raw_regions
                if isinstance(item, dict)
            )
            if region is not None
        ) if isinstance(raw_regions, list) else ()
        entrance_row = row.get("entrance") if isinstance(row.get("entrance"), dict) else {}
        entrance_x = self._percent(
            entrance_row.get("x") if isinstance(entrance_row, dict) else row.get("entranceX")
        )
        entrance_y = self._percent(
            entrance_row.get("y") if isinstance(entrance_row, dict) else row.get("entranceY")
        )
        entrance: ShelfMapPoint | None = None
        if entrance_x is not None and entrance_y is not None:
            entrance = ShelfMapPoint(
                x=entrance_x,
                y=entrance_y,
                label=self._text(
                    entrance_row.get("label") if isinstance(entrance_row, dict) else row.get("entranceLabel")
                )
                or "Entrance",
            )
        else:
            entrance_region = next(
                (
                    region
                    for region in regions
                    if region.name.strip().casefold() == "main entrance"
                ),
                None,
            )
            if entrance_region is not None:
                entrance = ShelfMapPoint(
                    x=entrance_region.x,
                    y=entrance_region.y,
                    label=entrance_region.name,
                )
        map_id = self._text(row.get("id") or row.get("mapId") or row.get("code"))
        return BranchShelfMap(
            branch_id=self._text(row.get("branchCode") or row.get("branchId")) or branch_id,
            map_id=map_id or f"{branch_id}-map",
            name=self._text(row.get("name") or row.get("title")) or f"{branch_id} pharmacy map",
            source="vitaflow_erp",
            image_url=self._text(
                row.get("imageUrl")
                or row.get("mapImageUrl")
                or row.get("referenceImageUrl")
                or row.get("posterImagePath")
            )
            and self._asset_url(
                row.get("imageUrl")
                or row.get("mapImageUrl")
                or row.get("referenceImageUrl")
                or row.get("posterImagePath")
            ),
            entrance=entrance,
            regions=regions,
        )

    def _map_products_response(self, data: dict[str, object] | list[object] | None) -> list[Product]:
        if isinstance(data, dict):
            raw_items = data.get("items", [])
        else:
            raw_items = data or []
        if not isinstance(raw_items, list):
            return []
        products: list[Product] = []
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            product = self._map_product(item)
            if product is not None:
                products.append(product)
        return products

    def search_products(self, query: str, branch_id: str) -> list[Product]:
        if not query.strip() or not branch_id.strip():
            return []
        data = self._request(
            "GET",
            "/api/vitakiosk/catalog/products/search",
            params={"branchCode": branch_id, "q": query, "limit": 5},
        )
        products = self._map_products_response(data)
        for product in products:
            self._remember_verified_product(product)
        return products

    def search_product_candidates(
        self,
        query: str,
        branch_id: str,
        *,
        limit: int = 5,
    ) -> list[ProductSearchResult]:
        products = self.search_products(query, branch_id)[: max(0, limit)]
        candidates: list[ProductSearchResult] = []
        for product in products:
            best = max(
                (
                    scored
                    for field, value in _candidate_values(product)
                    if (scored := _score_candidate(query, field, value)) is not None
                ),
                default=None,
                key=lambda item: item[0],
            )
            confidence, reason, matched_text = best or (0.9, "erp_search_match", query.strip())
            candidates.append(
                ProductSearchResult(
                    product=product,
                    confidence=confidence,
                    match_reason=reason,
                    matched_text=matched_text,
                )
            )
        return candidates

    def get_product(self, product_id: str, branch_id: str) -> Product | None:
        if not product_id.strip() or not branch_id.strip():
            return None
        data = self._request(
            "GET",
            f"/api/vitakiosk/catalog/products/{product_id}",
            params={"branchCode": branch_id},
        )
        product = self._map_product(data) if isinstance(data, dict) else None
        if product is not None:
            self._remember_verified_product(product)
            return product
        return self._verified_products.get((branch_id.casefold(), product_id))

    def get_product_by_barcode(self, barcode: str, branch_id: str) -> Product | None:
        normalized_barcode = barcode.strip()
        if not normalized_barcode or not branch_id.strip():
            return None
        products = self.search_products(normalized_barcode, branch_id)
        return next(
            (
                product
                for product in products
                if product.barcode == normalized_barcode or product.id == normalized_barcode
            ),
            products[0] if products else None,
        )

    def get_shelf_map(self, branch_id: str) -> BranchShelfMap | None:
        if not branch_id.strip():
            return None
        data = self._request(
            "GET",
            "/api/vitakiosk/catalog/shelf-map",
            params={"branchCode": branch_id},
        )
        return self._map_shelf_map(data, branch_id)

    def match_promotions(self, product_id: str, branch_id: str) -> list[Promotion]:
        data = self._request(
            "GET",
            "/api/vitakiosk/catalog/promotions",
            params={"branchCode": branch_id},
        )
        raw_items = data.get("items", []) if isinstance(data, dict) else []
        promotions: list[Promotion] = []
        for row in (raw_items if isinstance(raw_items, list) else []):
            if not isinstance(row, dict):
                continue
            product_ids = tuple(self._text(item) for item in row.get("productIds", []) if self._text(item)) if isinstance(row.get("productIds"), list) else ()
            if product_id and product_id not in product_ids:
                continue
            promotions.append(
                Promotion(
                    id=self._text(row.get("id")),
                    title=self._text(row.get("title")),
                    branch_id=self._text(row.get("branchCode") or row.get("branchId")) or branch_id,
                    product_ids=product_ids,
                    active=bool(row.get("active", True)),
                    valid_from=self._datetime(row.get("validFrom")),
                    valid_to=self._datetime(row.get("validTo")),
                    source="vitaflow_erp",
                )
            )
        return promotions

    def eligible_leaflets(self, branch_id: str, kind: LeafletKind | None = None) -> list[Leaflet]:
        kinds = (kind,) if kind else (LeafletKind.PROMOTION, LeafletKind.CAMPAIGN)
        leaflets: list[Leaflet] = []
        for item_kind in kinds:
            path = "/api/vitakiosk/catalog/promotions" if item_kind is LeafletKind.PROMOTION else "/api/vitakiosk/catalog/campaigns"
            data = self._request("GET", path, params={"branchCode": branch_id})
            raw_items = data.get("items", []) if isinstance(data, dict) else []
            for row in (raw_items if isinstance(raw_items, list) else []):
                if not isinstance(row, dict):
                    continue
                product_ids = tuple(self._text(item) for item in row.get("productIds", []) if self._text(item)) if isinstance(row.get("productIds"), list) else ()
                leaflets.append(
                    Leaflet(
                        id=self._text(row.get("id")),
                        kind=item_kind,
                        title=self._text(row.get("title")),
                        description=self._text(row.get("description")),
                        branch_id=self._text(row.get("branchCode") or row.get("branchId")) or branch_id,
                        active=bool(row.get("active", True)),
                        valid_from=self._datetime(row.get("validFrom")),
                        valid_to=self._datetime(row.get("validTo")),
                        image_url=self._asset_url(row.get("posterImageUrl") or row.get("imageUrl")) or "",
                        product_ids=product_ids,
                        category_tags=(),
                        source="vitaflow_erp",
                    )
                )
        return leaflets

    def create_pharmacist_query(
        self,
        reason: str,
        branch_id: str,
        *,
        session_id: str | None = None,
    ) -> dict[str, object] | None:
        safe_reason = " ".join(reason.split()) or "pharmacist assistance requested"
        data = self._request(
            "POST",
            "/api/vitakiosk/queries",
            json_body={
                "branchCode": branch_id,
                "sourceSessionId": session_id,
                "problemHeadline": "Pharmacist assistance requested",
                "problemStatement": f"Kiosk requested pharmacist assistance: {safe_reason}",
                "symptoms": [safe_reason],
                "priority": "High",
                "source": "VitaKiosk",
            },
        )
        return data if isinstance(data, dict) else None

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
    ) -> dict[str, object] | None:
        data = self._request(
            "POST",
            "/api/vitakiosk/purchasing-miss",
            json_body={
                "branchCode": branch_id,
                "sourceSessionId": source_session_id,
                "requestSource": request_source,
                "rawQuery": raw_query,
                "normalizedQuery": normalized_query,
                "barcode": barcode,
                "ocrText": ocr_text,
                "correctedText": corrected_text,
            },
        )
        return data if isinstance(data, dict) else None
