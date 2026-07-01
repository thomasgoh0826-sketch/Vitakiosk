from fastapi.testclient import TestClient

from backend.app.site_payments import CheckoutOrder, get_payment_provider


def test_site_pricing_returns_mock_framework(client: TestClient) -> None:
    response = client.get("/api/site/pricing")

    assert response.status_code == 200
    payload = response.json()
    assert payload["payment_provider"] == "manual_mock"
    assert "Online payment gateway" in payload["payment_notice"]
    assert {item["group"] for item in payload["items"]} >= {
        "vitaflow",
        "vitakiosk",
        "academy",
        "website",
    }


def test_site_lead_sanitizes_control_characters(client: TestClient) -> None:
    response = client.post(
        "/api/site/lead",
        json={
            "name": "  Demo\x00 User ",
            "email": "demo@example.com",
            "phone": "60123456789",
            "message": " Interested\n in VitaKiosk ",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["id"].startswith("LEAD-")
    assert payload["status"] == "inquiry_submitted"
    assert payload["reference_id"].startswith("VKA-")
    assert "WhatsApp" in payload["next_step"]
    assert payload["payload"]["name"] == "Demo User"
    assert payload["payload"]["message"] == "Interested in VitaKiosk"
    assert payload["source"] == "mock_memory"


def test_site_forms_validate_email(client: TestClient) -> None:
    response = client.post(
        "/api/site/bookings",
        json={"name": "Demo", "email": "not-email", "topic": "AI lesson"},
    )

    assert response.status_code == 422


def test_site_order_booking_and_project_records(client: TestClient) -> None:
    order = client.post(
        "/api/site/orders",
        json={
            "buyerType": "pharmacy",
            "companyName": "Demo Pharmacy",
            "contactPerson": "Ava",
            "email": "ava@example.com",
        },
    )
    booking = client.post(
        "/api/site/bookings",
        json={
            "name": "Ava",
            "email": "ava@example.com",
            "topic": "Codex coaching",
        },
    )
    project = client.post(
        "/api/site/projects",
        json={
            "businessName": "Demo Clinic",
            "contactPerson": "Ava",
            "email": "ava@example.com",
            "selectedPackage": "Business Website",
        },
    )

    assert order.status_code == 201
    assert order.json()["status"] == "quote_requested"
    assert booking.status_code == 201
    assert booking.json()["status"] == "inquiry_submitted"
    assert project.status_code == 201
    assert project.json()["status"] == "inquiry_submitted"


def test_manual_confirmation_never_triggers_live_payment(client: TestClient) -> None:
    response = client.post(
        "/api/site/checkout/create",
        json={
            "order_id": "ORDER-1",
            "plan_id": "vitaflow-starter",
            "customer_email": "demo@example.com",
            "amount_label": "Placeholder monthly plan",
            "mode": "subscription",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["live_payment"] is False
    assert payload["checkout"]["provider"] == "manual_mock"
    assert payload["checkout"]["status"] == "quote_requested"
    assert payload["checkout"]["reference_id"].startswith("VKA-")
    assert "Online payment gateway" in payload["message"]
    assert "/checkout/success" in payload["checkout"]["checkout_url"]


def test_live_provider_skeletons_are_disabled_without_network() -> None:
    order = CheckoutOrder(
        order_id="ORDER-2",
        plan_id="website-ai-chatbot",
        customer_email="demo@example.com",
        amount_label="Scope quote plus deposit",
        mode="deposit",
    )

    for provider_name in ("stripe", "billplz"):
        session = get_payment_provider(provider_name).create_checkout_session(order)

        assert session.provider == provider_name
        assert session.status == "provider_disabled"
        assert session.live_payment is False
        assert "/checkout/cancel" in session.checkout_url


def test_manual_bank_transfer_is_pending_manual_review() -> None:
    order = CheckoutOrder(
        order_id="ORDER-3",
        plan_id="vitakiosk-local",
        customer_email="demo@example.com",
        amount_label="Deposit framework",
        mode="deposit",
    )

    session = get_payment_provider("manual_bank_transfer").create_checkout_session(order)

    assert session.provider == "manual_mock"
    assert session.status == "manual_payment_pending"
    assert session.live_payment is False


def test_site_payment_webhook_is_mock_safe(client: TestClient) -> None:
    response = client.post("/api/site/webhooks/payment", json={"type": "payment.succeeded"})

    assert response.status_code == 200
    assert response.json()["live_payment"] is False
    assert response.json()["result"]["provider"] == "manual_mock"
