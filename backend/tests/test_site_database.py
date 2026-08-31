from __future__ import annotations

import httpx

from backend.app.site_database import (
    MockSiteDatabaseProvider,
    SupabaseSiteDatabaseProvider,
    create_site_database_provider,
)


class FakeSupabaseClient:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def post(
        self,
        url: str,
        *,
        headers: dict[str, str],
        json: dict[str, object],
    ) -> httpx.Response:
        self.calls.append({"url": url, "headers": headers, "json": json})
        return httpx.Response(
            201,
            request=httpx.Request("POST", url),
            json=[{"id": "11111111-1111-1111-1111-111111111111", **json}],
        )


class ConflictThenSuccessSupabaseClient:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def post(
        self,
        url: str,
        *,
        headers: dict[str, str],
        json: dict[str, object],
    ) -> httpx.Response:
        self.calls.append({"url": url, "headers": headers, "json": json})
        if len(self.calls) == 1:
            return httpx.Response(
                409,
                request=httpx.Request("POST", url),
                json={"code": "23505", "message": "duplicate key value violates unique constraint"},
            )
        return httpx.Response(
            201,
            request=httpx.Request("POST", url),
            json=[{"id": "22222222-2222-2222-2222-222222222222", **json}],
        )


def test_site_database_uses_mock_if_supabase_env_missing(monkeypatch) -> None:
    monkeypatch.setenv("SITE_DATABASE_PROVIDER", "supabase")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)

    provider = create_site_database_provider()

    assert isinstance(provider, MockSiteDatabaseProvider)


def test_supabase_provider_inserts_sanitized_lead_with_reference() -> None:
    fake_client = FakeSupabaseClient()
    provider = SupabaseSiteDatabaseProvider(
        "https://example.supabase.co",
        "secret-key",
        http_client=fake_client,  # type: ignore[arg-type]
    )

    record = provider.create(
        "lead",
        "inquiry_submitted",
        {
            "name": " Demo\x00 User ",
            "email": "demo@example.com",
            "phone": "60123456789",
            "businessType": "Pharmacy",
            "message": " Hello\nthere ",
        },
    )

    assert record.database_provider == "supabase"
    assert record.reference_id.startswith("VK-LEAD-")
    assert record.payload["name"] == "Demo User"
    assert fake_client.calls[0]["url"] == "https://example.supabase.co/rest/v1/site_leads"
    assert fake_client.calls[0]["json"] == {
        "reference_code": record.reference_id,
        "name": "Demo User",
        "email": "demo@example.com",
        "phone": "60123456789",
        "business_type": "Pharmacy",
        "message": "Hello there",
        "status": "inquiry_submitted",
    }


def test_supabase_provider_defaults_manual_payment_status_for_orders() -> None:
    fake_client = FakeSupabaseClient()
    provider = SupabaseSiteDatabaseProvider(
        "https://example.supabase.co",
        "secret-key",
        http_client=fake_client,  # type: ignore[arg-type]
    )

    record = provider.create(
        "order",
        "quote_requested",
        {
            "companyName": "Demo Pharmacy",
            "contactPerson": "Ava",
            "email": "ava@example.com",
            "selectedPlan": "VitaKiosk Local Edition",
        },
    )

    row = fake_client.calls[0]["json"]
    assert record.reference_id.startswith("VK-ORD-")
    assert row["reference_code"] == record.reference_id
    assert row["manual_payment_status"] == "not_required"
    assert row["product_type"] == "vitakiosk_local"


def test_supabase_provider_retries_generated_reference_conflict() -> None:
    fake_client = ConflictThenSuccessSupabaseClient()
    provider = SupabaseSiteDatabaseProvider(
        "https://example.supabase.co",
        "secret-key",
        http_client=fake_client,  # type: ignore[arg-type]
    )

    record = provider.create(
        "lead",
        "inquiry_submitted",
        {
            "name": "Restart Safe",
            "email": "demo@example.com",
            "message": "Generated reference should retry if Supabase already has it.",
        },
    )

    first_ref = fake_client.calls[0]["json"]["reference_code"]  # type: ignore[index]
    second_ref = fake_client.calls[1]["json"]["reference_code"]  # type: ignore[index]
    assert len(fake_client.calls) == 2
    assert first_ref != second_ref
    assert record.reference_id == second_ref
