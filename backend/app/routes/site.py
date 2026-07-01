from __future__ import annotations

from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
import logging
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Body, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field

from backend.app.site_database import site_database
from backend.app.site_email import build_site_email_message, site_email
from backend.app.site_payments import CheckoutOrder, get_payment_provider
from backend.app.site_pricing import MANUAL_PAYMENT_NOTICE, SITE_PRICING_PLANS


router = APIRouter(prefix="/api/site", tags=["site"])
logger = logging.getLogger(__name__)

CUSTOMER_SUCCESS_MESSAGE = (
    "Your inquiry has been submitted. We will contact you to confirm scope, "
    "schedule, and manual payment details."
)
CUSTOMER_RECEIVED_MESSAGE = "Your request was received. We will contact you shortly."
CUSTOMER_ERROR_MESSAGE = (
    "We could not submit your request. Please try again or contact us directly."
)

EmailField = Annotated[str, Field(min_length=3, max_length=160, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
ShortText = Annotated[str, Field(min_length=1, max_length=240)]
OptionalText = Annotated[str | None, Field(default=None, max_length=1_000)]


class StrictSiteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LeadRequest(StrictSiteRequest):
    name: ShortText
    email: EmailField
    phone: str | None = Field(default=None, max_length=80)
    company: str | None = Field(default=None, max_length=160)
    interest: str | None = Field(default=None, max_length=160)
    message: ShortText


class OrderRequest(StrictSiteRequest):
    buyerType: str | None = Field(default=None, max_length=120)
    companyName: ShortText
    contactPerson: ShortText
    phone: str | None = Field(default=None, max_length=80)
    email: EmailField
    location: str | None = Field(default=None, max_length=200)
    units: str | None = Field(default=None, max_length=60)
    placement: str | None = Field(default=None, max_length=160)
    selectedPlan: str | None = Field(default=None, max_length=160)
    branches: str | None = Field(default=None, max_length=60)
    businessType: str | None = Field(default=None, max_length=160)
    addons: str | None = Field(default=None, max_length=240)
    notes: OptionalText = None


class BookingRequest(StrictSiteRequest):
    name: ShortText
    email: EmailField
    phone: str | None = Field(default=None, max_length=80)
    topic: ShortText
    level: str | None = Field(default=None, max_length=120)
    preferredTime: str | None = Field(default=None, max_length=160)
    format: str | None = Field(default=None, max_length=80)
    participants: str | None = Field(default=None, max_length=80)
    notes: OptionalText = None


class ProjectRequest(StrictSiteRequest):
    businessName: ShortText
    industry: str | None = Field(default=None, max_length=120)
    contactPerson: ShortText
    email: EmailField
    phone: str | None = Field(default=None, max_length=80)
    currentWebsite: str | None = Field(default=None, max_length=240)
    selectedPackage: ShortText
    timeline: str | None = Field(default=None, max_length=120)
    notes: OptionalText = None


class CheckoutCreateRequest(StrictSiteRequest):
    order_id: ShortText
    plan_id: ShortText
    customer_email: EmailField
    customer_name: ShortText
    customer_phone: str | None = Field(default=None, max_length=80)
    business_type: str | None = Field(default=None, max_length=160)
    selected_package: str | None = Field(default=None, max_length=160)
    message: str | None = Field(default=None, max_length=1_000)
    amount_label: ShortText
    mode: Literal["subscription", "one_time", "deposit", "quote"] = "deposit"
    provider: Literal["manual_mock", "mock", "stripe", "billplz", "manual_bank_transfer"] = "manual_mock"


class SiteRateLimiter:
    def __init__(self, *, limit: int = 30, window_seconds: int = 60) -> None:
        self.limit = limit
        self.window = timedelta(seconds=window_seconds)
        self._hits: dict[str, deque[datetime]] = defaultdict(deque)

    def check(self, key: str) -> None:
        now = datetime.now(UTC)
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again shortly.")
        hits.append(now)

    def clear(self) -> None:
        self._hits.clear()


site_rate_limiter = SiteRateLimiter()


def rate_limit_request(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    site_rate_limiter.check(client)


def notification_response(
    record: Any,
    *,
    notification_status: str = "disabled",
    customer_message: str | None = None,
) -> dict[str, Any]:
    return {
        **record.to_response(),
        "notification_status": notification_status,
        "customer_message": customer_message or CUSTOMER_SUCCESS_MESSAGE,
    }


def notify_owner(
    record: SiteRecord,
    submission_type: str | None = None,
    *,
    manual_payment_status: str | None = None,
) -> str:
    message = build_site_email_message(
        record,
        submission_type,
        manual_payment_status=manual_payment_status,
    )
    result = site_email.send(message)
    return "sent" if result.sent else "deferred"


def create_record_and_notify(
    kind: Literal["lead", "order", "booking", "project"],
    status: str,
    payload: dict[str, Any],
    submission_type: str | None = None,
) -> dict[str, Any]:
    record = site_database.create(kind, status, payload)
    try:
        notification_status = notify_owner(record, submission_type)
    except Exception:
        logger.warning("Site email notification failed for %s", record.reference_id, exc_info=True)
        return notification_response(
            record,
            notification_status="deferred",
            customer_message=CUSTOMER_RECEIVED_MESSAGE,
        )
    return notification_response(record, notification_status=notification_status)


@router.get("/pricing")
def pricing() -> dict[str, Any]:
    return {
        "items": SITE_PRICING_PLANS,
        "payment_provider": "manual_confirmation",
        "payment_notice": MANUAL_PAYMENT_NOTICE,
        "notes": [
            "Final pricing subject to scope.",
            "Payment and onboarding are confirmed manually after discussion.",
            "Manual bank transfer or DuitNow instructions are shared only after discussion.",
            "Sponsored healthcare campaigns require approval and compliance review.",
        ],
    }


@router.post("/lead", status_code=201)
def create_lead(request_data: LeadRequest, request: Request) -> dict[str, Any]:
    rate_limit_request(request)
    return create_record_and_notify(
        "lead",
        "inquiry_submitted",
        request_data.model_dump(),
        "New Inquiry",
    )


@router.post("/orders", status_code=201)
def create_order(request_data: OrderRequest, request: Request) -> dict[str, Any]:
    rate_limit_request(request)
    payload = request_data.model_dump()
    selected = f"{payload.get('selectedPlan') or ''} {payload.get('buyerType') or ''}".lower()
    submission_type = "New VitaFlow Request" if "vitaflow" in selected else "New VitaKiosk Order"
    return create_record_and_notify("order", "quote_requested", payload, submission_type)


@router.post("/bookings", status_code=201)
def create_booking(request_data: BookingRequest, request: Request) -> dict[str, Any]:
    rate_limit_request(request)
    return create_record_and_notify(
        "booking",
        "inquiry_submitted",
        request_data.model_dump(),
        "New AI Lesson Booking",
    )


@router.post("/projects", status_code=201)
def create_project(request_data: ProjectRequest, request: Request) -> dict[str, Any]:
    rate_limit_request(request)
    return create_record_and_notify(
        "project",
        "inquiry_submitted",
        request_data.model_dump(),
        "New Website Project",
    )


@router.post("/checkout/create")
def create_checkout(request_data: CheckoutCreateRequest, request: Request) -> dict[str, Any]:
    rate_limit_request(request)
    provider = get_payment_provider(request_data.provider)
    session = provider.create_checkout_session(
        CheckoutOrder(
            order_id=request_data.order_id,
            plan_id=request_data.plan_id,
            customer_email=request_data.customer_email,
            amount_label=request_data.amount_label,
            mode=request_data.mode,
        )
    )
    record_payload = {
        "name": request_data.customer_name,
        "email": request_data.customer_email,
        "phone": request_data.customer_phone,
        "businessType": request_data.business_type,
        "selectedPackage": request_data.selected_package or request_data.plan_id,
        "selectedPlan": request_data.plan_id,
        "message": request_data.message,
        "manual_payment_status": session.status,
    }
    payment_record = site_database.create(
        "order",
        status=session.status,
        payload=record_payload,
        reference_id=session.reference_id or None,
    )
    try:
        notification_status = notify_owner(
            payment_record,
            "Manual Payment Confirmation Request",
            manual_payment_status=session.status,
        )
    except Exception:
        logger.warning("Manual payment notification failed for %s", payment_record.reference_id, exc_info=True)
        notification_status = "deferred"
        customer_message = CUSTOMER_RECEIVED_MESSAGE
    else:
        customer_message = (
            "We will contact you with payment details after confirming the scope."
            if notification_status == "sent"
            else CUSTOMER_RECEIVED_MESSAGE
        )
    return {
        "ok": True,
        "record": payment_record.to_response(),
        "checkout": session.to_dict(),
        "live_payment": False,
        "message": MANUAL_PAYMENT_NOTICE,
        "notification_status": notification_status,
        "customer_message": customer_message,
    }


@router.post("/checkout/mock-success")
def mock_success(payload: Annotated[dict[str, Any], Body(default_factory=dict)]) -> dict[str, Any]:
    return {
        "ok": True,
        "status": "mock_paid",
        "reference": payload.get("reference", "MOCK-CHECKOUT"),
        "live_payment": False,
    }


@router.post("/checkout/mock-cancel")
def mock_cancel(payload: Annotated[dict[str, Any], Body(default_factory=dict)]) -> dict[str, Any]:
    return {
        "ok": True,
        "status": "mock_cancelled",
        "reference": payload.get("reference", "MOCK-CHECKOUT"),
        "live_payment": False,
    }


@router.post("/webhooks/payment")
def payment_webhook(payload: Annotated[dict[str, Any], Body(default_factory=dict)]) -> dict[str, Any]:
    provider = get_payment_provider("manual_mock")
    return {
        "ok": True,
        "result": provider.verify_webhook(payload),
        "live_payment": False,
    }
