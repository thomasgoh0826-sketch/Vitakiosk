from __future__ import annotations

from services.models import Escalation, PurchasingQuery


class PurchasingQueryStore:
    def __init__(self) -> None:
        self._items: list[PurchasingQuery] = []

    @property
    def items(self) -> tuple[PurchasingQuery, ...]:
        return tuple(self._items)

    def create(self, query: str, branch_id: str) -> PurchasingQuery:
        item = PurchasingQuery(
            id=f"PQ-{len(self._items) + 1:04d}",
            query=query.strip(),
            branch_id=branch_id,
        )
        self._items.append(item)
        return item

    def clear(self) -> None:
        self._items.clear()


class EscalationStore:
    def __init__(self) -> None:
        self._items: list[Escalation] = []

    @property
    def items(self) -> tuple[Escalation, ...]:
        return tuple(self._items)

    def create(self, reason: str, branch_id: str) -> Escalation:
        item = Escalation(
            id=f"ESC-{len(self._items) + 1:04d}",
            reason=reason,
            branch_id=branch_id,
        )
        self._items.append(item)
        return item

    def clear(self) -> None:
        self._items.clear()
