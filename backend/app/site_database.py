from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from itertools import count
import os
import re
from typing import Any, Literal, Protocol
from uuid import uuid4

import httpx


SiteRecordKind = Literal["lead", "order", "booking", "project"]

MANUAL_NEXT_STEP = (
    "We will follow up by WhatsApp or email with the quote, schedule, "
    "and manual bank transfer or DuitNow instructions if payment is needed."
)
MANUAL_PAYMENT_NOTE = (
    "Online payment gateway is not enabled yet. Payment and onboarding "
    "are confirmed manually after discussion."
)

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")


def sanitize_text(value: str) -> str:
    return re.sub(r"\s+", " ", _CONTROL_CHARS.sub(" ", value)).strip()


def sanitize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    safe: dict[str, Any] = {}
    for key, value in payload.items():
        if isinstance(value, str):
            safe[key] = sanitize_text(value)[:1_000]
        else:
            safe[key] = value
    return safe


def product_type_for_payload(payload: dict[str, Any]) -> str:
    selected = str(payload.get("selectedPlan") or payload.get("selectedPackage") or "").lower()
    buyer_type = str(payload.get("buyerType") or payload.get("businessType") or "").lower()
    text = f"{selected} {buyer_type}"
    if "vitaflow" in text:
        return "vitaflow_erp"
    if "partner" in text or "clinic" in text:
        return "vitakiosk_partner_campaign"
    if "lesson" in text or "academy" in text or "training" in text:
        return "ai_lesson"
    if "website" in text or "studio" in text:
        return "ai_website"
    return "vitakiosk_local"


def reference_prefix(kind: SiteRecordKind) -> str:
    return {
        "lead": "VK-LEAD",
        "order": "VK-ORD",
        "booking": "VK-BOOK",
        "project": "VK-WEB",
    }[kind]


@dataclass
class SiteRecord:
    id: str
    kind: SiteRecordKind
    status: str
    payload: dict[str, Any]
    reference_id: str
    next_step: str = MANUAL_NEXT_STEP
    payment_note: str = MANUAL_PAYMENT_NOTE
    database_provider: str = "mock"
    created_at: str = field(
        default_factory=lambda: datetime.now(UTC).isoformat(timespec="seconds")
    )

    def to_response(self) -> dict[str, Any]:
        return {**asdict(self), "source": self.database_provider}


class SiteDatabaseProvider(Protocol):
    name: str

    def create(self, kind: SiteRecordKind, status: str, payload: dict[str, Any]) -> SiteRecord:
        ...

    def clear(self) -> None:
        ...


class MockSiteDatabaseProvider:
    name = "mock"

    def __init__(self) -> None:
        self._counter = count(1)
        self._records: dict[str, SiteRecord] = {}

    def _reference_code(self, kind: SiteRecordKind) -> str:
        year = datetime.now(UTC).year
        return f"{reference_prefix(kind)}-{year}-{next(self._counter):04d}"

    def create(self, kind: SiteRecordKind, status: str, payload: dict[str, Any]) -> SiteRecord:
        safe_payload = sanitize_payload(payload)
        record_id = str(uuid4())
        record = SiteRecord(
            id=record_id,
            kind=kind,
            status=status,
            payload=safe_payload,
            reference_id=self._reference_code(kind),
            database_provider=self.name,
        )
        self._records[record_id] = record
        return record

    def clear(self) -> None:
        self._records.clear()
        self._counter = count(1)


class SupabaseSiteDatabaseProvider:
    name = "supabase"

    def __init__(
        self,
        supabase_url: str,
        api_key: str,
        *,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.api_key = api_key
        self.http_client = http_client or httpx.Client(timeout=8)
        self._fallback_counter = count(1)

    def _reference_code(self, kind: SiteRecordKind) -> str:
        year = datetime.now(UTC).year
        return f"{reference_prefix(kind)}-{year}-{next(self._fallback_counter):04d}"

    def create(self, kind: SiteRecordKind, status: str, payload: dict[str, Any]) -> SiteRecord:
        safe_payload = sanitize_payload(payload)
        reference_code = self._reference_code(kind)
        table, row = self._row_for_record(kind, status, reference_code, safe_payload)
        response = self.http_client.post(
            f"{self.supabase_url}/rest/v1/{table}",
            headers={
                "apikey": self.api_key,
                "authorization": f"Bearer {self.api_key}",
                "content-type": "application/json",
                "prefer": "return=representation",
            },
            json=row,
        )
        response.raise_for_status()
        data = response.json()
        inserted = data[0] if isinstance(data, list) and data else row
        return SiteRecord(
            id=str(inserted.get("id") or uuid4()),
            kind=kind,
            status=str(inserted.get("status") or status),
            payload=safe_payload,
            reference_id=str(inserted.get("reference_code") or reference_code),
            database_provider=self.name,
        )

    def _row_for_record(
        self,
        kind: SiteRecordKind,
        status: str,
        reference_code: str,
        payload: dict[str, Any],
    ) -> tuple[str, dict[str, Any]]:
        if kind == "lead":
            return "site_leads", {
                "reference_code": reference_code,
                "name": payload.get("name") or payload.get("fullName") or payload.get("contactPerson"),
                "email": payload.get("email"),
                "phone": payload.get("phone"),
                "business_type": payload.get("businessType") or payload.get("interest"),
                "message": payload.get("message") or payload.get("notes"),
                "status": status,
            }
        if kind == "booking":
            return "site_bookings", {
                "reference_code": reference_code,
                "booking_type": "ai_lesson" if "lesson" in str(payload.get("topic", "")).lower() else "book_demo",
                "name": payload.get("name") or payload.get("fullName"),
                "email": payload.get("email"),
                "phone": payload.get("phone"),
                "topic": payload.get("topic"),
                "preferred_time": payload.get("preferredTime"),
                "participant_count": _int_or_none(payload.get("participants")),
                "mode": payload.get("format"),
                "notes": payload.get("notes"),
                "status": status,
                "manual_payment_status": "not_required",
            }
        if kind == "project":
            return "site_projects", {
                "reference_code": reference_code,
                "business_name": payload.get("businessName"),
                "industry": payload.get("industry"),
                "contact_name": payload.get("contactPerson"),
                "email": payload.get("email"),
                "phone": payload.get("phone"),
                "current_website": payload.get("currentWebsite"),
                "selected_package": payload.get("selectedPackage"),
                "preferred_timeline": payload.get("timeline"),
                "notes": payload.get("notes"),
                "status": status,
                "manual_payment_status": "not_required",
            }
        return "site_orders", {
            "reference_code": reference_code,
            "product_type": product_type_for_payload(payload),
            "customer_name": payload.get("contactPerson") or payload.get("name") or payload.get("fullName"),
            "company_name": payload.get("companyName") or payload.get("company"),
            "email": payload.get("email"),
            "phone": payload.get("phone"),
            "location": payload.get("location"),
            "selected_plan": payload.get("selectedPlan"),
            "estimated_users_locations": payload.get("branches") or payload.get("units"),
            "message": payload.get("notes") or payload.get("message"),
            "status": status,
            "manual_payment_status": "not_required",
        }

    def clear(self) -> None:
        self._fallback_counter = count(1)


def _int_or_none(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def create_site_database_provider() -> SiteDatabaseProvider:
    provider = (os.getenv("SITE_DATABASE_PROVIDER", "mock") or "mock").strip().lower()
    if provider != "supabase":
        return MockSiteDatabaseProvider()

    supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
    api_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or ""
    ).strip()
    if not supabase_url or not api_key:
        return MockSiteDatabaseProvider()
    return SupabaseSiteDatabaseProvider(supabase_url, api_key)


site_database = create_site_database_provider()
