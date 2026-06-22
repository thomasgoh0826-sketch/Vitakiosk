from __future__ import annotations

from dataclasses import dataclass

from backend.app.config import Settings
from services.ai_brain import LiveAIPlaceholder, MockAIBrain
from services.contracts import (
    AIBrain,
    ProductVisionAdapter,
    STTAdapter,
    TTSAdapter,
    VitaFlowAdapter,
)
from services.leaflet_engine import LeafletEngine
from services.openai_stt import OpenAIWhisperSTT
from services.poster_engine import PosterEngine
from services.product_vision import BarcodeOCRVision, MockProductVision
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.vitaflow_api import MockVitaFlowAPI, ReadOnlyVitaFlowAPI
from services.voice_ai import ElevenLabsTTS, MockSTT, MockTTS
from services.workflows import EscalationStore, PurchasingQueryStore


@dataclass(frozen=True)
class ProviderBundle:
    stt: STTAdapter
    tts: TTSAdapter
    ai_brain: AIBrain
    vitaflow: VitaFlowAdapter
    vision: ProductVisionAdapter
    promotion_engine: PromotionEngine
    leaflet_engine: LeafletEngine
    poster_engine: PosterEngine
    guardrails: SafetyGuardrails
    purchasing_store: PurchasingQueryStore
    escalation_store: EscalationStore
    summary: dict[str, str]


def _require(value: str, env_var: str, provider: str) -> str:
    if not value.strip():
        raise RuntimeError(f"{env_var} is required when {provider} is enabled")
    return value


def create_provider_bundle(settings: Settings) -> ProviderBundle:
    """Create independently swappable provider adapters.

    Mock adapters remain the default. Live providers are returned only when
    their explicit provider selector is set; credentials alone never switch an
    adapter to live behavior. STT has an implemented OpenAI Whisper adapter;
    other live-provider selectors remain reviewed placeholders.
    """

    settings.validate()

    promotion_engine = PromotionEngine()
    leaflet_engine = LeafletEngine()
    poster_engine = PosterEngine(promotion_engine)
    guardrails = SafetyGuardrails()
    purchasing_store = PurchasingQueryStore()
    escalation_store = EscalationStore()

    vitaflow = _create_vitaflow(settings)
    stt = _create_stt(settings)
    tts = _create_tts(settings)
    vision = _create_vision(settings)
    ai_brain = _create_ai_brain(
        settings,
        vitaflow=vitaflow,
        promotion_engine=promotion_engine,
        leaflet_engine=leaflet_engine,
        guardrails=guardrails,
        purchasing_store=purchasing_store,
        escalation_store=escalation_store,
    )

    return ProviderBundle(
        stt=stt,
        tts=tts,
        ai_brain=ai_brain,
        vitaflow=vitaflow,
        vision=vision,
        promotion_engine=promotion_engine,
        leaflet_engine=leaflet_engine,
        poster_engine=poster_engine,
        guardrails=guardrails,
        purchasing_store=purchasing_store,
        escalation_store=escalation_store,
        summary=settings.provider_summary,
    )


def _create_stt(settings: Settings) -> STTAdapter:
    if settings.stt_provider == "mock":
        return MockSTT()
    return OpenAIWhisperSTT(
        api_key=_require(
            settings.openai_api_key,
            "OPENAI_API_KEY",
            "STT_PROVIDER=openai_whisper",
        ),
    )


def _create_tts(settings: Settings) -> TTSAdapter:
    if settings.tts_provider == "mock":
        return MockTTS()
    return ElevenLabsTTS(
        api_key=_require(
            settings.elevenlabs_api_key,
            "ELEVENLABS_API_KEY",
            "TTS_PROVIDER=elevenlabs",
        ),
        voice_id=_require(
            settings.elevenlabs_voice_id,
            "ELEVENLABS_VOICE_ID",
            "TTS_PROVIDER=elevenlabs",
        ),
    )


def _create_ai_brain(
    settings: Settings,
    *,
    vitaflow: VitaFlowAdapter,
    promotion_engine: PromotionEngine,
    leaflet_engine: LeafletEngine,
    guardrails: SafetyGuardrails,
    purchasing_store: PurchasingQueryStore,
    escalation_store: EscalationStore,
) -> AIBrain:
    if settings.ai_provider == "mock":
        return MockAIBrain(
            vitaflow=vitaflow,
            promotion_engine=promotion_engine,
            leaflet_engine=leaflet_engine,
            guardrails=guardrails,
            purchasing_store=purchasing_store,
            escalation_store=escalation_store,
        )
    if settings.ai_provider == "openai":
        _require(settings.openai_api_key, "OPENAI_API_KEY", "AI_PROVIDER=openai")
    if settings.ai_provider == "ollama":
        _require(settings.ollama_base_url, "OLLAMA_BASE_URL", "AI_PROVIDER=ollama")
    return LiveAIPlaceholder(
        provider_name=settings.ai_provider,
        guardrails=guardrails,
        escalation_store=escalation_store,
    )


def _create_vitaflow(settings: Settings) -> VitaFlowAdapter:
    if settings.vitaflow_provider == "mock":
        return MockVitaFlowAPI()
    return ReadOnlyVitaFlowAPI(
        base_url=_require(
            settings.vitaflow_api_base_url,
            "VITAFLOW_API_BASE_URL",
            "VITAFLOW_PROVIDER=readonly_api",
        ),
    )


def _create_vision(settings: Settings) -> ProductVisionAdapter:
    if settings.vision_provider == "mock":
        return MockProductVision()
    return BarcodeOCRVision()
