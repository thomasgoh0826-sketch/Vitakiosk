from __future__ import annotations

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import Settings
from backend.app.websocket_manager import AVATAR_STATES, manager


settings = Settings.from_environment()
settings.validate()

from backend.app.routes import actions, ai, catalog, site, vision, voice  # noqa: E402

LOCAL_DEV_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://localhost:5177",
    "http://127.0.0.1:5177",
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
app.include_router(site.router)
app.include_router(vision.router)


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


def check_agnes_reachable(active_settings: Settings) -> bool:
    if (
        active_settings.ai_provider != "agnes"
        and active_settings.vision_provider != "agnes"
    ):
        return False
    if not active_settings.agnes_api_key:
        return False

    base_url = active_settings.agnes_base_url.rstrip("/")
    if base_url.endswith("/v1/chat/completions"):
        base_url = base_url[: -len("/chat/completions")]
    elif base_url.endswith("/chat/completions"):
        base_url = base_url[: -len("/chat/completions")]
    elif not base_url.endswith("/v1"):
        base_url = f"{base_url}/v1"
    endpoint = f"{base_url}/models"
    timeout_seconds = min(max(active_settings.agnes_timeout_seconds, 1), 3)
    try:
        response = httpx.get(
            endpoint,
            headers={"Authorization": f"Bearer {active_settings.agnes_api_key}"},
            timeout=timeout_seconds,
        )
        if not 200 <= response.status_code < 300:
            return False
        payload = response.json()
        return isinstance(payload, dict) and isinstance(payload.get("data"), list)
    except (httpx.HTTPError, ValueError):
        return False


def check_vitaflow_reachable(active_settings: Settings) -> bool:
    if active_settings.vitaflow_provider != "readonly_api":
        return False
    if not active_settings.vitaflow_api_base_url:
        return False

    headers = {}
    if active_settings.vitaflow_api_token:
        headers["Authorization"] = f"Bearer {active_settings.vitaflow_api_token}"
    try:
        response = httpx.get(
            f"{active_settings.vitaflow_api_base_url.rstrip('/')}/api/vitakiosk/catalog/products/search",
            headers=headers,
            params={
                "branchCode": "JK",
                "q": "__vitakiosk_readiness_probe_no_match__",
                "limit": 1,
            },
            timeout=3,
        )
        if not 200 <= response.status_code < 300:
            return False
        payload = response.json()
        return isinstance(payload, dict) and payload.get("ok") is True
    except (httpx.HTTPError, ValueError):
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
        "agnes_reachable": check_agnes_reachable(settings),
        "vitaflow_reachable": check_vitaflow_reachable(settings),
        "model": (
            settings.agnes_model
            if settings.ai_provider == "agnes"
            else settings.ollama_model
        ),
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
