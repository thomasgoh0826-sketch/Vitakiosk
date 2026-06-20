from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    provider_mode: str
    openai_api_key: str
    elevenlabs_api_key: str
    elevenlabs_voice_id: str
    ollama_base_url: str
    vitaflow_api_base_url: str

    @classmethod
    def from_environment(cls) -> "Settings":
        return cls(
            provider_mode=os.getenv("VITAKIOSK_PROVIDER_MODE", "mock"),
            openai_api_key=os.getenv("OPENAI_API_KEY", ""),
            elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY", ""),
            elevenlabs_voice_id=os.getenv("ELEVENLABS_VOICE_ID", ""),
            ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            vitaflow_api_base_url=os.getenv("VITAFLOW_API_BASE_URL", ""),
        )

    def validate(self) -> None:
        if self.provider_mode != "mock":
            raise RuntimeError("Only mock provider mode is enabled in this demo")
