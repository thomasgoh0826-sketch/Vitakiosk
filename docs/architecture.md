# VitaKiosk Architecture

## Overview

VitaKiosk uses a mock-first, live-ready split architecture. React owns browser media and kiosk presentation. FastAPI owns validation, orchestration, WebSocket events, and HTTP contracts. Python services own provider-neutral pharmacy behavior.

VitaFlow ERP is the source of truth for product, stock, price, promotion, and shelf location. The current `MockVitaFlowAPI` supplies fictional records shaped like authoritative data; no live ERP resource is queried.

## Runtime components

```text
React kiosk
  ├─ AvatarAssistant → LottieAvatarRenderer default / lazy ThreeAvatarRenderer optional
  ├─ TapToSpeakButton → MediaRecorder
  ├─ useKioskSocket → /ws/kiosk/{session_id}
  └─ useVoiceInteraction
       ├─ POST /api/voice/transcribe
       ├─ POST /api/ai/respond
       ├─ POST /api/voice/tts
       └─ Web Audio analyser + playback

FastAPI
  ├─ voice routes → MockSTT default / OpenAIWhisperSTT explicit / MockTTS
  ├─ AI route → SafetyGuardrails → MockAIBrain
  ├─ catalog routes → MockVitaFlowAPI / PromotionEngine / PosterEngine
  ├─ action routes → in-memory purchasing and escalation stores
  └─ ConnectionManager → session-scoped WebSockets
```

## Safety-first voice flow

1. Tap starts MediaRecorder and local `listening` state.
2. Tap again, manual stop, or silence auto-stop uploads audio to the selected STT adapter and moves to `thinking`.
3. Mock STT remains the default. `STT_PROVIDER=openai_whisper` may be enabled only in local `.env` with `OPENAI_API_KEY`; tests and CI keep mock mode.
4. STT returns transcript metadata only: transcript text, provider, inferred language, and `clarification_needed`.
5. If STT marks speech unclear, the frontend asks the customer to try again and does not call the AI response or TTS workflow.
6. Safety guardrails run before product lookup or response construction.
7. A red flag or diagnosis request creates an escalation and emits `pharmacist_escalation`.
8. Safe requests are classified and resolved against the mock VitaFlow adapter.
9. Unknown products create a purchasing query; no product fields are synthesized.
10. Safe text is converted to a local WAV by mock TTS.
11. Web Audio activity drives the waveform and mouth scale during `speaking`.
12. Playback completion returns to `idle`.

## Controlled UI actions and leaflet flow

`POST /api/ai/respond` may include a `ui_actions` array. These actions are data,
not commands: the frontend executes only the approved action union for showing a
product, showing/opening a promotion leaflet, showing/opening a campaign leaflet,
showing galleries, asking for pharmacist confirmation, requesting pharmacist
assistance, or resetting the kiosk.

Promotion and campaign leaflets are selected from mock VitaFlow-ready data with
`active=true`, exact branch match, and current validity dates. Product-specific
leaflets also require product ID membership; category-linked leaflets use
adapter-provided tags only. The AI response may reference only those selected
IDs and must not invent promotion, campaign, price, stock, shelf, or product
details.

The frontend keeps a whitelist boundary around UI actions and ignores unknown
action types. A pharmacist escalation closes leaflet modals and takes priority
over promotion or campaign browsing. Session-scoped confirmations can open a
previously offered leaflet modal or create a pharmacist ticket, but they do not
grant arbitrary UI control.

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

- `STTAdapter`: audio bytes and content type to a `TranscriptionResult` containing transcript, provider, language, and clarification status.
- `TTSAdapter`: safe text to audio bytes.
- `AIBrain`: text and branch to typed AI result.
- `VitaFlowAdapter`: query and branch to authoritative product records.
- `ProductVisionAdapter`: image bytes to product identifier or no match.
- `AvatarRenderer`: avatar state and normalized audio activity to visual output. Lottie remains the default renderer; `VITE_AVATAR_RENDERER=threejs` lazy-loads the optional Three.js renderer. When `frontend/src/assets/avatar/vitakiosk-avatar.glb` is bundled, the renderer loads the GLB humanoid avatar. Missing or failed GLB loads fall back to the abstract hologram without changing backend, WebSocket, provider, or safety contracts.

The shipped dependency graph instantiates mock adapters by default through `services.providers.create_provider_bundle`. Credentials are read only as configuration data; they do not select a provider. Future live adapters must be selected explicitly and must preserve all safety and source-of-truth tests.

## Controlled provider mode

`VITAKIOSK_PROVIDER_MODE` stays `mock` and is not a whole-system live switch. Each layer has its own selector:

| Layer | Default | Future explicit values | Required configuration |
|---|---|---|---|
| STT | `STT_PROVIDER=mock` | `openai_whisper` | `OPENAI_API_KEY` |
| TTS | `TTS_PROVIDER=mock` | `elevenlabs` | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` |
| AI | `AI_PROVIDER=mock` | `openai`, `ollama` | `OPENAI_API_KEY` or `OLLAMA_BASE_URL` |
| VitaFlow | `VITAFLOW_PROVIDER=mock` | `readonly_api` | `VITAFLOW_API_BASE_URL` |
| Vision | `VISION_PROVIDER=mock` | `barcode_ocr` | reviewed OCR/barcode configuration |

Live values are selected only by explicit provider variables. `STT_PROVIDER=openai_whisper` creates the OpenAI transcription adapter and can call OpenAI only when a local `OPENAI_API_KEY` is present. Other live values remain reviewed placeholder adapters in this mock-first demo. Missing configuration fails closed instead of falling back to guessed data.

To enable one live provider locally, change exactly one selector in local `.env`, provide only that layer's credential or endpoint, run the backend contract tests, and manually review safety/non-invention behavior before enabling another layer. For STT, use `STT_PROVIDER=openai_whisper` and `OPENAI_API_KEY=` locally only; do not commit `.env`, recordings, transcripts from real customers, logs, or audio artifacts. Tests and CI must keep selectors in mock mode.

The first VitaFlow live integration is constrained to `readonly_api`: it may read approved product, stock, price, promotion, and shelf fields from a reviewed API only. It must not write sales, stock, purchasing, promotion, customer, or shelf data, and it must not inspect the ERP release directory or database directly.

## Data and persistence

Products, promotions, posters, purchasing queries, and escalations are fictional. Action stores are in process memory and reset on restart. No customer identity, sales record, database, log archive, or recording is persisted.

## Protected boundary

The unrelated directory `C:\Users\Admin\Documents\Playground\release` is outside this architecture. It must not be read, inspected, modified, or used as a connector source.
