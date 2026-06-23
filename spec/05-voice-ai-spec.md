# Voice AI Specification

## Purpose

Connect tap-to-speak browser audio and accessibility typed input to the safety-first response pipeline while keeping STT mock by default and OpenAI Whisper / local faster-whisper STT explicitly opt-in.

## Flow

Voice path: MediaRecorder plus browser-side silence detection -> selected STT adapter -> clarification gate -> safety guardrails -> intent and mock VitaFlow lookup -> mock TTS WAV -> Web Audio playback.

Typed path: customer text input -> same AI response endpoint and safety/product workflow -> mock TTS WAV/subtitles -> Web Audio playback where available.

## Acceptance criteria

- `Tap to Speak` starts recording and `Tap to Stop` remains available as a manual fallback.
- Browser-side voice activity detection uses a Web Audio analyser, ignores an initial startup period, and auto-stops after sustained low RMS silence.
- Silence detection constants are explicitly named `MIN_RECORDING_MS`, `SILENCE_STOP_MS`, and `SILENCE_RMS_THRESHOLD`.
- The listening flow progresses naturally through `idle -> listening -> thinking -> speaking -> idle` without showing an error for normal silence auto-stop.
- During `speaking`, AI response text is displayed through provider-neutral subtitle chunks instead of one full paragraph; when exact TTS timing is unavailable, subtitle timing is estimated from phrase chunks and text length.
- Subtitle chunking splits on natural sentence or phrase boundaries while preserving decimal prices and medicine/product names.
- During `idle`, `listening`, `thinking`, `error`, and `pharmacist_escalation`, the subtitle area shows short state-appropriate copy and does not expose the customer transcript in the main UI.
- The secondary `Start` / `Start New Customer` action resets microphone, audio, error, conversation, product-not-found, escalation, and local socket state without a browser refresh.
- Empty audio is rejected with 422.
- The demo completes listening, thinking, speaking, and idle states without a provider key.
- `STT_PROVIDER` and `TTS_PROVIDER` default to `mock`.
- OpenAI Whisper, local faster-whisper, and ElevenLabs settings do not activate live or local voice providers unless the matching provider selector is explicitly changed.
- `STT_PROVIDER=openai_whisper` requires `OPENAI_API_KEY` from local environment variables.
- `STT_PROVIDER=faster_whisper` requires local `FASTER_WHISPER_*` settings and loads models only when that provider is explicitly selected and used.
- Whisper/OpenAI and faster-whisper STT accept the existing voice upload payload and return transcript text, provider, detected or inferred language, confidence when available, corrected transcript, detected terms, possible product/category matches, and clarification status.
- STT supports English, Chinese, Malay, and mixed Malaysian-style speech metadata while preserving product and medicine names in the transcript text.
- Local faster-whisper STT applies a post-STT correction layer using mock VitaFlow product names, aliases, and a local Malaysian pharmacy term lexicon, including likely cough/`ubat batuk` variants; it must not invent stock, price, promotion, shelf location, or product facts.
- Safety guardrails evaluate the corrected transcript before any AI/product flow, so pregnancy and breastfeeding safety questions still escalate even when STT output is routed through correction metadata.
- Unclear speech returns `clarification_needed=true`; the frontend asks the customer to try again and must not call AI response, product recommendation, TTS, or promotion flow for that unclear transcript.
- STT remains conversion-only and must not diagnose, prescribe, recommend products, or generate medical advice.
- Tests must not call OpenAI Whisper, ElevenLabs, or any external speech provider.
- Red-flag responses stop before TTS playback.
- Microphone denial, unsupported recording, and playback failure enter `error` with actionable text, and `Start` can reset the kiosk afterward.
- Tracks, audio URLs, analyser nodes, microphone silence timers, and socket timers are cleaned up.
- Accessibility typed input is an alternative input channel, not a replacement for Tap to Speak and not a separate business logic path.
- Submitting typed text calls the same high-level AI/business/safety workflow used after voice transcription, including red-flag escalation, product lookup, promotion matching, unknown-product purchasing queries, subtitles, and TTS/poster updates.
- Typed input must not bypass safety guardrails, invent product facts, or show product/promotion/shelf data outside VitaFlow/mock adapter results.
- Reset/New Customer clears typed input and closes any custom keyboard.
- `VITE_ENABLE_TYPED_INPUT=true` and `VITE_TEXT_INPUT_MODE=native|popup` control typed input availability and keyboard strategy; the built-in virtual keyboard backup is EN QWERTY only.
- Native mode is the default and must allow normal browser/device text behavior: focus, copy-paste, backspace, external keyboards, iPad keyboard, Windows touch keyboard, Chinese IME, and Bahasa Melayu text typed in EN mode.
- Popup mode is explicit and opens a focused typing screen with a large textarea, EN QWERTY backup keyboard, Clear, Close/Done, and Send; closing preserves the draft while Send submits through the same safety-first workflow as voice.
- Chinese typing uses the device native Chinese IME / pinyin keyboard or external keyboard in the textarea; VitaKiosk does not ship a custom Chinese virtual keyboard or pinyin candidate dictionary.

## Test evidence

- `frontend/src/App.integration.test.tsx`
- `frontend/src/components/AiSubtitle.test.tsx`
- `frontend/src/hooks/useSubtitlePlayback.test.ts`
- `frontend/src/hooks/useVoiceInteraction.test.ts`
- `backend/tests/test_api.py`
- `backend/tests/test_provider_config.py`
- `backend/tests/test_faster_whisper_stt.py`
- `backend/tests/test_openai_stt.py`
- Manual microphone evidence in `reports/test-evidence.md`.
