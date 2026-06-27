from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal, Protocol
from uuid import uuid4


PaymentProviderName = Literal["mock", "stripe", "billplz", "manual"]
CheckoutMode = Literal["subscription", "deposit", "one_time", "quote"]


@dataclass(frozen=True)
class CheckoutRequest:
    mode: CheckoutMode
    item_id: str
    customer_email: str
    customer_name: str


class PaymentProvider(Protocol):
    name: PaymentProviderName

    def create_checkout_session(self, request: CheckoutRequest) -> dict[str, object]:
        ...

    def create_subscription_checkout(self, request: CheckoutRequest) -> dict[str, object]:
        ...

    def create_one_time_checkout(self, request: CheckoutRequest) -> dict[str, object]:
        ...

    def verify_webhook(self, payload: dict[str, object]) -> dict[str, object]:
        ...

    def get_payment_status(self, session_id: str) -> dict[str, object]:
        ...

    def refund_payment(self, session_id: str) -> dict[str, object]:
        ...


class MockPaymentProvider:
    name: PaymentProviderName = "mock"

    def create_checkout_session(self, request: CheckoutRequest) -> dict[str, object]:
        return _mock_session(request)

    def create_subscription_checkout(self, request: CheckoutRequest) -> dict[str, object]:
        return _mock_session(_replace_mode(request, "subscription"))

    def create_one_time_checkout(self, request: CheckoutRequest) -> dict[str, object]:
        return _mock_session(_replace_mode(request, "one_time"))

    def verify_webhook(self, payload: dict[str, object]) -> dict[str, object]:
        del payload
        return {"ok": True, "provider": self.name, "mode": "mock"}

    def get_payment_status(self, session_id: str) -> dict[str, object]:
        return {"session_id": session_id, "provider": self.name, "status": "mock_success"}

    def refund_payment(self, session_id: str) -> dict[str, object]:
        return {
            "session_id": session_id,
            "provider": self.name,
            "status": "refund_placeholder",
        }


class DisabledLivePaymentProvider:
    def __init__(self, name: PaymentProviderName) -> None:
        self.name = name

    def create_checkout_session(self, request: CheckoutRequest) -> dict[str, object]:
        del request
        return {
            "id": f"{self.name}_disabled",
            "provider": self.name,
            "status": "manual_review",
            "url": "/checkout/cancel?provider=disabled",
            "message": (
                f"{self.name} payment provider is a skeleton only. "
                "No live payment call was made."
            ),
        }

    def create_subscription_checkout(self, request: CheckoutRequest) -> dict[str, object]:
        return self.create_checkout_session(request)

    def create_one_time_checkout(self, request: CheckoutRequest) -> dict[str, object]:
        return self.create_checkout_session(request)

    def verify_webhook(self, payload: dict[str, object]) -> dict[str, object]:
        del payload
        return {"ok": False, "provider": self.name, "status": "disabled"}

    def get_payment_status(self, session_id: str) -> dict[str, object]:
        return {
            "session_id": session_id,
            "provider": self.name,
            "status": "manual_review",
        }

    def refund_payment(self, session_id: str) -> dict[str, object]:
        return {
            "session_id": session_id,
            "provider": self.name,
            "status": "refund_placeholder",
        }


def _replace_mode(request: CheckoutRequest, mode: CheckoutMode) -> CheckoutRequest:
    return CheckoutRequest(
        mode=mode,
        item_id=request.item_id,
        customer_email=request.customer_email,
        customer_name=request.customer_name,
    )


def _mock_session(request: CheckoutRequest) -> dict[str, object]:
    session_id = f"mock_{request.mode}_{uuid4().hex[:10]}"
    status = "manual_review" if request.mode == "quote" else "checkout_created"
    return {
        "id": session_id,
        "provider": "mock",
        "status": status,
        "url": f"/checkout/success?session_id={session_id}",
        "message": "Mock checkout session created. No live charge was attempted.",
        "item_id": request.item_id,
    }


def select_payment_provider() -> PaymentProvider:
    selected = (os.getenv("SITE_PAYMENT_PROVIDER", "mock") or "mock").strip().casefold()
    if selected == "mock":
        return MockPaymentProvider()
    if selected in {"stripe", "billplz", "manual"}:
        return DisabledLivePaymentProvider(selected)  # type: ignore[arg-type]
    raise RuntimeError("SITE_PAYMENT_PROVIDER must be one of: mock, stripe, billplz, manual")
