from __future__ import annotations

from typing import Any

from backend.app.site_email import EmailDeliveryResult


class FakeEmailProvider:
    name = "fake"

    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail
        self.messages: list[Any] = []

    def send(self, message: Any) -> EmailDeliveryResult:
        if self.fail:
            raise RuntimeError("email provider unavailable")
        self.messages.append(message)
        return EmailDeliveryResult(sent=True, provider=self.name, message_id="fake-1")


def test_inquiry_submission_sends_owner_email(client, monkeypatch) -> None:
    from backend.app.routes import site

    fake_email = FakeEmailProvider()
    monkeypatch.setattr(site, "site_email", fake_email)

    response = client.post(
        "/api/site/orders",
        json={
            "buyerType": "vitakiosk",
            "companyName": "Demo Pharmacy",
            "contactPerson": "Ava",
            "phone": "+60123456789",
            "email": "ava@example.com",
            "businessType": "Pharmacy",
            "selectedPlan": "VitaKiosk - Local Edition",
            "notes": "I want to install this in my pharmacy.",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["reference_id"].startswith("VK-ORD-")
    assert payload["notification_status"] == "sent"
    assert payload["customer_message"].startswith("Your inquiry has been submitted.")
    assert len(fake_email.messages) == 1
    message = fake_email.messages[0]
    assert payload["reference_id"] in message.subject
    assert "Ava" in message.body
    assert "VitaKiosk - Local Edition" in message.body


def test_email_failure_is_customer_safe_when_record_saved(client, monkeypatch) -> None:
    from backend.app.routes import site

    monkeypatch.setattr(site, "site_email", FakeEmailProvider(fail=True))

    response = client.post(
        "/api/site/lead",
        json={
            "name": "Demo User",
            "email": "demo@example.com",
            "phone": "+60123456789",
            "message": "I want to ask about VitaKiosk pricing.",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["notification_status"] == "deferred"
    assert payload["customer_message"] == "Your request was received. We will contact you shortly."
    assert "provider unavailable" not in str(payload)


def test_manual_payment_confirmation_sends_owner_email(client, monkeypatch) -> None:
    from backend.app.routes import site

    fake_email = FakeEmailProvider()
    monkeypatch.setattr(site, "site_email", fake_email)

    response = client.post(
        "/api/site/checkout/create",
        json={
            "order_id": "SITE-1",
            "plan_id": "vitaflow-starter-monthly",
            "customer_email": "demo@example.com",
            "customer_name": "Demo User",
            "customer_phone": "+60123456789",
            "business_type": "Pharmacy",
            "selected_package": "VitaFlow ERP - Starter",
            "message": "Please send payment details.",
            "amount_label": "Free setup + RM199/month",
            "mode": "subscription",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["live_payment"] is False
    assert payload["notification_status"] == "sent"
    assert payload["checkout"]["status"] == "manual_payment_pending"
    assert payload["checkout"]["reference_id"].startswith("VK-PAY-")
    assert len(fake_email.messages) == 1
    assert "Manual Payment Confirmation Request" in fake_email.messages[0].subject
    assert "Manual payment status: Manual payment pending" in fake_email.messages[0].body


def test_site_rate_limit_blocks_repeated_posts(client, monkeypatch) -> None:
    from backend.app.routes import site

    monkeypatch.setattr(site, "site_email", FakeEmailProvider())
    site.site_rate_limiter.clear()
    monkeypatch.setattr(site.site_rate_limiter, "limit", 1)

    payload = {
        "name": "Demo User",
        "email": "demo@example.com",
        "phone": "+60123456789",
        "message": "I want to ask about VitaKiosk pricing.",
    }

    first = client.post("/api/site/lead", json=payload)
    second = client.post("/api/site/lead", json=payload)

    assert first.status_code == 201
    assert second.status_code == 429
