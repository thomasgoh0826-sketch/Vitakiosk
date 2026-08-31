# Voice AI Specification

## Purpose

Connect tap-to-speak browser audio and accessibility typed input to the safety-first response pipeline while keeping STT mock by default and OpenAI Whisper / local faster-whisper STT explicitly opt-in.

## Flow

Voice path: MediaRecorder plus browser-side silence detection -> selected STT adapter -> clarification gate -> safety guardrails -> intent and mock VitaFlow lookup -> mock TTS WAV -> Web Audio playback.

Typed path: customer text input -> same AI response endpoint and safety/product workflow -> mock TTS WAV/subtitles -> Web Audio playback where available.

## Acceptance criteria

- `Tap to Speak` starts recording and `Tap to Stop` remains available as a manual fallback.
- Browser-side voice activity detection uses a Web Audio analyser, ignores an initial startup period, and auto-stops after sustained low RMS silence.
- The microphone analyser RMS used for silence detection is also exposed to the assistant UI as listening-state audio activity so the waveform calms down during silence and energizes during customer speech.
- During AI playback, the assistant UI uses the playback Web Audio analyser for speaking-state waveform activity; if mock playback has no analyser value, only the waveform may use a subtle visual fallback for continuity.
- Silence detection constants are explicitly named `MIN_RECORDING_MS`, `SILENCE_STOP_MS`, and `SILENCE_RMS_THRESHOLD`.
- The listening flow progresses naturally through `idle -> listening -> thinking -> speaking -> idle` without showing an error for normal silence auto-stop.
- If backend TTS returns playable audio, the frontend enters `speaking`, plays the audio, activates playback waveform/VRM speaking behavior, revokes the object URL after playback, and returns to `idle`.
- If the browser blocks audio autoplay after successful TTS, the kiosk must not show generic `Try Again`; it keeps the approved answer visible, shows `Tap to play voice`, and allows the customer to replay the generated audio from the primary control.
- During `speaking`, AI response text is displayed through provider-neutral subtitle chunks instead of one full paragraph; when exact TTS timing is unavailable, subtitle timing is estimated from phrase chunks and text length.
- Subtitle chunking splits on natural sentence or phrase boundaries while preserving decimal prices and medicine/product names.
- During `idle`, `listening`, `thinking`, `error`, and `pharmacist_escalation`, the subtitle area shows short state-appropriate copy and does not expose the customer transcript in the main UI.
- The secondary `Start` / `Start New Customer` action resets microphone, audio, error, conversation, product-not-found, escalation, and local socket state without a browser refresh.
- Empty, unsupported, malformed, or provider-undecodable audio is rejected with a controlled `invalid_audio` 422 response and no stack trace, raw audio logging, bad-audio persistence, or cloud STT request for obviously malformed local uploads.
- The demo completes listening, thinking, speaking, and idle states without a provider key.
- `STT_PROVIDER` and `TTS_PROVIDER` default to `mock`.
- OpenAI Whisper, local faster-whisper, and ElevenLabs settings do not activate live or local voice providers unless the matching provider selector is explicitly changed.
- `STT_PROVIDER=openai_whisper` requires `OPENAI_API_KEY` from local environment variables.
- `STT_PROVIDER=faster_whisper` requires local `FASTER_WHISPER_*` settings and loads models only when that provider is explicitly selected and used.
- Whisper/OpenAI and faster-whisper STT accept the existing voice upload payload and return transcript text, provider, detected or inferred language, confidence when available, corrected transcript, detected terms, possible product/category matches, and clarification status.
- STT supports English, Chinese, Malay, and mixed Malaysian-style speech metadata while preserving product and medicine names in the transcript text.
- Voice and typed AI response requests may include `preferred_language: "en" | "zh" | "ms" | "auto"`. If the customer manually selects EN/中文/BM, the backend receives that preference for response wording; if no manual selection exists, the UI still defaults to EN while the AI workflow may use detected transcript language.
- Language preference must never bypass safety guardrails, product lookup, unknown-product purchasing query behavior, or VitaFlow/mock source-of-truth rules.
- Product names, SKU, prices, stock, shelf codes, branch codes, promotion/campaign titles, and VitaFlow/mock data values are not translated or invented by the frontend language selector.
- Product counselling is self-service when VitaFlow supplies an approved supplement/vitamin/lozenge kiosk category. A VitaFlow ERP record explicitly categorized as `OTC` / `NON-PRESCRIPTION MEDICINE` may also present its authoritative `productSummary` as label information when at least one approved summary field is present. An OTC category from a non-ERP source, a missing summary, prescription/medicine categories, red flags, pregnancy/breastfeeding questions, and diagnosis requests keep the pharmacist handoff.
- `功效`, `作用`, benefit/best-for questions return only VitaFlow `bestFor`; `怎么吃`, `如何服用`, `how to take`, dosage/cara makan questions return only VitaFlow `howToUse`; ingredient questions return only VitaFlow `ingredient`. The AI must not add, paraphrase, diagnose, prescribe, or invent a claim or dose.
- An accepted product-information question returns controlled `SHOW_PRODUCT` and `OPEN_PRODUCT_SUMMARY` actions so the selected product and its authoritative summary are enlarged together. A same-session follow-up such as `有什么功效` may reuse only the last product already resolved from VitaFlow for that session and branch.
- After a customer confirms one camera-scan candidate, the frontend sends only that product's ID as `current_product_id` on the next AI request. The backend must resolve the ID again through the configured VitaFlow adapter for the current branch before using it as conversational context; it must never trust product facts supplied by the browser.
- A contextual follow-up such as `What is this product for, and how should I take it?` must not reopen Product Scan when the confirmed product still resolves in VitaFlow. Approved supplement/vitamin/lozenge records and eligible VitaFlow-confirmed OTC/non-prescription records return only the requested VitaFlow `productSummary` fields and open Product Summary without an automatic pharmacist request. Other medicine records keep the identified product visible and immediately hand off to a pharmacist. Without a valid confirmed product context, identification prompts such as `What is this medicine?` continue to open Product Scan.
- The provider-neutral post-STT correction layer applies to typed and enabled speech-provider transcripts using VitaFlow/mock product names, aliases, and a local Malaysian pharmacy term lexicon. It includes likely cough/`ubat batuk` variants, common product-name mishearing such as `Relief Bomb` -> `Relief Balm`, and Chinese category equivalents `维他命C` / `维生素C` -> `vitamin C`; it must use the normalized phrase only for authoritative VitaFlow lookup and must not invent stock, price, promotion, shelf location, or product facts.
- Safety guardrails evaluate the corrected transcript before any AI/product flow, so pregnancy and breastfeeding safety questions still escalate even when STT output is routed through correction metadata.
- Unclear speech returns `clarification_needed=true`; the frontend asks the customer to try again and must not call AI response, product recommendation, TTS, or promotion flow for that unclear transcript.
- STT remains conversion-only and must not diagnose, prescribe, recommend products, or generate medical advice.
- Tests must not call OpenAI Whisper, ElevenLabs, or any external speech provider.
- Red-flag responses stop before TTS playback.
- Microphone denial, unsupported recording, and real unrecoverable playback failure enter `error` with actionable text, and `Start` can reset the kiosk afterward. Browser autoplay blocking after successful TTS is not treated as unrecoverable playback failure.
- Tracks, audio URLs, analyser nodes, microphone silence timers, and socket timers are cleaned up.
- Accessibility typed input is an alternative input channel, not a replacement for Tap to Speak and not a separate business logic path.
- Submitting typed text calls the same high-level AI/business/safety workflow used after voice transcription, including red-flag escalation, product lookup, promotion matching, unknown-product purchasing queries, subtitles, and TTS/poster updates.
- Typed input must not bypass safety guardrails, invent product facts, or show product/promotion/shelf data outside VitaFlow/mock adapter results.
- Reset/New Customer clears typed input and closes any custom keyboard.
- `VITE_ENABLE_TYPED_INPUT=true` and `VITE_TEXT_INPUT_MODE=native|popup` control typed input availability and keyboard strategy; the built-in virtual keyboard backup is EN QWERTY only.
- Native mode is the default and must allow normal browser/device text behavior: focus, copy-paste, backspace, external keyboards, iPad keyboard, Windows touch keyboard, Chinese IME, and Bahasa Melayu text typed in EN mode.
- Popup mode is explicit and opens a focused typing screen with a large textarea, EN QWERTY-only backup keyboard, Clear, Close/Done, and Send; closing preserves the draft while Send submits through the same safety-first workflow as voice.
- Chinese typing uses the device native Chinese IME / pinyin keyboard or external keyboard in the textarea; VitaKiosk does not ship a custom Chinese virtual keyboard, language toggle, or pinyin candidate dictionary.

## Test evidence

- `frontend/src/App.integration.test.tsx`
- `frontend/src/components/AiSubtitle.test.tsx`
- `frontend/src/hooks/useSubtitlePlayback.test.ts`
- `frontend/src/hooks/useVoiceInteraction.test.ts`
- `frontend/src/hooks/useKioskLanguage.ts`
- `backend/tests/test_api.py`
- `backend/tests/test_ollama_ai.py`
- `backend/tests/test_provider_config.py`
- `backend/tests/test_faster_whisper_stt.py`
- `backend/tests/test_openai_stt.py`
- Manual microphone evidence in `reports/test-evidence.md`; automated CI must not depend on real microphone hardware or permission prompts.
