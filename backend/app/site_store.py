from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from itertools import count
import re
from typing import Any


_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")


def sanitize_text(value: str) -> str:
    return re.sub(r"\s+", " ", _CONTROL_CHARS.sub(" ", value)).strip()


def sanitize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    safe: dict[str, Any] = {}
    for key, value in payload.items():
        if isinstance(value, str):
            safe[key] = sanitize_text(value)[:1_000]
        else:
            safe[key] = value
    return safe


@dataclass
class SiteRecord:
    id: str
    kind: str
    status: str
    payload: dict[str, Any]
    reference_id: str
    next_step: str
    payment_note: str
    created_at: str = field(
        default_factory=lambda: datetime.now(UTC).isoformat(timespec="seconds")
    )


class SiteRecordStore:
    def __init__(self) -> None:
        self._counter = count(1)
        self._records: dict[str, SiteRecord] = {}

    def create(self, kind: str, status: str, payload: dict[str, Any]) -> SiteRecord:
        prefix = {
            "lead": "LEAD",
            "order": "ORDER",
            "booking": "BOOK",
            "project": "PROJ",
        }.get(kind, "SITE")
        record_id = f"{prefix}-{next(self._counter):05d}"
        reference_id = f"VKA-{record_id}"
        record = SiteRecord(
            id=record_id,
            kind=kind,
            status=status,
            payload=sanitize_payload(payload),
            reference_id=reference_id,
            next_step=(
                "We will follow up by WhatsApp or email with the quote, schedule, "
                "and manual bank transfer or DuitNow instructions if payment is needed."
            ),
            payment_note=(
                "Online payment gateway is not enabled yet. Payment and onboarding "
                "are confirmed manually after discussion."
            ),
        )
        self._records[record_id] = record
        return record

    def get(self, record_id: str) -> SiteRecord | None:
        return self._records.get(record_id)

    def clear(self) -> None:
        self._records.clear()
        self._counter = count(1)


site_store = SiteRecordStore()
