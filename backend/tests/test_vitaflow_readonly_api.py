from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
import json
from datetime import timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import threading
from urllib.parse import parse_qs, urlparse

import pytest

from backend.app.config import Settings
from services.providers import create_provider_bundle
from services.models import LeafletKind
from services.vitaflow_api import ReadOnlyVitaFlowAPI


def test_vitaflow_date_only_values_are_normalized_to_utc() -> None:
    parsed = ReadOnlyVitaFlowAPI._datetime("2026-08-29")

    assert parsed.tzinfo is timezone.utc


class _FixtureServer(ThreadingHTTPServer):
    requests: list[dict[str, object]]


@contextmanager
def fixture_erp_server() -> Iterator[tuple[str, list[dict[str, object]]]]:
    requests: list[dict[str, object]] = []

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format: str, *args: object) -> None:
            del format, args

        def _send_json(self, status: int, payload: dict[str, object]) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            requests.append(
                {
                    "method": "GET",
                    "path": parsed.path,
                    "query": {key: values[-1] for key, values in query.items()},
                }
            )
            if parsed.path == "/api/vitakiosk/catalog/products/search":
                search_query = query.get("q", [""])[-1]
                if search_query not in {"relief balm", "9558800101"}:
                    self._send_json(200, {"ok": True, "data": {"items": []}})
                    return
                self._send_json(
                    200,
                    {
                        "ok": True,
                        "data": {
                            "items": [
                                {
                                    "id": "101",
                                    "name": "ERP Relief Balm",
                                    "category": "GENERAL",
                                    "kioskCategory": "VITAMIN",
                                    "aliases": ["relief balm"],
                                    "branchCode": "JK",
                                    "price": 18.5,
                                    "stock": 7,
                                    "shelfLocation": "JK-A1-R2-B3",
                                    "location": {
                                        "regionName": "Aisle 01",
                                        "pinX": 72,
                                        "pinY": 34,
                                        "locationCode": "JK-A1-R2-B3",
                                    },
                                    "barcode": "9558800101",
                                    "imageUrl": "/api/product-images/relief.png",
                                    "thumbnailUrl": "/api/product-images/relief-thumb.png",
                                    "images": [
                                        {
                                            "url": "/api/product-images/relief.png",
                                            "type": "main",
                                            "isPrimary": True,
                                            "alt": "Relief pack",
                                        }
                                    ],
                                    "productSummary": {
                                        "ingredient": {"en": "ERP menthol"},
                                        "howToUse": {"en": "Follow ERP label"},
                                        "bestFor": {"en": "ERP suitable use"},
                                        "size": {"en": "30g"},
                                        "description": {"en": "ERP description"},
                                    },
                                    "source": "vitaflow_erp",
                                }
                            ]
                        },
                    },
                )
                return
            if parsed.path == "/api/vitakiosk/catalog/products/101":
                self._send_json(
                    200,
                    {
                        "ok": True,
                        "data": {
                            "id": "101",
                            "name": "ERP Relief Balm",
                            "aliases": ["relief balm"],
                            "branchCode": "JK",
                            "price": 18.5,
                            "stock": 7,
                            "shelfLocation": "JK-A1-R2-B3",
                            "location": {
                                "regionName": "Aisle 01",
                                "areaZone": "Pain relief",
                                "shelfRackBay": "A1-R2",
                                "rowLevel": "B3",
                                "binPosition": "Front",
                                "locationCode": "JK-A1-R2-B3",
                                "locationNote": "ERP pin near aisle 01.",
                                "pinX": 72,
                                "pinY": 34,
                            },
                            "barcode": "9558800101",
                            "imageUrl": "/api/product-images/relief.png",
                            "thumbnailUrl": "/api/product-images/relief-thumb.png",
                            "images": [],
                            "productSummary": {
                                "ingredient": {"en": "ERP menthol"},
                                "howToUse": {"en": "Follow ERP label"},
                                "bestFor": {"en": "ERP suitable use"},
                                "size": {"en": "30g"},
                                "description": {"en": "ERP description"},
                            },
                            "source": "vitaflow_erp",
                        },
                    },
                )
                return
            if parsed.path == "/api/vitakiosk/catalog/shelf-map":
                self._send_json(
                    200,
                    {
                        "ok": True,
                        "data": {
                            "id": "MAP-JK-001",
                            "branchCode": "JK",
                            "name": "Johor kiosk branch map",
                            "mapImageUrl": "/maps/jk.svg",
                            "entrance": {"x": 6, "y": 88, "label": "Main entrance"},
                            "regions": [
                                {
                                    "id": "REG-A1",
                                    "name": "Aisle 01",
                                    "type": "aisle",
                                    "x": 64,
                                    "y": 20,
                                    "width": 16,
                                    "height": 42,
                                    "label": "A1",
                                },
                                {
                                    "id": "PHARM",
                                    "name": "Pharmacist",
                                    "type": "counter",
                                    "x": 78,
                                    "y": 82,
                                    "width": 18,
                                    "height": 7,
                                },
                            ],
                        },
                    },
                )
                return
            self._send_json(404, {"ok": False, "error": "not_found"})

        def do_POST(self) -> None:
            parsed = urlparse(self.path)
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            requests.append({"method": "POST", "path": parsed.path, "json": payload})
            if parsed.path == "/api/vitakiosk/queries":
                self._send_json(
                    201,
                    {
                        "ok": True,
                        "data": {
                            "id": 44,
                            "caseCode": "VK-20260630-0001",
                            "branchCode": payload.get("branchCode"),
                            "status": "New",
                        },
                    },
                )
                return
            if parsed.path == "/api/vitakiosk/purchasing-miss":
                request_id = "PRQ-0008" if payload.get("requestSource") == "ocr_scan" else "PRQ-0007"
                self._send_json(
                    201,
                    {
                        "ok": True,
                        "data": {
                            "requestId": request_id,
                            "purchasingQueryId": 7,
                            "status": "created",
                            "deduplicated": False,
                            "source": "VitaKiosk",
                            "requestSource": payload.get("requestSource"),
                            "message": f"Item not found. Purchase request sent to branch purchasing: {request_id}.",
                        },
                    },
                )
                return
            self._send_json(404, {"ok": False, "error": "not_found"})

    server = _FixtureServer(("127.0.0.1", 0), Handler)
    server.requests = requests
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
      yield f"http://127.0.0.1:{server.server_port}", requests
    finally:
      server.shutdown()
      server.server_close()


def test_readonly_api_maps_product_search_and_detail_from_erp() -> None:
    with fixture_erp_server() as (base_url, requests):
        adapter = ReadOnlyVitaFlowAPI(base_url=base_url)

        products = adapter.search_products("relief balm", "JK")
        detail = adapter.get_product("101", "JK")

    assert len(products) == 1
    product = products[0]
    assert product.id == "101"
    assert product.name == "ERP Relief Balm"
    assert product.branch_id == "JK"
    assert product.price == 18.5
    assert product.stock == 7
    assert product.shelf_location == "JK-A1-R2-B3"
    assert product.location is not None
    assert product.location.regionName == "Aisle 01"
    assert product.location.pinX == 72
    assert product.location.pinY == 34
    assert product.source == "vitaflow_erp"
    assert product.productSummary["ingredient"]["en"] == "ERP menthol"
    assert product.imageUrl == "/api/vitaflow-assets/api/product-images/relief.png"
    assert product.thumbnailUrl == "/api/vitaflow-assets/api/product-images/relief-thumb.png"
    assert product.images[0].url == "/api/vitaflow-assets/api/product-images/relief.png"
    assert detail is not None
    assert detail.id == "101"
    assert requests[0]["path"] == "/api/vitakiosk/catalog/products/search"
    assert requests[0]["query"] == {"branchCode": "JK", "q": "relief balm", "limit": "5"}
    assert requests[1]["path"] == "/api/vitakiosk/catalog/products/101"
    assert requests[1]["query"] == {"branchCode": "JK"}


def test_readonly_api_maps_kiosk_category_from_kiosk_visible_product() -> None:
    with fixture_erp_server() as (base_url, requests):
        adapter = ReadOnlyVitaFlowAPI(base_url=base_url)
        products = adapter.search_products("relief balm", "JK")

    assert products[0].kiosk_category == "VITAMIN"
    assert requests[0]["path"] == "/api/vitakiosk/catalog/products/search"
    assert all("inventory" not in str(request["path"]) for request in requests)


def test_readonly_api_reuses_authoritative_search_product_for_scan_followup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    adapter = ReadOnlyVitaFlowAPI(base_url="http://vitaflow.invalid")
    request_paths: list[str] = []

    def fake_request(method: str, path: str, **kwargs: object) -> dict[str, object] | None:
        del method, kwargs
        request_paths.append(path)
        if path.endswith("/search"):
            return {
                "items": [
                    {
                        "id": "17097",
                        "name": "AXE BRAND MEDICATED OIL 10ML (CAP KAPAK)",
                        "branchCode": "JK",
                        "retailPrice": 6,
                        "availableQty": 0,
                        "kioskCategory": "NON-PRESCRIPTION MEDICINE",
                    }
                ]
            }
        return None

    monkeypatch.setattr(adapter, "_request", fake_request)

    scanned_products = adapter.search_products("Axe Brand Medicated Oil", "JK")
    followup_product = adapter.get_product("17097", "JK")

    assert scanned_products[0].id == "17097"
    assert followup_product is not None
    assert followup_product.id == "17097"
    assert followup_product.source == "vitaflow_erp"
    assert request_paths == [
        "/api/vitakiosk/catalog/products/search",
        "/api/vitakiosk/catalog/products/17097",
    ]


def test_readonly_api_prefers_dedicated_leaflet_artwork_over_product_image(monkeypatch: pytest.MonkeyPatch) -> None:
    adapter = ReadOnlyVitaFlowAPI(base_url="http://vitaflow.invalid")

    monkeypatch.setattr(
        adapter,
        "_request",
        lambda method, path, **kwargs: {
            "items": [
                {
                    "id": "2",
                    "title": "Fisherman's Friend Lemon · 2 for RM8",
                    "description": "Buy 2 packs for RM8 while stocks last.",
                    "branchCode": "JK",
                    "productIds": ["314"],
                    "active": True,
                    "validFrom": "2026-08-29",
                    "validTo": "2026-09-30",
                    "imageUrl": "/api/product-images/fisherman.webp",
                    "posterImageUrl": "/api/reminder-images/promotion-2.png",
                }
            ]
        },
    )

    leaflets = adapter.eligible_leaflets("JK", LeafletKind.PROMOTION)

    assert leaflets[0].image_url == "/api/vitaflow-assets/api/reminder-images/promotion-2.png"


def test_readonly_api_collapses_duplicate_leading_shelf_label() -> None:
    adapter = ReadOnlyVitaFlowAPI(base_url="http://127.0.0.1:3100")

    product = adapter._map_product(
        {
            "id": "5042",
            "name": "BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
            "branchCode": "JK",
            "shelfLocation": "Shelf Shelf Island C R3 B1",
            "source": "vitaflow_erp",
        }
    )

    assert product is not None
    assert product.shelf_location == "Shelf Island C R3 B1"


def test_readonly_api_maps_branch_shelf_map_from_erp() -> None:
    with fixture_erp_server() as (base_url, requests):
        adapter = ReadOnlyVitaFlowAPI(base_url=base_url)

        shelf_map = adapter.get_shelf_map("JK")

    assert shelf_map is not None
    assert shelf_map.map_id == "MAP-JK-001"
    assert shelf_map.branch_id == "JK"
    assert shelf_map.name == "Johor kiosk branch map"
    assert shelf_map.image_url == "/api/vitaflow-assets/maps/jk.svg"
    assert shelf_map.entrance is not None
    assert shelf_map.entrance.x == 6
    assert shelf_map.entrance.y == 88
    assert shelf_map.regions[0].id == "REG-A1"
    assert shelf_map.regions[0].name == "Aisle 01"
    assert shelf_map.regions[0].x == 64
    shelf_map_request = next(
        request for request in requests if request["path"] == "/api/vitakiosk/catalog/shelf-map"
    )
    assert shelf_map_request["query"] == {"branchCode": "JK"}


def test_readonly_api_normalizes_center_regions_and_preserves_visual_metadata() -> None:
    adapter = ReadOnlyVitaFlowAPI(base_url="http://vitaflow.invalid")

    shelf_map = adapter._map_shelf_map(
        {
            "map": {
                "id": "MAP-JK-LIVE",
                "branchCode": "JK",
                "regions": [
                    {
                        "id": "SHELF-A",
                        "regionName": "Shelf Island A",
                        "regionType": "Shelf",
                        "x": 65.01,
                        "y": 25.01,
                        "width": 46.73,
                        "height": 7.85,
                        "color": "#587ca8",
                        "shape": "pill",
                        "rotation": 4,
                        "zIndex": 7,
                        "layerKind": "fixture",
                        "isVisible": True,
                    },
                    {
                        "id": "PROMO-C",
                        "regionName": "Promo Display C",
                        "regionType": "Promo Display",
                        "x": 55.98,
                        "y": 86.52,
                        "width": 59.21,
                        "height": 20,
                        "isVisible": True,
                    },
                    {
                        "id": "HIDDEN",
                        "regionName": "Hidden shelf",
                        "regionType": "Shelf",
                        "x": 5,
                        "y": 65,
                        "width": 20,
                        "height": 20,
                        "isVisible": False,
                    },
                ],
            }
        },
        "JK",
    )

    assert shelf_map is not None
    assert [region.id for region in shelf_map.regions] == ["SHELF-A", "PROMO-C"]
    shelf = shelf_map.regions[0]
    promo = shelf_map.regions[1]
    assert (shelf.x, shelf.y, shelf.width, shelf.height) == (65.01, 25.01, 46.73, 7.85)
    assert (shelf.color, shelf.shape, shelf.rotation, shelf.z_index, shelf.layer_kind) == (
        "#587ca8",
        "pill",
        4,
        7,
        "fixture",
    )
    assert (promo.x, promo.y, promo.width, promo.height) == (55.98, 86.52, 59.21, 20)


def test_readonly_api_clamps_region_center_without_truncating_full_extent() -> None:
    adapter = ReadOnlyVitaFlowAPI(base_url="http://vitaflow.invalid")

    shelf_map = adapter._map_shelf_map(
        {
            "map": {
                "id": "MAP-JK-LIVE",
                "branchCode": "JK",
                "regions": [
                    {
                        "id": "EDGE-SHELF",
                        "regionName": "Edge Shelf",
                        "regionType": "Shelf",
                        "x": 99,
                        "y": 1,
                        "width": 20,
                        "height": 10,
                        "isVisible": True,
                    }
                ],
            }
        },
        "JK",
    )

    assert shelf_map is not None
    region = shelf_map.regions[0]
    assert (region.x, region.y, region.width, region.height) == (90, 5, 20, 10)


def test_readonly_api_uses_main_entrance_region_when_explicit_point_is_missing() -> None:
    adapter = ReadOnlyVitaFlowAPI(base_url="http://vitaflow.invalid")

    shelf_map = adapter._map_shelf_map(
        {
            "map": {
                "id": "MAP-JK-LIVE",
                "branchCode": "JK",
                "regions": [
                    {
                        "id": "MAIN-ENTRANCE",
                        "regionName": "Main Entrance",
                        "regionType": "Entrance",
                        "x": 21,
                        "y": 91,
                        "width": 18,
                        "height": 6,
                        "isVisible": True,
                    }
                ],
            }
        },
        "JK",
    )

    assert shelf_map is not None
    assert shelf_map.entrance is not None
    assert (shelf_map.entrance.x, shelf_map.entrance.y, shelf_map.entrance.label) == (
        21,
        91,
        "Main Entrance",
    )


def test_readonly_api_does_not_fabricate_entrance_when_erp_has_none() -> None:
    adapter = ReadOnlyVitaFlowAPI(base_url="http://vitaflow.invalid")

    shelf_map = adapter._map_shelf_map(
        {
            "map": {
                "id": "MAP-JK-LIVE",
                "branchCode": "JK",
                "regions": [],
            }
        },
        "JK",
    )

    assert shelf_map is not None
    assert shelf_map.entrance is None


def test_readonly_api_offline_returns_unavailable_instead_of_fake_facts() -> None:
    adapter = ReadOnlyVitaFlowAPI(base_url="http://127.0.0.1:9")

    assert adapter.search_products("relief balm", "JK") == []
    assert adapter.search_product_candidates("relief balm", "JK") == []
    assert adapter.get_product("101", "JK") is None
    assert adapter.get_product_by_barcode("9558800101", "JK") is None
    assert adapter.get_shelf_map("JK") is None


def test_readonly_provider_escalation_store_remains_local_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("VITAKIOSK_PROVIDER_MODE", "mock")
    monkeypatch.setenv("VITAFLOW_PROVIDER", "readonly_api")
    with fixture_erp_server() as (base_url, requests):
        monkeypatch.setenv("VITAFLOW_API_BASE_URL", base_url)
        bundle = create_provider_bundle(Settings.from_environment())

        escalation = bundle.escalation_store.create(
            "pregnancy_or_red_flag",
            "JK",
            session_id="session-red",
        )

    assert escalation.id == "ESC-0001"
    assert escalation.status == "waiting_for_pharmacist"
    assert escalation.source == "mock_memory"
    assert [request for request in requests if request["method"] == "POST"] == []


def test_explicit_vitaflow_assistance_provider_creates_erp_case(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("VITAKIOSK_PROVIDER_MODE", "mock")
    monkeypatch.setenv("VITAFLOW_PROVIDER", "readonly_api")
    monkeypatch.setenv("VITAFLOW_ASSISTANCE_PROVIDER", "vitaflow_api")
    with fixture_erp_server() as (base_url, requests):
        monkeypatch.setenv("VITAFLOW_API_BASE_URL", base_url)
        bundle = create_provider_bundle(Settings.from_environment())

        escalation = bundle.escalation_store.create(
            "customer requested assistance",
            "JK",
            session_id="session-live",
        )

    assert escalation.id == "VK-20260630-0001"
    assert escalation.status == "New"
    assert escalation.source == "vitaflow_erp"
    posts = [request for request in requests if request["method"] == "POST"]
    assert posts == [
        {
            "method": "POST",
            "path": "/api/vitakiosk/queries",
            "json": {
                "branchCode": "JK",
                "sourceSessionId": "session-live",
                "problemHeadline": "Pharmacist assistance requested",
                "problemStatement": "Kiosk requested pharmacist assistance: customer requested assistance",
                "symptoms": ["customer requested assistance"],
                "priority": "High",
                "source": "VitaKiosk",
            },
        }
    ]


def test_readonly_search_miss_creates_local_purchasing_query(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.app.routes import catalog

    with fixture_erp_server() as (base_url, requests):
        monkeypatch.setattr(catalog, "vitaflow", ReadOnlyVitaFlowAPI(base_url=base_url))

        response = client.get(
            "/api/products/search",
            params={"query": "Dragon Miracle Capsule", "branch_id": "JK"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == []
    assert payload["candidates"] == []
    assert payload["purchasing_query_id"].startswith("PQ-")
    assert payload["purchasing_request_status"] is None
    assert payload["message"] is None
    assert [request for request in requests if request["method"] == "POST"] == []


def test_readonly_scan_barcode_miss_does_not_write_erp() -> None:
    from services.product_vision import MockProductVision

    with fixture_erp_server() as (base_url, requests):
        adapter = ReadOnlyVitaFlowAPI(base_url=base_url)
        result = MockProductVision().scan_product(
            b"BARCODE:9559991234567",
            "image/png",
            "JK",
            "barcode_first",
            adapter,
        )

    assert result.candidates == ()
    assert result.purchasingQueryId is None
    assert result.purchasingRequestStatus is None
    assert result.message == "Product not found. Please try again or type the product name."
    assert [request for request in requests if request["method"] == "POST"] == []


def test_readonly_scan_ocr_miss_does_not_write_erp() -> None:
    from services.product_vision import MockProductVision

    with fixture_erp_server() as (base_url, requests):
        adapter = ReadOnlyVitaFlowAPI(base_url=base_url)
        result = MockProductVision().scan_product(
            b"OCR:Dragon Miracle Capsule",
            "image/png",
            "JK",
            "ocr_first",
            adapter,
        )

    assert result.candidates == ()
    assert result.purchasingQueryId is None
    assert result.purchasingRequestStatus is None
    assert result.ocrText == "Dragon Miracle Capsule"
    assert result.message == "Product not found. Please try again or type the product name."
    assert [request for request in requests if request["method"] == "POST"] == []


def test_scan_without_barcode_or_ocr_does_not_create_useless_request() -> None:
    from services.product_vision import MockProductVision

    with fixture_erp_server() as (base_url, requests):
        adapter = ReadOnlyVitaFlowAPI(base_url=base_url)
        result = MockProductVision().scan_product(
            b"IMAGE:unknown-product",
            "image/png",
            "JK",
            "auto",
            adapter,
        )

    assert result.candidates == ()
    assert result.purchasingQueryId is None
    assert result.message == "Item not recognized, please type item name."
    assert not any(
        request["method"] == "POST" and request["path"] == "/api/vitakiosk/purchasing-miss"
        for request in requests
    )
