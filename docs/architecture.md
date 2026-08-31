# VitaKiosk Architecture

## Overview

VitaKiosk uses a mock-first, live-ready split architecture. React owns browser media and kiosk presentation. FastAPI owns validation, orchestration, WebSocket events, and HTTP contracts. Python services own provider-neutral pharmacy behavior.

VitaFlow ERP is the source of truth for product, stock, price, promotion, and shelf location. The current `MockVitaFlowAPI` supplies fictional records shaped like authoritative data; no live ERP resource is queried.

Product artwork uses the same source-of-truth path:

```text
VitaFlow/mock adapter -> backend product response -> ProductImage component
```

The backend product model supports `imageUrl`, `thumbnailUrl`, and `images[]`
with image type, primary flag, and alt text. The frontend does not import or
switch on product-specific images; it renders the backend-provided URL when it
is a safe local/static or HTTP(S) path and falls back to the premium generated
initials artwork if the image is missing, unsafe, or fails to load. Future
VitaFlow read-only product images can therefore replace mock artwork without a
frontend code change.

## Runtime components

```text
React kiosk
  ├─ AvatarAssistant → LottieAvatarRenderer default / lazy ThreeAvatarRenderer or VRM optional
  ├─ TapToSpeakButton → MediaRecorder
  ├─ useKioskSocket → /ws/kiosk/{session_id}
  └─ useVoiceInteraction
       ├─ POST /api/voice/transcribe
       ├─ POST /api/ai/respond
       ├─ POST /api/voice/tts
       └─ Web Audio analyser + playback

FastAPI
  ├─ voice routes → MockSTT default / OpenAIWhisperSTT explicit / FasterWhisperSTT explicit / MockTTS
  ├─ AI route → SafetyGuardrails → MockAIBrain default / OllamaAIBrain explicit local wording
  ├─ catalog routes → MockVitaFlowAPI / PromotionEngine / PosterEngine
  ├─ action routes → in-memory purchasing and escalation stores
  └─ ConnectionManager → session-scoped WebSockets
```

## Safety-first voice flow

1. Tap starts MediaRecorder and local `listening` state.
2. Tap again, manual stop, or silence auto-stop uploads audio to the selected STT adapter and moves to `thinking`.
3. Mock STT remains the default. `STT_PROVIDER=openai_whisper` may be enabled only in local `.env` with `OPENAI_API_KEY`; `STT_PROVIDER=faster_whisper` may be enabled only in local `.env` with local model settings. Tests and CI keep mock mode.
4. STT returns transcript metadata only: transcript text, provider, inferred language, confidence when available, corrected transcript, detected terms, possible product/category matches, and `clarification_needed`.
5. If STT marks speech unclear or low confidence, the frontend asks the customer to try again and does not call the AI response or TTS workflow.
6. Safety guardrails run before product lookup, unknown-product handling, purchasing-query creation, promotion matching, shelf navigation, AI wording, or recommendation construction.
7. A red flag or diagnosis request creates an escalation and emits `pharmacist_escalation`.
8. Safe requests are classified and resolved against the mock VitaFlow adapter.
9. Unknown products create a purchasing query; no product fields are synthesized.
10. When `AI_PROVIDER=ollama` is explicitly selected, the backend sends only the corrected transcript, detected language, detected terms, safe VitaFlow/mock facts, branch-valid promotion/campaign facts, safety context, and allowed UI actions to local Ollama as a JSON-only wording request.
11. Ollama output is validated as structured JSON, checked against safety guardrails again, and rejected if it invents stock, price, promotion, shelf, product, or medical facts. Offline, invalid, or unsafe output falls back to the deterministic mock AI result.
12. Safe text is converted to a local WAV by mock TTS.
13. Web Audio activity drives the waveform and mouth scale during `speaking`.
14. Playback completion returns to `idle`.

## Controlled UI actions and leaflet flow

`POST /api/ai/respond` may include a `ui_actions` array. These actions are data,
not commands: the frontend executes only the approved action union for showing a
product, showing/opening a promotion leaflet, showing/opening a campaign leaflet,
showing galleries, asking for pharmacist confirmation, requesting pharmacist
assistance, or resetting the kiosk.

Promotion and campaign leaflets are selected from the configured VitaFlow adapter with
`active=true`, exact branch match, and current validity dates. Mock mode uses fictional
VitaFlow-ready records; `readonly_api` mode uses only VitaFlow API records. Product-specific
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

- `STTAdapter`: audio bytes and content type to a `TranscriptionResult` containing transcript, provider, language, optional confidence, corrected transcript, detected terms, possible product/category matches, and clarification status.
- `TTSAdapter`: safe text to audio bytes.
- `AIBrain`: text and branch to typed AI result. `MockAIBrain` is deterministic and default; `OllamaAIBrain` is an explicit local structured wording provider that keeps the deterministic workflow as the fact and safety authority.
- `VitaFlowAdapter`: query, barcode, product ID, and branch to authoritative product records, including read-only product image metadata when available.
- `ProductVisionAdapter`: camera image bytes plus scan mode to barcode/OCR/image-similarity scan signals and VitaFlow-backed product candidates.
- `AvatarRenderer`: avatar state and normalized audio activity to visual output. Lottie remains the default renderer; `VITE_AVATAR_RENDERER=threejs` lazy-loads the optional Three.js GLB renderer, and `VITE_AVATAR_RENDERER=vrm` lazy-loads the optional self-hosted VRM renderer. `VITE_VRM_MODEL=vita-new` selects `frontend/src/assets/avatar/vita-new.vrm`. Missing env keeps the default renderer; missing/invalid model files, model-load failures, or WebGL unavailability fall back to the abstract hologram without changing backend, WebSocket, provider, or safety contracts.

The shipped dependency graph instantiates mock adapters by default through `services.providers.create_provider_bundle`. Credentials are read only as configuration data; they do not select a provider. Future live adapters must be selected explicitly and must preserve all safety and source-of-truth tests.

## Controlled provider mode

`VITAKIOSK_PROVIDER_MODE` stays `mock` and is not a whole-system live switch. Each layer has its own selector:

| Layer | Default | Future explicit values | Required configuration |
|---|---|---|---|
| STT | `STT_PROVIDER=mock` | `openai_whisper`, `faster_whisper` | `OPENAI_API_KEY` for OpenAI or local faster-whisper model settings |
| TTS | `TTS_PROVIDER=mock` | `elevenlabs` | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` |
| AI | `AI_PROVIDER=mock` | `openai`, `ollama` | `OPENAI_API_KEY` for future OpenAI or `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS` for local Ollama |
| VitaFlow | `VITAFLOW_PROVIDER=mock` | `readonly_api` | `VITAFLOW_API_BASE_URL` |
| Vision | `VISION_PROVIDER=mock` | `local_product_scan`, `barcode_ocr` | reviewed local barcode/OCR/image-similarity configuration |

Live or local provider values are selected only by explicit provider variables. `STT_PROVIDER=openai_whisper` creates the OpenAI transcription adapter and can call OpenAI only when a local `OPENAI_API_KEY` is present. `STT_PROVIDER=faster_whisper` creates a local faster-whisper adapter that loads model files from the ignored `.models/` path and applies a local pharmacy correction layer. `AI_PROVIDER=ollama` creates a local Ollama JSON wording adapter; it does not replace VitaFlow/mock data authority and it falls back to mock AI when local Ollama is offline or unsafe. `VISION_PROVIDER=local_product_scan` enables the local product scan adapter only for reviewed local testing; it may decode barcode/OCR/image-similarity signals, but every returned product fact still comes from VitaFlow/mock data and raw camera frames are not persisted by default. OpenAI AI, TTS, VitaFlow, and non-local vision live values remain reviewed placeholder adapters in this mock-first demo. Missing configuration fails closed instead of falling back to guessed data.

To enable one live or local provider locally, change exactly one selector in local `.env`, provide only that layer's credential, endpoint, or model settings, run the backend contract tests, and manually review safety/non-invention behavior before enabling another layer. For STT, use either `STT_PROVIDER=openai_whisper` with `OPENAI_API_KEY=` or `STT_PROVIDER=faster_whisper` with `FASTER_WHISPER_*` settings locally only. For AI, use `AI_PROVIDER=ollama` with local `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OLLAMA_TIMEOUT_SECONDS` only. Do not commit `.env`, downloaded models, recordings, transcripts from real customers, logs, cache files, prompts, or audio artifacts. Tests and CI must keep selectors in mock mode.

## Local Ollama + VRM demo profile

The local demo profile deliberately combines two independent runtime choices:

- Backend `.env`: `STT_PROVIDER=faster_whisper`, `AI_PROVIDER=ollama`, `TTS_PROVIDER=mock`, `VITAFLOW_PROVIDER=mock`.
- Frontend `frontend/.env.local`: `VITE_AVATAR_RENDERER=vrm`, `VITE_VRM_MODEL=vita-new`, `VITE_API_BASE_URL=http://127.0.0.1:8001`, and `VITE_WS_BASE_URL=ws://127.0.0.1:8001`.

FastAPI `/health` exposes a provider summary for basic diagnostics. FastAPI `/api/runtime/status` exposes safe local runtime provider status for development only: STT provider, AI provider, TTS provider, VitaFlow provider, vision provider, Ollama reachability, and selected Ollama model. It must never expose API keys, `.env` values, model cache paths, database URLs, logs, customer data, or private VitaFlow URLs. The React app reads `/api/runtime/status` in dev mode and shows a small local badge such as `AI: ollama`, `STT: faster_whisper`, `Avatar: vrm`, and `VRM: vita-new`. If the status endpoint is unavailable, the badge shows controlled `Provider status unavailable` copy instead of `UNKNOWN`. This badge is informational; it does not couple backend provider selection to frontend renderer selection.

If Ollama is offline or returns invalid/unsafe JSON, the backend falls back safely while the frontend keeps the selected VRM renderer. If VRM model loading fails, the frontend falls back to the holographic assistant and logs the fallback reason while the backend keeps the configured safe provider mode.

The first VitaFlow live catalog integration is constrained to `readonly_api`: it may read approved product, stock, price, promotion, campaign, and shelf fields from a reviewed API only. It must not write sales, stock, purchasing, promotion, customer, or shelf data, and it must not inspect the ERP release directory or database directly. A separate explicitly reviewed `VITAFLOW_ASSISTANCE_PROVIDER=vitaflow_api` selector may POST only the minimal pharmacist-assistance case payload; the Kiosk shows success only after VitaFlow returns an authoritative case code.

## Data and persistence

Mock mode products, promotions, posters, purchasing queries, and escalations are fictional and reset with the process. In reviewed live mode, approved product/leaflet facts come from VitaFlow and pharmacist-assistance cases are persisted by VitaFlow without customer identity, transcript, sales, or recording data.

## Protected boundary

The unrelated directory `C:\Users\Admin\Documents\Playground\release` is outside this architecture. It must not be read, inspected, modified, or used as a connector source.
