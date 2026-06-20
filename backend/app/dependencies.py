from services.ai_brain import MockAIBrain
from services.poster_engine import PosterEngine
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.vitaflow_api import MockVitaFlowAPI
from services.voice_ai import MockSTT, MockTTS
from services.workflows import EscalationStore, PurchasingQueryStore


vitaflow = MockVitaFlowAPI()
promotion_engine = PromotionEngine()
poster_engine = PosterEngine(promotion_engine)
guardrails = SafetyGuardrails()
purchasing_store = PurchasingQueryStore()
escalation_store = EscalationStore()
stt = MockSTT()
tts = MockTTS()
ai_brain = MockAIBrain(
    vitaflow=vitaflow,
    promotion_engine=promotion_engine,
    guardrails=guardrails,
    purchasing_store=purchasing_store,
    escalation_store=escalation_store,
)
