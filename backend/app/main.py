from __future__ import annotations

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import Settings
from backend.app.routes import actions, ai, catalog, voice
from backend.app.websocket_manager import AVATAR_STATES, manager


settings = Settings.from_environment()
settings.validate()

LOCAL_DEV_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

app = FastAPI(title="VitaKiosk API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=LOCAL_DEV_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(voice.router)
app.include_router(ai.router)
app.include_router(catalog.router)
app.include_router(actions.router)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "vitakiosk-api",
        "provider_mode": settings.provider_mode,
        "provider_summary": settings.provider_summary,
    }


def check_ollama_reachable(active_settings: Settings) -> bool:
    if active_settings.ai_provider != "ollama":
        return False

    base_url = active_settings.ollama_base_url.rstrip("/")
    timeout_seconds = min(max(active_settings.ollama_timeout_seconds, 1), 3)
    try:
        response = httpx.get(f"{base_url}/api/tags", timeout=timeout_seconds)
        return response.status_code < 500
    except httpx.HTTPError:
        return False


@app.get("/api/runtime/status")
def runtime_status() -> dict[str, object]:
    return {
        "stt_provider": settings.stt_provider,
        "ai_provider": settings.ai_provider,
        "tts_provider": settings.tts_provider,
        "vitaflow_provider": settings.vitaflow_provider,
        "vision_provider": settings.vision_provider,
        "ollama_reachable": check_ollama_reachable(settings),
        "model": settings.ollama_model,
    }


@app.websocket("/ws/kiosk/{session_id}")
async def kiosk_socket(websocket: WebSocket, session_id: str) -> None:
    await manager.connect(session_id, websocket)
    await manager.send_state(websocket, session_id, "idle", "connected")
    try:
        while True:
            message = await websocket.receive_json()
            state = message.get("state")
            if message.get("type") != "client_state" or state not in AVATAR_STATES:
                await manager.send_error(
                    websocket,
                    session_id,
                    "invalid avatar state",
                )
                continue
            await manager.broadcast_state(session_id, state, "client update")
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
