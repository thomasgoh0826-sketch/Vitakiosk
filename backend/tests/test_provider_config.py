import pytest

from backend.app.config import Settings
from services.ai_brain import MockAIBrain
from services.product_vision import MockProductVision
from services.providers import create_provider_bundle
from services.vitaflow_api import MockVitaFlowAPI
from services.voice_ai import MockSTT, MockTTS


PROVIDER_ENV = (
    "VITAKIOSK_PROVIDER_MODE",
    "STT_PROVIDER",
    "TTS_PROVIDER",
    "AI_PROVIDER",
    "VITAFLOW_PROVIDER",
    "VISION_PROVIDER",
    "OPENAI_API_KEY",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_VOICE_ID",
    "OLLAMA_BASE_URL",
    "VITAFLOW_API_BASE_URL",
)


def clear_provider_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in PROVIDER_ENV:
        monkeypatch.delenv(name, raising=False)


def test_settings_default_every_provider_to_mock(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)

    settings = Settings.from_environment()
    settings.validate()

    assert settings.provider_mode == "mock"
    assert settings.provider_summary == {
        "stt": "mock",
        "tts": "mock",
        "ai": "mock",
        "vitaflow": "mock",
        "vision": "mock",
    }


def test_provider_factory_returns_mock_bundle_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.stt, MockSTT)
    assert isinstance(bundle.tts, MockTTS)
    assert isinstance(bundle.ai_brain, MockAIBrain)
    assert isinstance(bundle.vitaflow, MockVitaFlowAPI)
    assert isinstance(bundle.vision, MockProductVision)
    assert bundle.summary == {
        "stt": "mock",
        "tts": "mock",
        "ai": "mock",
        "vitaflow": "mock",
        "vision": "mock",
    }


def test_credentials_do_not_auto_enable_live_providers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "not-real-openai-test-value")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "eleven-not-real-test-value")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-not-real-test-value")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setenv("VITAFLOW_API_BASE_URL", "https://vitaflow.invalid")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.stt, MockSTT)
    assert isinstance(bundle.tts, MockTTS)
    assert isinstance(bundle.ai_brain, MockAIBrain)
    assert isinstance(bundle.vitaflow, MockVitaFlowAPI)
    assert isinstance(bundle.vision, MockProductVision)


def test_invalid_provider_selector_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("STT_PROVIDER", "live_magic")

    with pytest.raises(RuntimeError, match="STT_PROVIDER"):
        Settings.from_environment().validate()
