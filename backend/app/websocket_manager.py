from __future__ import annotations

from collections import defaultdict

from fastapi import WebSocket


AVATAR_STATES = {
    "idle",
    "listening",
    "thinking",
    "speaking",
    "error",
    "pharmacist_escalation",
}


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[session_id].add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        connections = self._connections.get(session_id)
        if connections is None:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(session_id, None)

    async def send_state(
        self,
        websocket: WebSocket,
        session_id: str,
        state: str,
        detail: str,
    ) -> None:
        await websocket.send_json(
            {
                "type": "avatar_state",
                "session_id": session_id,
                "state": state,
                "detail": detail,
            }
        )

    async def send_error(
        self,
        websocket: WebSocket,
        session_id: str,
        detail: str,
    ) -> None:
        await websocket.send_json(
            {
                "type": "error",
                "session_id": session_id,
                "detail": detail,
            }
        )

    async def broadcast_state(
        self,
        session_id: str,
        state: str,
        detail: str,
    ) -> None:
        event = {
            "type": "avatar_state",
            "session_id": session_id,
            "state": state,
            "detail": detail,
        }
        stale: list[WebSocket] = []
        for websocket in tuple(self._connections.get(session_id, ())):
            try:
                await websocket.send_json(event)
            except RuntimeError:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(session_id, websocket)


manager = ConnectionManager()
