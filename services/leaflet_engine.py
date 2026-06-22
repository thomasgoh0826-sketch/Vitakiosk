from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime

from services.mock_data import MOCK_LEAFLETS
from services.models import Leaflet, LeafletKind


class LeafletEngine:
    """Branch-aware leaflet selector for mock-first VitaFlow-ready data."""

    def __init__(self, leaflets: Iterable[Leaflet] = MOCK_LEAFLETS) -> None:
        self._leaflets = tuple(leaflets)

    def eligible_for_branch(
        self,
        branch_id: str,
        *,
        kind: LeafletKind | None = None,
        now: datetime | None = None,
    ) -> list[Leaflet]:
        current_time = now or datetime.now(UTC)
        matches = [
            leaflet
            for leaflet in self._leaflets
            if leaflet.active
            and leaflet.branch_id == branch_id
            and leaflet.valid_from <= current_time <= leaflet.valid_to
            and (kind is None or leaflet.kind is kind)
        ]
        return sorted(matches, key=lambda item: (item.display_priority, item.title))

    def for_product(
        self,
        product_id: str,
        branch_id: str,
        *,
        kind: LeafletKind | None = None,
        now: datetime | None = None,
    ) -> list[Leaflet]:
        return [
            leaflet
            for leaflet in self.eligible_for_branch(branch_id, kind=kind, now=now)
            if product_id in leaflet.product_ids
        ]

    def get(
        self,
        leaflet_id: str,
        branch_id: str,
        *,
        kind: LeafletKind | None = None,
        now: datetime | None = None,
    ) -> Leaflet | None:
        return next(
            (
                leaflet
                for leaflet in self.eligible_for_branch(branch_id, kind=kind, now=now)
                if leaflet.id == leaflet_id
            ),
            None,
        )
