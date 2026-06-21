# Voice AI Specification

## Purpose

Connect press-and-hold browser audio to the safety-first mock response pipeline.

## Flow

MediaRecorder → mock STT → safety guardrails → intent and mock VitaFlow lookup → mock TTS WAV → Web Audio playback.

## Acceptance criteria

- Pointer and keyboard hold gestures start once and release once.
- Empty audio is rejected with 422.
- The demo completes listening, thinking, speaking, and idle states without a provider key.
- `STT_PROVIDER` and `TTS_PROVIDER` default to `mock`.
- OpenAI Whisper and ElevenLabs credentials do not activate live voice providers unless the matching provider selector is explicitly changed.
- Tests must not call OpenAI Whisper, ElevenLabs, or any external speech provider.
- Red-flag responses stop before TTS playback.
- Microphone denial, unsupported recording, and playback failure enter `error` with actionable text.
- Tracks, audio URLs, analyser nodes, and socket timers are cleaned up.

## Test evidence

- `frontend/src/components/HoldToSpeakButton.test.tsx`
- `frontend/src/hooks/useVoiceInteraction.test.ts`
- `backend/tests/test_api.py`
- `backend/tests/test_provider_config.py`
- Manual microphone evidence in `reports/test-evidence.md`.
