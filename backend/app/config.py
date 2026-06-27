from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


ALLOWED_STT_PROVIDERS = frozenset({"mock", "openai_whisper", "faster_whisper"})
ALLOWED_TTS_PROVIDERS = frozenset({"mock", "elevenlabs"})
ALLOWED_AI_PROVIDERS = frozenset({"mock", "openai", "ollama"})
ALLOWED_VITAFLOW_PROVIDERS = frozenset({"mock", "readonly_api"})
ALLOWED_VISION_PROVIDERS = frozenset({"mock", "local_product_scan", "barcode_ocr"})


def _env_choice(name: str, default: str) -> str:
    return (os.getenv(name, default) or default).strip().casefold()


def _env_text(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _env_float(name: str, default: float) -> float:
    raw_value = os.getenv(name, str(default)).strip()
    try:
        return float(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a number") from exc


def _env_int(name: str, default: int) -> int:
    raw_value = os.getenv(name, str(default)).strip()
    try:
        return int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer") from exc


def _should_load_dotenv() -> bool:
    value = (os.getenv("VITAKIOSK_LOAD_DOTENV", "true") or "true").strip().casefold()
    return value not in {
        "0",
        "false",
        "no",
        "off",
    }


def _load_local_dotenv() -> None:
    if _should_load_dotenv():
        load_dotenv(override=False)


def _validate_choice(name: str, value: str, allowed: frozenset[str]) -> None:
    if value not in allowed:
        allowed_values = ", ".join(sorted(allowed))
        raise RuntimeError(f"{name} must be one of: {allowed_values}")


@dataclass(frozen=True)
class Settings:
    provider_mode: str
    stt_provider: str
    tts_provider: str
    ai_provider: str
    vitaflow_provider: str
    vision_provider: str
    openai_api_key: str
    faster_whisper_model_size: str
    faster_whisper_device: str
    faster_whisper_compute_type: str
    faster_whisper_model_dir: str
    faster_whisper_language: str
    stt_low_confidence_threshold: float
    elevenlabs_api_key: str
    elevenlabs_voice_id: str
    elevenlabs_model_id: str
    ollama_base_url: str
    ollama_model: str
    ollama_timeout_seconds: int
    vitaflow_api_base_url: str

    @classmethod
    def from_environment(cls) -> "Settings":
        _load_local_dotenv()
        return cls(
            provider_mode=_env_choice("VITAKIOSK_PROVIDER_MODE", "mock"),
            stt_provider=_env_choice("STT_PROVIDER", "mock"),
            tts_provider=_env_choice("TTS_PROVIDER", "mock"),
            ai_provider=_env_choice("AI_PROVIDER", "mock"),
            vitaflow_provider=_env_choice("VITAFLOW_PROVIDER", "mock"),
            vision_provider=_env_choice("VISION_PROVIDER", "mock"),
            openai_api_key=_env_text("OPENAI_API_KEY"),
            faster_whisper_model_size=_env_text("FASTER_WHISPER_MODEL_SIZE", "small"),
            faster_whisper_device=_env_text("FASTER_WHISPER_DEVICE", "cpu"),
            faster_whisper_compute_type=_env_text(
                "FASTER_WHISPER_COMPUTE_TYPE",
                "int8",
            ),
            faster_whisper_model_dir=_env_text(
                "FASTER_WHISPER_MODEL_DIR",
                ".models/whisper",
            ),
            faster_whisper_language=_env_choice("FASTER_WHISPER_LANGUAGE", "auto"),
            stt_low_confidence_threshold=_env_float(
                "STT_LOW_CONFIDENCE_THRESHOLD",
                0.55,
            ),
            elevenlabs_api_key=_env_text("ELEVENLABS_API_KEY"),
            elevenlabs_voice_id=_env_text("ELEVENLABS_VOICE_ID"),
            elevenlabs_model_id=_env_text(
                "ELEVENLABS_MODEL_ID",
                "eleven_multilingual_v2",
            ),
            ollama_base_url=_env_text("OLLAMA_BASE_URL", "http://localhost:11434"),
            ollama_model=_env_text("OLLAMA_MODEL", "qwen2.5:7b"),
            ollama_timeout_seconds=_env_int("OLLAMA_TIMEOUT_SECONDS", 20),
            vitaflow_api_base_url=_env_text("VITAFLOW_API_BASE_URL"),
        )

    @property
    def provider_summary(self) -> dict[str, str]:
        return {
            "stt": self.stt_provider,
            "tts": self.tts_provider,
            "ai": self.ai_provider,
            "vitaflow": self.vitaflow_provider,
            "vision": self.vision_provider,
        }

    def validate(self) -> None:
        if self.provider_mode != "mock":
            raise RuntimeError(
                "VITAKIOSK_PROVIDER_MODE must remain mock; enable live providers "
                "one layer at a time with the explicit provider selectors"
            )
        _validate_choice("STT_PROVIDER", self.stt_provider, ALLOWED_STT_PROVIDERS)
        _validate_choice("TTS_PROVIDER", self.tts_provider, ALLOWED_TTS_PROVIDERS)
        _validate_choice("AI_PROVIDER", self.ai_provider, ALLOWED_AI_PROVIDERS)
        _validate_choice(
            "VITAFLOW_PROVIDER",
            self.vitaflow_provider,
            ALLOWED_VITAFLOW_PROVIDERS,
        )
        _validate_choice(
            "VISION_PROVIDER",
            self.vision_provider,
            ALLOWED_VISION_PROVIDERS,
        )
