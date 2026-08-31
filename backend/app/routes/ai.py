from __future__ import annotations

from dataclasses import asdict
from typing import Any

from fastapi import APIRouter

from backend.app.dependencies import ai_brain
from backend.app.models import AIRequest
from backend.app.websocket_manager import manager


router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/respond")
async def respond(request: AIRequest) -> dict[str, Any]:
    await manager.broadcast_state(request.session_id, "thinking", "classifying request")
    result = ai_brain.respond(
        request.text,
        request.branch_id,
        session_id=request.session_id,
        preferred_language=request.preferred_language,
        current_product_id=request.current_product_id,
    )
    if result.requires_pharmacist:
        await manager.broadcast_state(
            request.session_id,
            "pharmacist_escalation",
            result.safety_reason or "pharmacist requested",
        )
    return asdict(result)
