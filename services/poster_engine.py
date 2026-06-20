from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from services.mock_data import MOCK_POSTERS
from services.models import Poster
from services.promotion_engine import PromotionEngine


class PosterEngine:
    def __init__(
        self,
        promotion_engine: PromotionEngine,
        posters: Iterable[Poster] = MOCK_POSTERS,
    ) -> None:
        self._promotion_engine = promotion_engine
        self._posters = tuple(posters)

    def idle(self, branch_id: str, *, now: datetime | None = None) -> list[Poster]:
        eligible_ids = {
            promotion.id
            for promotion in self._promotion_engine.eligible_for_branch(
                branch_id,
                now=now,
            )
        }
        return [
            poster
            for poster in self._posters
            if poster.branch_id == branch_id and poster.promotion_id in eligible_ids
        ]
