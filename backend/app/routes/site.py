from __future__ import annotations

import re
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.app.site_payments import CheckoutRequest, select_payment_provider
from backend.app.site_pricing import pricing_catalog, pricing_item_exists
from backend.app.site_store import create_record


router = APIRouter(prefix="/api/site", tags=["site"])
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def sanitize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("<", "").replace(">", "")).strip()[:1000]


class SiteInquiry(BaseModel):
    kind: str = Field(default="lead", max_length=40)
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    phone: str = Field(min_length=6, max_length=60)
    organization: str | None = Field(default=None, max_length=160)
    business_type: str | None = Field(default=None, max_length=80)
    package_id: str | None = Field(default=None, max_length=120)
    message: str = Field(min_length=12, max_length=1000)

    @field_validator(
        "kind",
        "full_name",
        "phone",
        "organization",
        "business_type",
        "package_id",
        "message",
        mode="before",
    )
    @classmethod
    def clean_text(cls, value: object) -> object:
        if isinstance(value, str):
            return sanitize_text(value)
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        cleaned = sanitize_text(value).lower()
        if not EMAIL_PATTERN.match(cleaned):
            raise ValueError("invalid email")
        return cleaned


class CheckoutCreateRequest(BaseModel):
    mode: Literal["subscription", "deposit", "one_time", "quote"]
    item_id: str = Field(min_length=2, max_length=120)
    customer_email: str = Field(min_length=5, max_length=160)
    customer_name: str = Field(min_length=2, max_length=120)

    @field_validator("item_id", "customer_name", mode="before")
    @classmethod
    def clean_text(cls, value: object) -> object:
        if isinstance(value, str):
            return sanitize_text(value)
        return value

    @field_validator("customer_email")
    @classmethod
    def validate_customer_email(cls, value: str) -> str:
        cleaned = sanitize_text(value).lower()
        if not EMAIL_PATTERN.match(cleaned):
            raise ValueError("invalid email")
        return cleaned


@router.get("/pricing")
def get_site_pricing() -> dict[str, object]:
    return pricing_catalog()


@router.post("/lead", status_code=201)
def create_lead(payload: SiteInquiry) -> dict[str, object]:
    return create_record("lead", payload.model_dump(mode="json"))


@router.post("/orders", status_code=201)
def create_order(payload: SiteInquiry) -> dict[str, object]:
    return create_record("order", payload.model_dump(mode="json"))


@router.post("/bookings", status_code=201)
def create_booking(payload: SiteInquiry) -> dict[str, object]:
    return create_record("booking", payload.model_dump(mode="json"))


@router.post("/projects", status_code=201)
def create_project(payload: SiteInquiry) -> dict[str, object]:
    return create_record("project", payload.model_dump(mode="json"))


@router.post("/checkout/create")
def create_checkout(payload: CheckoutCreateRequest) -> dict[str, object]:
    if not pricing_item_exists(payload.item_id):
        raise HTTPException(status_code=404, detail="Unknown pricing item")
    provider = select_payment_provider()
    request = CheckoutRequest(
        mode=payload.mode,
        item_id=payload.item_id,
        customer_email=str(payload.customer_email),
        customer_name=payload.customer_name,
    )
    if payload.mode == "subscription":
        return provider.create_subscription_checkout(request)
    if payload.mode == "one_time":
        return provider.create_one_time_checkout(request)
    return provider.create_checkout_session(request)


@router.post("/checkout/mock-success")
def mock_success(session_id: str = "mock_session") -> dict[str, object]:
    return {"session_id": sanitize_text(session_id), "status": "mock_success"}


@router.post("/checkout/mock-cancel")
def mock_cancel(session_id: str = "mock_session") -> dict[str, object]:
    return {"session_id": sanitize_text(session_id), "status": "mock_cancel"}


@router.post("/webhooks/payment")
def payment_webhook(payload: dict[str, object]) -> dict[str, object]:
    provider = select_payment_provider()
    return provider.verify_webhook(payload)
