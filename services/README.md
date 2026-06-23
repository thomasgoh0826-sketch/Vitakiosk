# Services

Provider-neutral Python contracts and mock adapters for VitaFlow, voice, AI, promotions, posters, product vision, and safety.

`providers.py` builds the active adapter bundle from explicit provider selectors. Defaults stay mock. `STT_PROVIDER=openai_whisper` and `STT_PROVIDER=faster_whisper` are implemented STT provider paths selected only through local `.env`. `AI_PROVIDER=ollama` is an implemented local JSON wording provider that keeps VitaFlow/mock facts and safety guardrails authoritative, validates model output, and falls back to mock AI when local Ollama is offline or unsafe. Other live provider selectors remain reviewed placeholders.
