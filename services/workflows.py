from __future__ import annotations

from typing import Protocol

from services.models import Escalation, PurchasingQuery


class _VitaFlowEscalationClient(Protocol):
    def create_pharmacist_query(
        self,
        reason: str,
        branch_id: str,
        *,
        session_id: str | None = None,
    ) -> dict[str, object] | None: ...


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

    def create(
        self,
        reason: str,
        branch_id: str,
        *,
        session_id: str | None = None,
    ) -> Escalation:
        del session_id
        item = Escalation(
            id=f"ESC-{len(self._items) + 1:04d}",
            reason=reason,
            branch_id=branch_id,
        )
        self._items.append(item)
        return item

    def clear(self) -> None:
        self._items.clear()


class VitaFlowEscalationStore:
    def __init__(self, vitaflow: _VitaFlowEscalationClient) -> None:
        self._vitaflow = vitaflow
        self._items: list[Escalation] = []

    @property
    def items(self) -> tuple[Escalation, ...]:
        return tuple(self._items)

    def create(
        self,
        reason: str,
        branch_id: str,
        *,
        session_id: str | None = None,
    ) -> Escalation:
        case = self._vitaflow.create_pharmacist_query(
            reason,
            branch_id,
            session_id=session_id,
        )
        if case is None:
            item = Escalation(
                id="ERP-UNAVAILABLE",
                reason=reason,
                branch_id=branch_id,
                status="unavailable",
                source="vitaflow_erp_unavailable",
            )
        else:
            item = Escalation(
                id=str(case.get("caseCode") or case.get("case_code") or case.get("id") or ""),
                reason=reason,
                branch_id=str(case.get("branchCode") or case.get("branch_id") or branch_id),
                status=str(case.get("status") or "New"),
                source="vitaflow_erp",
            )
        self._items.append(item)
        return item

    def clear(self) -> None:
        self._items.clear()
