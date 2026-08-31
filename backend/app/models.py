from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AIRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=80)
    text: str = Field(min_length=1, max_length=500)
    branch_id: str = Field(min_length=1, max_length=40)
    preferred_language: Literal["en", "zh", "ms", "auto"] = "auto"
    current_product_id: str | None = Field(default=None, min_length=1, max_length=80)


class TTSRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=80)
    text: str = Field(min_length=1, max_length=1_000)


class PurchasingQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=200)
    branch_id: str = Field(min_length=1, max_length=40)


class EscalationRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=300)
    branch_id: str = Field(min_length=1, max_length=40)
    session_id: str | None = Field(default=None, min_length=1, max_length=80)
