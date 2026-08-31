import json
from dataclasses import replace

from fastapi.testclient import TestClient
import pytest

from backend.app.config import Settings


def test_agnes_readiness_uses_fast_authenticated_models_probe(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.app import main

    active_settings = replace(
        main.settings,
        ai_provider="agnes",
        vision_provider="agnes",
        agnes_api_key="test-agnes-key",
        agnes_base_url="https://apihub.agnes-ai.com/v1/chat/completions",
    )
    observed: dict[str, object] = {}

    class Response:
        status_code = 200

        @staticmethod
        def json() -> dict[str, object]:
            return {"data": [{"id": "agnes-2.0-flash"}]}

    def fake_get(
        url: str,
        *,
        headers: dict[str, str],
        timeout: int,
    ) -> Response:
        observed.update(url=url, headers=headers, timeout=timeout)
        return Response()

    monkeypatch.setattr(main.httpx, "get", fake_get)

    assert main.check_agnes_reachable(active_settings) is True
    assert observed == {
        "url": "https://apihub.agnes-ai.com/v1/models",
        "headers": {"Authorization": "Bearer test-agnes-key"},
        "timeout": 3,
    }


def test_agnes_readiness_rejects_invalid_models_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.app import main

    active_settings = replace(
        main.settings,
        ai_provider="agnes",
        vision_provider="agnes",
        agnes_api_key="test-agnes-key",
    )

    class Response:
        status_code = 200

        @staticmethod
        def json() -> dict[str, object]:
            return {"unexpected": "payload"}

    monkeypatch.setattr(main.httpx, "get", lambda *args, **kwargs: Response())

    assert main.check_agnes_reachable(active_settings) is False


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
        "http://127.0.0.1:5176",
        "http://localhost:5176",
        "http://127.0.0.1:5177",
        "http://localhost:5177",
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
        "agnes_reachable": False,
        "vitaflow_reachable": False,
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
                vitaflow_assistance_provider="mock",
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
            elevenlabs_stt_model_id="private-stt-model",
            piper_command="private-piper",
            piper_model_path="private-piper-model.onnx",
            piper_config_path="private-piper-model.json",
            piper_speaker="private-speaker",
            ollama_base_url="http://127.0.0.1:11434",
            ollama_model="qwen2.5:7b",
            ollama_timeout_seconds=20,
            agnes_api_key="secret-agnes-key",
            agnes_base_url="https://private-agnes.example",
            agnes_model="private-agnes-model",
            agnes_timeout_seconds=20,
            agnes_vision_model="private-agnes-vision-model",
            vitaflow_api_base_url="https://private-vitaflow.example",
            vitaflow_api_token="private-vitaflow-token",
        ),
    )
    monkeypatch.setattr(main, "check_ollama_reachable", lambda _settings: True)
    monkeypatch.setattr(main, "check_agnes_reachable", lambda _settings: False)
    monkeypatch.setattr(main, "check_vitaflow_reachable", lambda _settings: False)

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
        "agnes_reachable": False,
        "vitaflow_reachable": False,
        "model": "qwen2.5:7b",
    }
    serialized = response.text.casefold()
    assert "secret" not in serialized
    assert "private" not in serialized
    assert ".models" not in serialized


def test_runtime_status_reports_live_readiness_without_secrets(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.app import main

    monkeypatch.setattr(main, "check_agnes_reachable", lambda _settings: True)
    monkeypatch.setattr(main, "check_vitaflow_reachable", lambda _settings: True)

    response = client.get("/api/runtime/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["agnes_reachable"] is True
    assert payload["vitaflow_reachable"] is True
    serialized = json.dumps(payload).casefold()
    assert "api_key" not in serialized
    assert "authorization" not in serialized
    assert "secret" not in serialized
