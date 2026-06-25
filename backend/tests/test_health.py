from fastapi.testclient import TestClient
import pytest

from backend.app.config import Settings


def test_health_reports_mock_mode(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "vitakiosk-api",
        "provider_mode": "mock",
        "provider_summary": {
            "stt": "mock",
            "tts": "mock",
            "ai": "mock",
            "vitaflow": "mock",
            "vision": "mock",
        },
    }


@pytest.mark.parametrize(
    "origin",
    [
        "http://127.0.0.1:5175",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
)
def test_local_dev_cors_allows_vite_ports(client: TestClient, origin: str) -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_runtime_status_reports_safe_mock_defaults(client: TestClient) -> None:
    response = client.get("/api/runtime/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "stt_provider": "mock",
        "ai_provider": "mock",
        "tts_provider": "mock",
        "vitaflow_provider": "mock",
        "vision_provider": "mock",
        "ollama_reachable": False,
        "model": "qwen2.5:7b",
    }
    serialized = response.text.casefold()
    assert "api_key" not in serialized
    assert "openai" not in serialized
    assert "elevenlabs" not in serialized
    assert ".models" not in serialized


def test_runtime_status_reports_local_ollama_profile_without_secrets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.app import main

    monkeypatch.setattr(
        main,
        "settings",
        Settings(
            provider_mode="mock",
            stt_provider="faster_whisper",
            tts_provider="mock",
            ai_provider="ollama",
            vitaflow_provider="mock",
            vision_provider="mock",
            openai_api_key="secret-openai-key",
            faster_whisper_model_size="small",
            faster_whisper_device="cpu",
            faster_whisper_compute_type="int8",
            faster_whisper_model_dir=".models/whisper",
            faster_whisper_language="auto",
            stt_low_confidence_threshold=0.55,
            elevenlabs_api_key="secret-elevenlabs-key",
            elevenlabs_voice_id="private-voice",
            elevenlabs_model_id="private-model",
            ollama_base_url="http://127.0.0.1:11434",
            ollama_model="qwen2.5:7b",
            ollama_timeout_seconds=20,
            vitaflow_api_base_url="https://private-vitaflow.example",
        ),
    )
    monkeypatch.setattr(main, "check_ollama_reachable", lambda _settings: True)

    with TestClient(main.app) as test_client:
        response = test_client.get("/api/runtime/status")

    assert response.status_code == 200
    assert response.json() == {
        "stt_provider": "faster_whisper",
        "ai_provider": "ollama",
        "tts_provider": "mock",
        "vitaflow_provider": "mock",
        "vision_provider": "mock",
        "ollama_reachable": True,
        "model": "qwen2.5:7b",
    }
    serialized = response.text.casefold()
    assert "secret" not in serialized
    assert "private" not in serialized
    assert ".models" not in serialized
