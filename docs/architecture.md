# VitaKiosk Architecture

## Overview

VitaKiosk uses a mock-first, live-ready split architecture. React owns browser media and kiosk presentation. FastAPI owns validation, orchestration, WebSocket events, and HTTP contracts. Python services own provider-neutral pharmacy behavior.

VitaFlow ERP is the source of truth for product, stock, price, promotion, and shelf location. The current `MockVitaFlowAPI` supplies fictional records shaped like authoritative data; no live ERP resource is queried.

## Runtime components

```text
React kiosk
  ├─ AvatarAssistant → LottieAvatarRenderer → AvatarRenderer contract
  ├─ HoldToSpeakButton → MediaRecorder
  ├─ useKioskSocket → /ws/kiosk/{session_id}
  └─ useVoiceInteraction
       ├─ POST /api/voice/transcribe
       ├─ POST /api/ai/respond
       ├─ POST /api/voice/tts
       └─ Web Audio analyser + playback

FastAPI
  ├─ voice routes → MockSTT / MockTTS
  ├─ AI route → SafetyGuardrails → MockAIBrain
  ├─ catalog routes → MockVitaFlowAPI / PromotionEngine / PosterEngine
  ├─ action routes → in-memory purchasing and escalation stores
  └─ ConnectionManager → session-scoped WebSockets
```

## Safety-first voice flow

1. Hold starts MediaRecorder and local `listening` state.
2. Release uploads audio to mock STT and moves to `thinking`.
3. Safety guardrails run before product lookup or response construction.
4. A red flag or diagnosis request creates an escalation and emits `pharmacist_escalation`.
5. Safe requests are classified and resolved against the mock VitaFlow adapter.
6. Unknown products create a purchasing query; no product fields are synthesized.
7. Safe text is converted to a local WAV by mock TTS.
8. Web Audio activity drives the waveform and mouth scale during `speaking`.
9. Playback completion returns to `idle`.

## Avatar state contract

Canonical states are `idle`, `listening`, `thinking`, `speaking`, `error`, and `pharmacist_escalation`. The socket sends:

```json
{
  "type": "avatar_state",
  "session_id": "kiosk-example",
  "state": "thinking",
  "detail": "classifying request"
}
```

The frontend ignores malformed or cross-session events. When WebSocket is unavailable, local state remains operational and the UI displays degraded mode.

## Adapter boundaries

- `STTAdapter`: audio bytes and content type to transcript.
- `TTSAdapter`: safe text to audio bytes.
- `AIBrain`: text and branch to typed AI result.
- `VitaFlowAdapter`: query and branch to authoritative product records.
- `ProductVisionAdapter`: image bytes to product identifier or no match.
- `AvatarRenderer`: avatar state and normalized audio activity to visual output.

The shipped dependency graph instantiates only mock adapters. Credentials are read only as configuration data; they do not select a provider. Future live adapters must be selected explicitly and must preserve all safety and source-of-truth tests.

## Data and persistence

Products, promotions, posters, purchasing queries, and escalations are fictional. Action stores are in process memory and reset on restart. No customer identity, sales record, database, log archive, or recording is persisted.

## Protected boundary

The unrelated directory `C:\Users\Admin\Documents\Playground\release` is outside this architecture. It must not be read, inspected, modified, or used as a connector source.
