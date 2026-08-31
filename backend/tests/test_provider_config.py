import pytest

from backend.app.config import Settings
from services.ai_brain import MockAIBrain
from services.agnes_ai import AgnesAIBrain
from services.agnes_vision import AgnesProductVision
from services.faster_whisper_stt import FasterWhisperSTT
from services.elevenlabs_stt import ElevenLabsSTT
from services.leaflet_engine import VitaFlowLeafletEngine
from services.ollama_ai import OllamaAIBrain
from services.openai_stt import OpenAIWhisperSTT
from services.product_vision import LocalProductScanVision, MockProductVision
from services.providers import create_provider_bundle
from services.vitaflow_api import MockVitaFlowAPI
from services.voice_ai import ElevenLabsTTS, MockSTT, MockTTS, PiperTTS
from services.workflows import EscalationStore, VitaFlowEscalationStore


PROVIDER_ENV = (
    "VITAKIOSK_PROVIDER_MODE",
    "STT_PROVIDER",
    "TTS_PROVIDER",
    "AI_PROVIDER",
    "VITAFLOW_PROVIDER",
    "VITAFLOW_ASSISTANCE_PROVIDER",
    "VISION_PROVIDER",
    "OPENAI_API_KEY",
    "FASTER_WHISPER_MODEL_SIZE",
    "FASTER_WHISPER_DEVICE",
    "FASTER_WHISPER_COMPUTE_TYPE",
    "FASTER_WHISPER_MODEL_DIR",
    "FASTER_WHISPER_LANGUAGE",
    "STT_LOW_CONFIDENCE_THRESHOLD",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_VOICE_ID",
    "ELEVENLABS_MODEL_ID",
    "ELEVENLABS_STT_MODEL_ID",
    "PIPER_COMMAND",
    "PIPER_MODEL_PATH",
    "PIPER_CONFIG_PATH",
    "PIPER_SPEAKER",
    "OLLAMA_BASE_URL",
    "OLLAMA_MODEL",
    "OLLAMA_TIMEOUT_SECONDS",
    "AGNES_API_KEY",
    "AGNES_BASE_URL",
    "AGNES_MODEL",
    "AGNES_TIMEOUT_SECONDS",
    "AGNES_VISION_MODEL",
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
    assert settings.vitaflow_assistance_provider == "mock"
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
    assert isinstance(bundle.escalation_store, EscalationStore)
    assert bundle.summary == {
        "stt": "mock",
        "tts": "mock",
        "ai": "mock",
        "vitaflow": "mock",
        "vision": "mock",
    }


def test_local_product_scan_vision_requires_explicit_provider_selection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("VISION_PROVIDER", "local_product_scan")

    bundle = create_provider_bundle(Settings.from_environment())

    assert bundle.vision.__class__.__name__ == "LocalProductScanVision"
    assert bundle.summary["vision"] == "local_product_scan"


def test_credentials_do_not_auto_enable_live_providers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("OPENAI_API_KEY", "not-real-openai-test-value")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "eleven-not-real-test-value")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-not-real-test-value")
    monkeypatch.setenv("ELEVENLABS_MODEL_ID", "eleven-mock-model")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setenv("VITAFLOW_API_BASE_URL", "https://vitaflow.invalid")
    monkeypatch.setenv("FASTER_WHISPER_MODEL_SIZE", "small")
    monkeypatch.setenv("FASTER_WHISPER_MODEL_DIR", ".models/whisper")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.stt, MockSTT)
    assert isinstance(bundle.tts, MockTTS)
    assert isinstance(bundle.ai_brain, MockAIBrain)
    assert isinstance(bundle.vitaflow, MockVitaFlowAPI)
    assert isinstance(bundle.vision, MockProductVision)
    assert isinstance(bundle.escalation_store, EscalationStore)


def test_vitaflow_assistance_requires_explicit_provider_selection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("VITAFLOW_PROVIDER", "readonly_api")
    monkeypatch.setenv("VITAFLOW_ASSISTANCE_PROVIDER", "vitaflow_api")
    monkeypatch.setenv("VITAFLOW_API_BASE_URL", "http://127.0.0.1:3100")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.escalation_store, VitaFlowEscalationStore)
    assert isinstance(bundle.leaflet_engine, VitaFlowLeafletEngine)


def test_vitaflow_assistance_rejects_live_delivery_without_live_catalog(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("VITAFLOW_ASSISTANCE_PROVIDER", "vitaflow_api")

    with pytest.raises(RuntimeError, match="VITAFLOW_PROVIDER=readonly_api"):
        create_provider_bundle(Settings.from_environment())


def test_openai_whisper_stt_requires_explicit_provider_selection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("STT_PROVIDER", "openai_whisper")
    monkeypatch.setenv("OPENAI_API_KEY", "not-real-openai-test-value")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.stt, OpenAIWhisperSTT)
    assert isinstance(bundle.tts, MockTTS)
    assert isinstance(bundle.ai_brain, MockAIBrain)
    assert isinstance(bundle.vitaflow, MockVitaFlowAPI)


def test_openai_whisper_stt_fails_closed_without_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("STT_PROVIDER", "openai_whisper")

    with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
        create_provider_bundle(Settings.from_environment())


def test_elevenlabs_tts_requires_explicit_provider_selection_without_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("TTS_PROVIDER", "elevenlabs")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "eleven-not-real-test-value")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-not-real-test-value")
    monkeypatch.setenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.stt, MockSTT)
    assert isinstance(bundle.tts, ElevenLabsTTS)
    assert bundle.tts.provider_name == "elevenlabs"
    assert isinstance(bundle.ai_brain, MockAIBrain)
    assert isinstance(bundle.vitaflow, MockVitaFlowAPI)


def test_elevenlabs_tts_fails_closed_without_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("TTS_PROVIDER", "elevenlabs")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID", "voice-not-real-test-value")

    with pytest.raises(RuntimeError, match="ELEVENLABS_API_KEY"):
        create_provider_bundle(Settings.from_environment())


def test_elevenlabs_stt_requires_explicit_provider_selection_without_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("STT_PROVIDER", "elevenlabs")
    monkeypatch.setenv("ELEVENLABS_API_KEY", "eleven-not-real-test-value")
    monkeypatch.setenv("ELEVENLABS_STT_MODEL_ID", "scribe_v2")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.stt, ElevenLabsSTT)
    assert bundle.stt.provider_name == "elevenlabs"
    assert isinstance(bundle.tts, MockTTS)


def test_elevenlabs_stt_fails_closed_without_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("STT_PROVIDER", "elevenlabs")

    with pytest.raises(RuntimeError, match="ELEVENLABS_API_KEY"):
        create_provider_bundle(Settings.from_environment())


def test_piper_tts_requires_explicit_provider_selection_without_running_piper(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("TTS_PROVIDER", "piper")
    monkeypatch.setenv("PIPER_COMMAND", "piper")
    monkeypatch.setenv("PIPER_MODEL_PATH", "local-demo-voice.onnx")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.stt, MockSTT)
    assert isinstance(bundle.tts, PiperTTS)
    assert bundle.tts.provider_name == "piper"
    assert isinstance(bundle.ai_brain, MockAIBrain)
    assert isinstance(bundle.vitaflow, MockVitaFlowAPI)


def test_piper_tts_fails_closed_without_model_path() -> None:
    adapter = PiperTTS(command="piper")

    with pytest.raises(RuntimeError, match="PIPER_MODEL_PATH"):
        adapter.synthesize("VitaKiosk Piper test.")


def test_faster_whisper_stt_requires_explicit_provider_selection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("STT_PROVIDER", "faster_whisper")
    monkeypatch.setenv("FASTER_WHISPER_MODEL_SIZE", "small")
    monkeypatch.setenv("FASTER_WHISPER_DEVICE", "cpu")
    monkeypatch.setenv("FASTER_WHISPER_COMPUTE_TYPE", "int8")
    monkeypatch.setenv("FASTER_WHISPER_MODEL_DIR", ".models/whisper")
    monkeypatch.setenv("STT_LOW_CONFIDENCE_THRESHOLD", "0.55")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.stt, FasterWhisperSTT)
    assert bundle.stt.provider_name == "faster_whisper"
    assert isinstance(bundle.tts, MockTTS)
    assert isinstance(bundle.ai_brain, MockAIBrain)
    assert isinstance(bundle.vitaflow, MockVitaFlowAPI)


def test_ollama_ai_requires_explicit_provider_selection_without_calling_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://localhost:11434")
    monkeypatch.setenv("OLLAMA_MODEL", "qwen2.5:7b")
    monkeypatch.setenv("OLLAMA_TIMEOUT_SECONDS", "20")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.stt, MockSTT)
    assert isinstance(bundle.tts, MockTTS)
    assert isinstance(bundle.ai_brain, OllamaAIBrain)
    assert bundle.ai_brain.model == "qwen2.5:7b"
    assert isinstance(bundle.vitaflow, MockVitaFlowAPI)


def test_ollama_settings_have_local_defaults(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)

    settings = Settings.from_environment()

    assert settings.ollama_base_url == "http://localhost:11434"
    assert settings.ollama_model == "qwen2.5:7b"
    assert settings.ollama_timeout_seconds == 20


def test_agnes_ai_requires_explicit_provider_selection_without_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("AI_PROVIDER", "agnes")
    monkeypatch.setenv("AGNES_API_KEY", "agnes-not-real-test-value")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.ai_brain, AgnesAIBrain)
    assert bundle.ai_brain.provider_name == "agnes"
    assert bundle.summary["ai"] == "agnes"
    assert "key" not in " ".join(bundle.summary.values()).casefold()


def test_agnes_ai_fails_closed_without_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("AI_PROVIDER", "agnes")

    with pytest.raises(RuntimeError, match="AGNES_API_KEY"):
        create_provider_bundle(Settings.from_environment())


def test_agnes_settings_have_safe_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    clear_provider_env(monkeypatch)

    settings = Settings.from_environment()

    assert settings.agnes_base_url == "https://apihub.agnes-ai.com"
    assert settings.agnes_model == "agnes-2.0-flash"
    assert settings.agnes_timeout_seconds == 20
    assert settings.agnes_vision_model == "agnes-2.5-flash"


def test_agnes_vision_requires_explicit_provider_selection_without_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("VISION_PROVIDER", "agnes")
    monkeypatch.setenv("AGNES_API_KEY", "agnes-not-real-test-value")

    bundle = create_provider_bundle(Settings.from_environment())

    assert isinstance(bundle.vision, AgnesProductVision)
    assert isinstance(bundle.vision.fallback, LocalProductScanVision)
    assert bundle.summary["vision"] == "agnes"


def test_agnes_vision_fails_closed_without_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("VISION_PROVIDER", "agnes")

    with pytest.raises(RuntimeError, match="AGNES_API_KEY"):
        create_provider_bundle(Settings.from_environment())


def test_elevenlabs_settings_have_safe_model_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)

    settings = Settings.from_environment()

    assert settings.elevenlabs_model_id == "eleven_multilingual_v2"
    assert settings.elevenlabs_stt_model_id == "scribe_v2"


def test_invalid_provider_selector_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    clear_provider_env(monkeypatch)
    monkeypatch.setenv("STT_PROVIDER", "live_magic")

    with pytest.raises(RuntimeError, match="STT_PROVIDER"):
        Settings.from_environment().validate()
