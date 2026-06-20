from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime

from services.mock_data import MOCK_PROMOTIONS
from services.models import Promotion


class PromotionEngine:
    def __init__(self, promotions: Iterable[Promotion] = MOCK_PROMOTIONS) -> None:
        self._promotions = tuple(promotions)

    def eligible_for_branch(
        self,
        branch_id: str,
        *,
        now: datetime | None = None,
    ) -> list[Promotion]:
        current_time = now or datetime.now(UTC)
        return [
            promotion
            for promotion in self._promotions
            if promotion.active
            and promotion.branch_id == branch_id
            and promotion.valid_from <= current_time <= promotion.valid_to
        ]

    def match(
        self,
        product_id: str,
        branch_id: str,
        *,
        now: datetime | None = None,
    ) -> list[Promotion]:
        return [
            promotion
            for promotion in self.eligible_for_branch(branch_id, now=now)
            if product_id in promotion.product_ids
        ]
