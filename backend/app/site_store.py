from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


RUNTIME_DIR = Path("tmp/site-dev")
RECORDS_FILE = RUNTIME_DIR / "records.jsonl"


def _safe_record(record: dict[str, object]) -> dict[str, object]:
    return {
        key: value
        for key, value in record.items()
        if key not in {"card_number", "payment_card", "secret", "token"}
    }


def create_record(kind: str, payload: dict[str, object]) -> dict[str, object]:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    record = _safe_record(
        {
            "id": f"SITE-{uuid4().hex[:10].upper()}",
            "kind": kind,
            "status": _initial_status(kind),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
            "source": "mock_site_runtime",
        }
    )
    with RECORDS_FILE.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, ensure_ascii=True) + "\n")
    return record


def _initial_status(kind: str) -> str:
    return {
        "lead": "inquiry",
        "order": "quote_requested",
        "booking": "requested",
        "project": "inquiry",
    }.get(kind, "draft")
