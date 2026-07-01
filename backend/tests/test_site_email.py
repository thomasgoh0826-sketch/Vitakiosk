from backend.app.site_database import SiteRecord
from backend.app.site_email import (
    MemorySiteEmailProvider,
    build_site_email_message,
    create_site_email_provider,
)


def test_build_site_email_message_includes_reference_and_customer_details() -> None:
    record = SiteRecord(
        id="lead-1",
        kind="lead",
        status="inquiry_submitted",
        reference_id="VK-LEAD-2026-0001",
        payload={
            "name": "Demo <Customer>",
            "email": "customer@example.com",
            "phone": "+60 12 345 6789",
            "businessType": "Pharmacy",
            "message": "<script>alert(1)</script> I want a demo.",
        },
    )

    message = build_site_email_message(record, "New Inquiry")

    assert message.to == "thomasgoh0826@gmail.com"
    assert message.subject == "[VitaKiosk Asia] New Inquiry - VK-LEAD-2026-0001"
    assert "Reference: VK-LEAD-2026-0001" in message.body
    assert "Name: Demo Customer" in message.body
    assert "Email: customer@example.com" in message.body
    assert "Business type: Pharmacy" in message.body
    assert "<script>" not in message.body


def test_memory_site_email_provider_records_messages() -> None:
    provider = MemorySiteEmailProvider()
    record = SiteRecord(
        id="booking-1",
        kind="booking",
        status="inquiry_submitted",
        reference_id="VK-BOOK-2026-0001",
        payload={"name": "Ava", "email": "ava@example.com", "topic": "AI lesson"},
    )

    result = provider.send(build_site_email_message(record, "New AI Lesson Booking"))

    assert result.sent is True
    assert provider.sent_messages[0].reference_id == "VK-BOOK-2026-0001"


def test_email_provider_defaults_to_disabled_without_secrets(monkeypatch) -> None:
    monkeypatch.setenv("SITE_EMAIL_PROVIDER", "gmail_connected")
    monkeypatch.delenv("SITE_EMAIL_SMTP_APP_PASSWORD", raising=False)

    provider = create_site_email_provider()

    assert provider.name == "disabled"
