from __future__ import annotations

from dataclasses import dataclass
from email.message import EmailMessage
from datetime import UTC, datetime
import logging
import os
import re
import smtplib
from typing import Protocol

from backend.app.site_database import SiteRecord


logger = logging.getLogger(__name__)

SITE_OWNER_EMAIL = "thomasgoh0826@gmail.com"
NEXT_ACTION = "Contact the customer manually to confirm scope, schedule, and payment details."
_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")


@dataclass(frozen=True)
class SiteEmailMessage:
    to: str
    subject: str
    body: str
    reference_id: str
    submission_type: str


@dataclass(frozen=True)
class EmailDeliveryResult:
    sent: bool
    provider: str
    message_id: str | None = None


class SiteEmailProvider(Protocol):
    name: str

    def send(self, message: SiteEmailMessage) -> EmailDeliveryResult:
        ...


class DisabledSiteEmailProvider:
    name = "disabled"

    def send(self, message: SiteEmailMessage) -> EmailDeliveryResult:
        logger.info("Site email disabled; notification not sent for %s", message.reference_id)
        return EmailDeliveryResult(sent=False, provider=self.name)


class MemorySiteEmailProvider:
    name = "memory"

    def __init__(self) -> None:
        self.sent_messages: list[SiteEmailMessage] = []

    def send(self, message: SiteEmailMessage) -> EmailDeliveryResult:
        self.sent_messages.append(message)
        return EmailDeliveryResult(
            sent=True,
            provider=self.name,
            message_id=f"memory-{len(self.sent_messages)}",
        )


class GmailSmtpEmailProvider:
    name = "gmail_connected"

    def __init__(
        self,
        *,
        username: str,
        app_password: str,
        host: str = "smtp.gmail.com",
        port: int = 587,
    ) -> None:
        self.username = username
        self.app_password = app_password
        self.host = host
        self.port = port

    def send(self, message: SiteEmailMessage) -> EmailDeliveryResult:
        email = EmailMessage()
        email["From"] = self.username
        email["To"] = message.to
        email["Subject"] = message.subject
        email.set_content(message.body)

        with smtplib.SMTP(self.host, self.port, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(self.username, self.app_password)
            smtp.send_message(email)

        return EmailDeliveryResult(sent=True, provider=self.name, message_id=message.reference_id)


def owner_email() -> str:
    return os.getenv("SITE_OWNER_EMAIL", SITE_OWNER_EMAIL).strip() or SITE_OWNER_EMAIL


def safe_email_text(value: object | None) -> str:
    if value is None:
        return "-"
    text = _CONTROL_CHARS.sub(" ", str(value))
    text = re.sub(r"\s+", " ", text).strip()
    return text.replace("<", "").replace(">", "")[:1_000] or "-"


def title_for_record(record: SiteRecord) -> str:
    payload = record.payload
    if record.kind == "lead":
        return "New Inquiry"
    if record.kind == "booking":
        return "New AI Lesson Booking"
    if record.kind == "project":
        return "New Website Project"
    selected = f"{payload.get('selectedPlan') or ''} {payload.get('buyerType') or ''}".lower()
    if "vitaflow" in selected:
        return "New VitaFlow Request"
    return "New VitaKiosk Order"


def label_for_record(record: SiteRecord) -> str:
    payload = record.payload
    if record.kind == "lead":
        return safe_email_text(payload.get("interest") or payload.get("businessType") or "Contact inquiry")
    if record.kind == "booking":
        return safe_email_text(payload.get("topic") or "AI lesson booking")
    if record.kind == "project":
        return safe_email_text(payload.get("selectedPackage") or "Website project")
    return safe_email_text(payload.get("selectedPlan") or payload.get("buyerType") or "Order inquiry")


def email_from_record(record: SiteRecord, key: str, *fallback_keys: str) -> str:
    for field_name in (key, *fallback_keys):
        value = record.payload.get(field_name)
        if value:
            return safe_email_text(value)
    return "-"


def build_site_email_message(
    record: SiteRecord,
    submission_type: str | None = None,
    *,
    manual_payment_status: str | None = None,
) -> SiteEmailMessage:
    type_label = submission_type or title_for_record(record)
    subject = f"[VitaKiosk Asia] {type_label} - {record.reference_id}"
    payload = record.payload
    created_at = record.created_at or datetime.now(UTC).isoformat(timespec="seconds")
    status_line = manual_payment_status or payload.get("manual_payment_status") or record.status
    package = (
        payload.get("selectedPlan")
        or payload.get("selectedPackage")
        or payload.get("topic")
        or payload.get("package")
        or "-"
    )
    name = email_from_record(record, "name", "fullName", "contactPerson", "customer_name")
    business_type = email_from_record(record, "businessType", "interest", "industry", "buyerType")
    message_text = email_from_record(record, "message", "notes")

    body = "\n".join(
        [
            "New VitaKiosk Asia inquiry",
            "",
            f"Reference: {safe_email_text(record.reference_id)}",
            f"Type: {safe_email_text(label_for_record(record))}",
            f"Submission: {safe_email_text(type_label)}",
            f"Name: {name}",
            f"Email: {email_from_record(record, 'email', 'customer_email')}",
            f"Phone: {email_from_record(record, 'phone', 'customer_phone')}",
            f"Business type: {business_type}",
            f"Package: {safe_email_text(package)}",
            f"Selected plan: {safe_email_text(payload.get('selectedPlan'))}",
            f"Message: {message_text}",
            f"Preferred date/time: {email_from_record(record, 'preferredTime', 'preferred_date', 'preferred_time')}",
            f"Manual payment status: {human_status(status_line)}",
            f"Created: {safe_email_text(created_at)}",
            "",
            "Next step:",
            NEXT_ACTION,
        ],
    )

    return SiteEmailMessage(
        to=owner_email(),
        subject=subject,
        body=body,
        reference_id=record.reference_id,
        submission_type=type_label,
    )


def human_status(value: object | None) -> str:
    text = safe_email_text(value)
    if text == "-":
        return "Pending confirmation"
    return text.replace("_", " ").capitalize()


def create_site_email_provider() -> SiteEmailProvider:
    provider = (os.getenv("SITE_EMAIL_PROVIDER", "disabled") or "disabled").strip().lower()
    if provider in {"disabled", "none", ""}:
        return DisabledSiteEmailProvider()
    if provider == "memory":
        return MemorySiteEmailProvider()
    if provider in {"gmail_connected", "gmail_smtp"}:
        username = (
            os.getenv("SITE_EMAIL_SMTP_USERNAME")
            or os.getenv("SITE_OWNER_EMAIL")
            or SITE_OWNER_EMAIL
        ).strip()
        app_password = re.sub(r"\s+", "", os.getenv("SITE_EMAIL_SMTP_APP_PASSWORD") or "")
        if not username or not app_password:
            logger.warning("Gmail email provider selected but SMTP app password is missing.")
            return DisabledSiteEmailProvider()
        host = os.getenv("SITE_EMAIL_SMTP_HOST", "smtp.gmail.com").strip() or "smtp.gmail.com"
        port = int(os.getenv("SITE_EMAIL_SMTP_PORT", "587") or "587")
        return GmailSmtpEmailProvider(
            username=username,
            app_password=app_password,
            host=host,
            port=port,
        )
    logger.warning("Unknown site email provider selected; email disabled.")
    return DisabledSiteEmailProvider()


site_email = create_site_email_provider()
