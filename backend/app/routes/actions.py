from __future__ import annotations

from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, status

from backend.app.dependencies import escalation_store, purchasing_store
from backend.app.models import EscalationRequest, PurchasingQueryRequest
from backend.app.websocket_manager import manager


router = APIRouter(prefix="/api", tags=["actions"])


@router.post("/purchasing-query", status_code=status.HTTP_201_CREATED)
def create_purchasing_query(request: PurchasingQueryRequest) -> dict[str, Any]:
    return asdict(purchasing_store.create(request.query, request.branch_id))


@router.post("/escalate-pharmacist", status_code=status.HTTP_201_CREATED)
async def escalate_pharmacist(request: EscalationRequest) -> dict[str, Any]:
    escalation = escalation_store.create(request.reason, request.branch_id)
    if request.session_id:
        await manager.broadcast_state(
            request.session_id,
            "pharmacist_escalation",
            request.reason,
        )
    return asdict(escalation)
