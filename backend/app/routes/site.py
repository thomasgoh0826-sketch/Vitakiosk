from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Body
from pydantic import BaseModel, ConfigDict, Field

from backend.app.site_database import site_database
from backend.app.site_payments import CheckoutOrder, get_payment_provider
from backend.app.site_pricing import MANUAL_PAYMENT_NOTICE, SITE_PRICING_PLANS


router = APIRouter(prefix="/api/site", tags=["site"])

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
    amount_label: ShortText
    mode: Literal["subscription", "one_time", "deposit", "quote"] = "deposit"
    provider: Literal["manual_mock", "mock", "stripe", "billplz", "manual_bank_transfer"] = "manual_mock"


def record_response(record: Any) -> dict[str, Any]:
    return record.to_response()


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
def create_lead(request: LeadRequest) -> dict[str, Any]:
    record = site_database.create("lead", "inquiry_submitted", request.model_dump())
    return record_response(record)


@router.post("/orders", status_code=201)
def create_order(request: OrderRequest) -> dict[str, Any]:
    record = site_database.create("order", "quote_requested", request.model_dump())
    return record_response(record)


@router.post("/bookings", status_code=201)
def create_booking(request: BookingRequest) -> dict[str, Any]:
    record = site_database.create("booking", "inquiry_submitted", request.model_dump())
    return record_response(record)


@router.post("/projects", status_code=201)
def create_project(request: ProjectRequest) -> dict[str, Any]:
    record = site_database.create("project", "inquiry_submitted", request.model_dump())
    return record_response(record)


@router.post("/checkout/create")
def create_checkout(request: CheckoutCreateRequest) -> dict[str, Any]:
    provider = get_payment_provider(request.provider)
    session = provider.create_checkout_session(
        CheckoutOrder(
            order_id=request.order_id,
            plan_id=request.plan_id,
            customer_email=request.customer_email,
            amount_label=request.amount_label,
            mode=request.mode,
        )
    )
    return {
        "ok": True,
        "checkout": session.to_dict(),
        "live_payment": False,
        "message": MANUAL_PAYMENT_NOTICE,
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
