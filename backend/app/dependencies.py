from backend.app.config import Settings
from services.providers import create_provider_bundle


settings = Settings.from_environment()
provider_bundle = create_provider_bundle(settings)

vitaflow = provider_bundle.vitaflow
promotion_engine = provider_bundle.promotion_engine
leaflet_engine = provider_bundle.leaflet_engine
poster_engine = provider_bundle.poster_engine
guardrails = provider_bundle.guardrails
purchasing_store = provider_bundle.purchasing_store
escalation_store = provider_bundle.escalation_store
stt = provider_bundle.stt
tts = provider_bundle.tts
ai_brain = provider_bundle.ai_brain
vision = provider_bundle.vision
