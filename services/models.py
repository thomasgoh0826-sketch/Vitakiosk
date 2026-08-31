from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


@dataclass(frozen=True)
class ProductImage:
    url: str
    type: str
    isPrimary: bool = False
    alt: str | None = None


@dataclass(frozen=True)
class ProductLocation:
    regionName: str | None = None
    areaZone: str | None = None
    shelfRackBay: str | None = None
    rowLevel: str | None = None
    binPosition: str | None = None
    locationCode: str | None = None
    locationNote: str | None = None
    pinX: float | None = None
    pinY: float | None = None


@dataclass(frozen=True)
class Product:
    id: str
    name: str
    aliases: tuple[str, ...]
    branch_id: str
    price: float | None
    stock: int | None
    shelf_location: str | None
    source: str = "mock_vitaflow"
    unavailable_reason: str | None = None
    productSummary: dict[str, dict[str, str]] | None = None
    barcode: str | None = None
    imageUrl: str | None = None
    thumbnailUrl: str | None = None
    images: tuple[ProductImage, ...] = ()
    location: ProductLocation | None = None
    kiosk_category: str | None = None


@dataclass(frozen=True)
class ShelfMapPoint:
    x: float
    y: float
    label: str = ""


@dataclass(frozen=True)
class ShelfMapRegion:
    id: str
    name: str
    type: str = "region"
    x: float = 0
    y: float = 0
    width: float = 10
    height: float = 10
    label: str | None = None
    color: str | None = None
    shape: str = "rounded"
    rotation: float = 0
    z_index: int = 0
    layer_kind: str | None = None


@dataclass(frozen=True)
class BranchShelfMap:
    branch_id: str
    map_id: str
    name: str
    source: str
    image_url: str | None = None
    entrance: ShelfMapPoint | None = None
    regions: tuple[ShelfMapRegion, ...] = ()
    unavailable_reason: str | None = None


@dataclass(frozen=True)
class ProductSearchResult:
    product: Product
    confidence: float
    match_reason: str
    matched_text: str


@dataclass(frozen=True)
class ProductScanSignals:
    barcode: str | None = None
    imageSimilarity: bool = False
    ocr: bool = False


@dataclass(frozen=True)
class ProductScanCandidate:
    product: Product
    confidence: float
    matchReason: str
    matchedText: str | None = None


@dataclass(frozen=True)
class ProductScanResult:
    ok: bool
    provider: str
    scanSignals: ProductScanSignals
    candidates: tuple[ProductScanCandidate, ...] = ()
    requiresConfirmation: bool = False
    message: str = ""
    barcodeResult: str | None = None
    ocrText: str | None = None
    correctedText: str | None = None
    purchasingQueryId: str | None = None
    purchasingRequestStatus: str | None = None


@dataclass(frozen=True)
class Promotion:
    id: str
    title: str
    branch_id: str
    product_ids: tuple[str, ...]
    active: bool
    valid_from: datetime
    valid_to: datetime
    source: str = "mock_vitaflow"


class LeafletKind(str, Enum):
    PROMOTION = "promotion"
    CAMPAIGN = "campaign"


@dataclass(frozen=True)
class Leaflet:
    id: str
    kind: LeafletKind
    title: str
    description: str
    branch_id: str
    active: bool
    valid_from: datetime
    valid_to: datetime
    image_url: str
    product_ids: tuple[str, ...]
    category_tags: tuple[str, ...]
    display_priority: int = 100
    source: str = "mock_vitaflow"


class UiActionType(str, Enum):
    SHOW_PRODUCT = "SHOW_PRODUCT"
    HIGHLIGHT_PRODUCT = "HIGHLIGHT_PRODUCT"
    OPEN_PRODUCT_DETAIL = "OPEN_PRODUCT_DETAIL"
    OPEN_PRODUCT_SUMMARY = "OPEN_PRODUCT_SUMMARY"
    SHOW_PROMOTION_LEAFLET = "SHOW_PROMOTION_LEAFLET"
    HIGHLIGHT_PROMOTION = "HIGHLIGHT_PROMOTION"
    OPEN_PROMOTION_MODAL = "OPEN_PROMOTION_MODAL"
    SHOW_CAMPAIGN_LEAFLET = "SHOW_CAMPAIGN_LEAFLET"
    OPEN_CAMPAIGN_MODAL = "OPEN_CAMPAIGN_MODAL"
    SHOW_PROMOTION_GALLERY = "SHOW_PROMOTION_GALLERY"
    SHOW_CAMPAIGN_GALLERY = "SHOW_CAMPAIGN_GALLERY"
    HIGHLIGHT_SHELF_ROUTE = "HIGHLIGHT_SHELF_ROUTE"
    OPEN_SHELF_MAP = "OPEN_SHELF_MAP"
    OPEN_PRODUCT_SCAN = "OPEN_PRODUCT_SCAN"
    START_PRODUCT_SCAN = "START_PRODUCT_SCAN"
    ASK_PHARMACIST_CONFIRMATION = "ASK_PHARMACIST_CONFIRMATION"
    REQUEST_PHARMACIST_ASSISTANCE = "REQUEST_PHARMACIST_ASSISTANCE"
    CLOSE_ACTIVE_OVERLAY = "CLOSE_ACTIVE_OVERLAY"
    RESET_KIOSK = "RESET_KIOSK"


@dataclass(frozen=True)
class UiAction:
    type: UiActionType
    productId: str | None = None
    promotionId: str | None = None
    campaignId: str | None = None
    shelf: str | None = None
    reason: str | None = None


@dataclass(frozen=True)
class Poster:
    id: str
    title: str
    branch_id: str
    promotion_id: str
    asset_path: str
    source: str = "mock_vitaflow"


@dataclass(frozen=True)
class SafetyDecision:
    allowed: bool
    requires_pharmacist: bool
    reason_code: str | None = None


@dataclass(frozen=True)
class PurchasingQuery:
    id: str
    query: str
    branch_id: str
    status: str = "open"
    source: str = "mock_memory"


@dataclass(frozen=True)
class Escalation:
    id: str
    reason: str
    branch_id: str
    status: str = "waiting_for_pharmacist"
    source: str = "mock_memory"


@dataclass(frozen=True)
class TranscriptionResult:
    transcript: str
    provider: str
    language: str = "unknown"
    confidence: float | None = None
    clarification_needed: bool = False
    corrected_transcript: str | None = None
    detected_terms: tuple[str, ...] = ()
    possible_product_matches: tuple[dict[str, object], ...] = ()


class Intent(str, Enum):
    PRODUCT_SEARCH = "product_search"
    PRODUCT_COUNSELLING = "product_counselling"
    PRICE_CHECK = "price_check"
    STOCK_CHECK = "stock_check"
    PROMOTION_CHECK = "promotion_check"
    CAMPAIGN_CHECK = "campaign_check"
    SHELF_LOCATION = "shelf_location"
    GREETING = "greeting"
    GENERAL_CONVERSATION = "general_conversation"
    UNKNOWN_PRODUCT = "unknown_product"
    RED_FLAG = "red_flag"


@dataclass(frozen=True)
class AIResult:
    intent: Intent
    message: str
    requires_pharmacist: bool
    product: Product | None = None
    product_candidates: tuple[ProductSearchResult, ...] = ()
    promotions: tuple[Promotion, ...] = ()
    leaflets: tuple[Leaflet, ...] = ()
    ui_actions: tuple[UiAction, ...] = ()
    purchasing_query_id: str | None = None
    escalation_id: str | None = None
    safety_reason: str | None = None
    source: str = "mock_ai"
