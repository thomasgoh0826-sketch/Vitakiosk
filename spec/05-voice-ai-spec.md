# Voice AI Specification

## Purpose

Connect tap-to-speak browser audio to the safety-first response pipeline while keeping STT mock by default and Whisper/OpenAI STT explicitly opt-in.

## Flow

MediaRecorder plus browser-side silence detection -> selected STT adapter -> clarification gate -> safety guardrails -> intent and mock VitaFlow lookup -> mock TTS WAV -> Web Audio playback.

## Acceptance criteria

- `Tap to Speak` starts recording and `Tap to Stop` remains available as a manual fallback.
- Browser-side voice activity detection uses a Web Audio analyser, ignores an initial startup period, and auto-stops after sustained low RMS silence.
- Silence detection constants are explicitly named `MIN_RECORDING_MS`, `SILENCE_STOP_MS`, and `SILENCE_RMS_THRESHOLD`.
- The listening flow progresses naturally through `idle -> listening -> thinking -> speaking -> idle` without showing an error for normal silence auto-stop.
- The secondary `Start` / `Start New Customer` action resets microphone, audio, error, conversation, product-not-found, escalation, and local socket state without a browser refresh.
- Empty audio is rejected with 422.
- The demo completes listening, thinking, speaking, and idle states without a provider key.
- `STT_PROVIDER` and `TTS_PROVIDER` default to `mock`.
- OpenAI Whisper and ElevenLabs credentials do not activate live voice providers unless the matching provider selector is explicitly changed.
- `STT_PROVIDER=openai_whisper` is the only supported live STT selector and requires `OPENAI_API_KEY` from local environment variables.
- Whisper/OpenAI STT accepts the existing voice upload payload and returns transcript text, provider, detected or inferred language, and clarification status.
- STT supports English, Chinese, Malay, and mixed Malaysian-style speech metadata while preserving product and medicine names in the transcript text.
- Unclear speech returns `clarification_needed=true`; the frontend asks the customer to try again and must not call AI response, product recommendation, TTS, or promotion flow for that unclear transcript.
- STT remains conversion-only and must not diagnose, prescribe, recommend products, or generate medical advice.
- Tests must not call OpenAI Whisper, ElevenLabs, or any external speech provider.
- Red-flag responses stop before TTS playback.
- Microphone denial, unsupported recording, and playback failure enter `error` with actionable text, and `Start` can reset the kiosk afterward.
- Tracks, audio URLs, analyser nodes, microphone silence timers, and socket timers are cleaned up.

## Test evidence

- `frontend/src/App.integration.test.tsx`
- `frontend/src/hooks/useVoiceInteraction.test.ts`
- `backend/tests/test_api.py`
- `backend/tests/test_provider_config.py`
- `backend/tests/test_openai_stt.py`
- Manual microphone evidence in `reports/test-evidence.md`.
