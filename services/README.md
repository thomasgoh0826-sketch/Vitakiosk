# Services

Provider-neutral Python contracts and mock adapters for VitaFlow, voice, AI, promotions, posters, product vision, and safety.

`providers.py` builds the active adapter bundle from explicit provider selectors. Defaults stay mock. `STT_PROVIDER=openai_whisper` is the only implemented live provider path and is selected only through local `.env`; other live provider selectors remain reviewed placeholders.
