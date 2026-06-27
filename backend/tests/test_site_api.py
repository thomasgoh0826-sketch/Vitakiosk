from fastapi.testclient import TestClient


def valid_payload() -> dict[str, str]:
    return {
        "kind": "lead",
        "full_name": "Demo Owner",
        "email": "demo@example.com",
        "phone": "+60123456789",
        "organization": "Demo Pharmacy",
        "business_type": "Pharmacy",
        "package_id": "vitakiosk-local-edition",
        "message": "We want a mock VitaKiosk demo for a pharmacy branch.",
    }


def test_site_pricing_returns_business_framework(client: TestClient) -> None:
    response = client.get("/api/site/pricing")

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "mock"
    ids = {item["id"] for item in payload["items"]}
    assert "vitaflow-starter-monthly" in ids
    assert "vitakiosk-local-edition" in ids
    assert "ai-basics-1to1" in ids
    assert "landing-page-launch" in ids


def test_site_lead_sanitizes_and_persists_mock_record(client: TestClient) -> None:
    payload = valid_payload()
    payload["message"] = "<script>Need AI website and kiosk demo</script>"

    response = client.post("/api/site/lead", json=payload)

    assert response.status_code == 201
    record = response.json()
    assert record["kind"] == "lead"
    assert record["status"] == "inquiry"
    assert "<" not in record["payload"]["message"]
    assert record["source"] == "mock_site_runtime"


def test_site_order_booking_and_project_records(client: TestClient) -> None:
    for endpoint, expected_status in [
        ("/api/site/orders", "quote_requested"),
        ("/api/site/bookings", "requested"),
        ("/api/site/projects", "inquiry"),
    ]:
        response = client.post(endpoint, json=valid_payload())

        assert response.status_code == 201
        assert response.json()["status"] == expected_status


def test_site_rejects_invalid_form_input(client: TestClient) -> None:
    payload = valid_payload()
    payload["email"] = "not-an-email"
    payload["message"] = "too short"

    response = client.post("/api/site/lead", json=payload)

    assert response.status_code == 422


def test_mock_checkout_creates_session_without_live_payment(client: TestClient) -> None:
    response = client.post(
        "/api/site/checkout/create",
        json={
            "mode": "deposit",
            "item_id": "vitakiosk-local-edition",
            "customer_email": "demo@example.com",
            "customer_name": "Demo Owner",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "mock"
    assert payload["status"] == "checkout_created"
    assert payload["url"].startswith("/checkout/success")
    assert "No live charge" in payload["message"]


def test_checkout_unknown_item_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/site/checkout/create",
        json={
            "mode": "deposit",
            "item_id": "unknown-live-product",
            "customer_email": "demo@example.com",
            "customer_name": "Demo Owner",
        },
    )

    assert response.status_code == 404


def test_payment_webhook_is_mock_by_default(client: TestClient) -> None:
    response = client.post("/api/site/webhooks/payment", json={"event": "demo"})

    assert response.status_code == 200
    assert response.json() == {"ok": True, "provider": "mock", "mode": "mock"}
