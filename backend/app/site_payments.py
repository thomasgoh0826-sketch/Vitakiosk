from __future__ import annotations

from dataclasses import asdict, dataclass
import os
from typing import Any, Literal, Protocol


PaymentProviderName = Literal["manual_mock", "mock", "stripe", "billplz", "manual_bank_transfer"]


@dataclass(frozen=True)
class CheckoutOrder:
    order_id: str
    plan_id: str
    customer_email: str
    amount_label: str
    mode: Literal["subscription", "one_time", "deposit", "quote"]


@dataclass(frozen=True)
class CheckoutSession:
    provider: PaymentProviderName
    checkout_url: str
    payment_id: str
    status: Literal[
        "checkout_created",
        "quote_requested",
        "manual_payment_pending",
        "provider_disabled",
    ]
    live_payment: Literal[False] = False
    reference_id: str | None = None
    message: str | None = None
    next_step: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class PaymentProvider(Protocol):
    name: PaymentProviderName

    def create_checkout_session(self, order: CheckoutOrder) -> CheckoutSession: ...

    def verify_webhook(self, request_body: dict[str, Any]) -> dict[str, Any]: ...

    def get_payment_status(self, payment_id: str) -> dict[str, Any]: ...

    def refund_payment(self, payment_id: str) -> dict[str, Any]: ...

    def create_subscription_checkout(self, order: CheckoutOrder) -> CheckoutSession: ...

    def create_one_time_checkout(self, order: CheckoutOrder) -> CheckoutSession: ...


class MockPaymentProvider:
    name: PaymentProviderName = "mock"

    def create_checkout_session(self, order: CheckoutOrder) -> CheckoutSession:
        base_url = os.getenv("SITE_BASE_URL", "http://127.0.0.1:5176").rstrip("/")
        return CheckoutSession(
            provider=self.name,
            checkout_url=f"{base_url}/checkout/success?ref={order.order_id}&provider=mock",
            payment_id=f"MOCK-PAY-{order.order_id}",
            status="checkout_created",
        )

    def verify_webhook(self, request_body: dict[str, Any]) -> dict[str, Any]:
        return {"ok": True, "provider": self.name, "event": request_body.get("type", "mock")}

    def get_payment_status(self, payment_id: str) -> dict[str, Any]:
        return {"payment_id": payment_id, "status": "mock_paid", "provider": self.name}

    def refund_payment(self, payment_id: str) -> dict[str, Any]:
        return {
            "payment_id": payment_id,
            "status": "not_available",
            "provider": self.name,
        }

    def create_subscription_checkout(self, order: CheckoutOrder) -> CheckoutSession:
        return self.create_checkout_session(order)

    def create_one_time_checkout(self, order: CheckoutOrder) -> CheckoutSession:
        return self.create_checkout_session(order)


class DisabledLivePaymentProvider(MockPaymentProvider):
    def __init__(self, name: Literal["stripe", "billplz"]) -> None:
        self.name = name

    def create_checkout_session(self, order: CheckoutOrder) -> CheckoutSession:
        base_url = os.getenv("SITE_BASE_URL", "http://127.0.0.1:5176").rstrip("/")
        return CheckoutSession(
            provider=self.name,
            checkout_url=f"{base_url}/checkout/cancel?ref={order.order_id}&provider={self.name}",
            payment_id=f"DISABLED-{self.name.upper()}-{order.order_id}",
            status="provider_disabled",
        )

    def verify_webhook(self, request_body: dict[str, Any]) -> dict[str, Any]:
        return {
            "ok": True,
            "provider": self.name,
            "event": request_body.get("type", "disabled_live_provider_stub"),
            "live_payment": False,
        }


class ManualBankTransferProvider(MockPaymentProvider):
    name: PaymentProviderName = "manual_mock"

    def create_checkout_session(self, order: CheckoutOrder) -> CheckoutSession:
        base_url = os.getenv("SITE_BASE_URL", "http://127.0.0.1:5176").rstrip("/")
        reference_id = f"VKA-{order.order_id}"
        status = (
            "quote_requested"
            if order.mode in {"subscription", "quote"}
            else "manual_payment_pending"
        )
        return CheckoutSession(
            provider=self.name,
            checkout_url=(
                f"{base_url}/checkout/success?ref={reference_id}"
                "&provider=manual_mock"
            ),
            payment_id=f"MANUAL-{order.order_id}",
            status=status,
            reference_id=reference_id,
            message=(
                "Online payment gateway is not enabled yet. Payment and onboarding "
                "are confirmed manually after discussion."
            ),
            next_step=(
                "We will follow up by WhatsApp or email with the quote, schedule, "
                "and manual bank transfer or DuitNow instructions if payment is needed."
            ),
        )


def configured_payment_provider_name() -> PaymentProviderName:
    raw = os.getenv("SITE_PAYMENT_PROVIDER", "manual_mock").strip().lower()
    if raw in {"manual_mock", "mock", "stripe", "billplz", "manual_bank_transfer"}:
        return raw  # type: ignore[return-value]
    return "manual_mock"


def get_payment_provider(name: PaymentProviderName | None = None) -> PaymentProvider:
    provider_name = name or configured_payment_provider_name()
    if provider_name in {"manual_mock", "manual_bank_transfer"}:
        return ManualBankTransferProvider()
    if provider_name == "mock":
        return MockPaymentProvider()
    if provider_name in {"stripe", "billplz"}:
        return DisabledLivePaymentProvider(provider_name)
    return ManualBankTransferProvider()
