from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


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


class Intent(str, Enum):
    PRODUCT_SEARCH = "product_search"
    PRODUCT_COUNSELLING = "product_counselling"
    PRICE_CHECK = "price_check"
    STOCK_CHECK = "stock_check"
    PROMOTION_CHECK = "promotion_check"
    SHELF_LOCATION = "shelf_location"
    UNKNOWN_PRODUCT = "unknown_product"
    RED_FLAG = "red_flag"


@dataclass(frozen=True)
class AIResult:
    intent: Intent
    message: str
    requires_pharmacist: bool
    product: Product | None = None
    promotions: tuple[Promotion, ...] = ()
    purchasing_query_id: str | None = None
    escalation_id: str | None = None
    safety_reason: str | None = None
    source: str = "mock_ai"
