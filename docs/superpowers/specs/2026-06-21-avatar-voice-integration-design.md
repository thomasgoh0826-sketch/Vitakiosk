# VitaKiosk Avatar and Voice Integration Design

## Goal

Build a minimal runnable VitaKiosk demo that connects an animated avatar, browser voice capture, a safety-first mock AI pipeline, mock VitaFlow product data, mock text-to-speech audio, and real-time WebSocket state updates. The initial demo must not call OpenAI, ElevenLabs, VitaFlow ERP, or any other external provider.

## Technology Choice

- Frontend: React, Vite, TypeScript, Lottie-first avatar rendering, browser MediaRecorder, and Web Audio API.
- Backend: FastAPI, Pydantic models, Python service adapters, and FastAPI WebSockets.
- Tests: Vitest and React Testing Library for the frontend; pytest and FastAPI TestClient for the backend.
- Data: deterministic repository-owned mock fixtures containing fictional products and promotions only.

React with Vite is preferred over Next.js because the kiosk is a client application and does not need server-side rendering. FastAPI is preferred over Node.js because typed request models and Python adapter boundaries suit future speech and AI integrations. Lottie is the first renderer; a small renderer interface prevents avatar state logic from depending on Lottie internals and leaves room for Rive or Three.js.

## Runtime Architecture

### Frontend Units

- `AvatarAssistant`: owns the visible assistant shell and presents the current avatar state.
- `AvatarRenderer`: renderer contract accepting an avatar state and audio activity value.
- `LottieAvatarRenderer`: initial implementation with a local placeholder animation or CSS-safe visual fallback.
- `HoldToSpeakButton`: handles press-and-hold recording, cancellation, and accessible status text.
- `useVoiceInteraction`: coordinates MediaRecorder, API requests, audio playback, analyser samples, and state transitions.
- `useKioskSocket`: subscribes to session-scoped backend events, reconnects with bounded delay, and exposes connection status.
- Product, promotion, poster, shelf navigation, ERP data, and pharmacist escalation panels consume typed API responses only.

The seven user-visible kiosk regions remain: AI avatar, Hold to Speak, product card, promotion poster, shelf navigation, ERP floating data, and pharmacist escalation.

### Avatar State Machine

The canonical states are:

- `idle`: ready for a new interaction.
- `listening`: MediaRecorder is capturing audio.
- `thinking`: transcription, safety classification, intent classification, and mock ERP lookup are running.
- `speaking`: TTS audio is playing.
- `error`: a recoverable request or media failure occurred.
- `pharmacist_escalation`: normal counselling has stopped and pharmacist assistance is required.

WebSocket events are authoritative when connected. Local state changes provide immediate feedback and a safe fallback while disconnected. A session identifier links HTTP requests with `/ws/kiosk/{session_id}` events. Reconnection never replays a completed voice request.

### Backend Units

The FastAPI application exposes:

- `GET /health`
- `POST /api/voice/transcribe`
- `POST /api/ai/respond`
- `POST /api/voice/tts`
- `GET /api/products/search`
- `GET /api/promotions/match`
- `GET /api/posters/idle`
- `POST /api/purchasing-query`
- `POST /api/escalate-pharmacist`
- `WS /ws/kiosk/{session_id}`

Route modules validate HTTP inputs and delegate to services. They do not contain provider-specific logic. The WebSocket manager holds only in-memory demo connections and broadcasts structured state events to the matching session.

### Adapter Contracts

- `stt`: mock transcriber first; future OpenAI or Whisper implementation behind the same protocol.
- `ai_brain`: deterministic intent classifier and response coordinator; future OpenAI, Claude, or Ollama implementation behind the same protocol.
- `tts`: mock WAV generator first; future ElevenLabs implementation behind the same protocol.
- `vitaflow_api`: mock catalog adapter first; future HTTP connector behind the same protocol.
- `avatar`: Lottie implementation first; future Rive and Three.js renderers behind the same TypeScript interface.

No adapter detects credentials and silently switches to a live provider. Live implementations require a future explicit provider-mode setting in addition to credentials. This prevents accidental outbound calls during local development or tests.

## Voice Interaction Flow

1. The frontend creates a kiosk session and opens its WebSocket.
2. Pressing Hold to Speak sets `listening` locally and captures browser-supported audio.
3. Releasing sends multipart audio and the session identifier to `/api/voice/transcribe`.
4. The backend broadcasts `thinking` and the mock STT adapter returns deterministic text.
5. The frontend sends the transcript, branch identifier, and session identifier to `/api/ai/respond`.
6. Safety guardrails run before intent classification and any product output.
7. A red flag creates a mock escalation and broadcasts `pharmacist_escalation`.
8. A safe request is classified as `product_search`, `product_counselling`, `price_check`, `stock_check`, `promotion_check`, `shelf_location`, `unknown_product`, or `red_flag`.
9. Product-related facts come only from the mock VitaFlow adapter. An unknown product creates a mock purchasing query.
10. A safe response is sent to `/api/voice/tts`; the mock adapter returns a playable WAV payload.
11. Audio playback broadcasts or sets `speaking`. A Web Audio analyser supplies normalized activity values for the waveform and basic mouth movement.
12. Playback completion returns the state to `idle`.

## Mock Domain Behavior

Mock fixtures contain fictional branch, product, stock, price, promotion, poster, and shelf records. Every mock record is marked with `source: mock_vitaflow`. Promotion matching requires an exact branch match, active status, and a current validity window. Shelf location is returned only when present in the product fixture.

If a requested product is absent, no product fields are invented. The API returns a not-found outcome and creates a mock purchasing query with a generated local identifier. Purchasing queries and escalations are kept in process memory for the demo and contain no customer identity.

## Safety Behavior

Safety guardrails run before the AI brain produces a response. The demo recognizes an explicit set of red-flag phrases and diagnosis-seeking patterns. Red flags do not produce counselling text; they return a pharmacist escalation response. Product counselling remains non-diagnostic and includes a pharmacist handoff notice.

The system must never invent a product, stock quantity, price, promotion, shelf location, or clinical claim. Missing authoritative values are represented as unavailable with a reason code.

## Secrets and Data Protection

`.env.example` contains empty placeholders for:

```dotenv
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
OLLAMA_BASE_URL=http://localhost:11434
VITAFLOW_API_BASE_URL=
```

The application does not require these values in mock mode. `.gitignore` excludes `.env`, environment variants other than `.env.example`, database files, logs, backups, generated audio, customer data, sales data, and local test artifacts. A staged-file safety script rejects sensitive names and extensions before release or commit workflows.

The project must not read, inspect, modify, or delete `C:\Users\Admin\Documents\Playground\release`.

## Error Handling

- Unsupported MediaRecorder environments show an actionable error without opening the microphone.
- Microphone denial returns to `error` and does not submit an empty recording.
- Empty or unsupported audio returns a validation error without calling an adapter.
- WebSocket disconnects expose a degraded connection indicator while local avatar state remains usable.
- Unknown session identifiers do not leak events across kiosk sessions.
- Missing product fields and unavailable provider configuration are explicit states, never generated guesses.
- TTS or playback errors return the avatar to `error` and keep the text response visible.

## Specifications and Documentation

Implementation updates include:

- `AGENTS.md`: safety, source-of-truth, privacy, evidence, and protected-path rules.
- `docs/architecture.md`: component boundaries, adapter replacement points, data flow, and WebSocket behavior.
- `spec/04-ai-avatar-spec.md`: avatar states, renderer contract, waveform, mouth movement, and iPad landscape acceptance criteria.
- `spec/05-voice-ai-spec.md`: MediaRecorder, STT, AI, TTS, playback, and error acceptance criteria.
- `spec/13-acceptance-standard.md`: repository-wide definition of done and evidence requirements.
- Additional focused specs cover API, mock VitaFlow behavior, promotions, purchasing queries, escalation, security, and testing.

## Test Strategy

Backend tests verify all HTTP routes, WebSocket state broadcasts, intent classification, red-flag escalation, unknown-product purchasing queries, branch-aware active promotions, explicit unavailable fields, mock WAV output, and absence of external network calls. Frontend tests verify the seven kiosk regions, all avatar states, press-and-hold behavior at the component boundary, socket-driven state changes, local fallback state, audio analyser mapping, and error rendering.

Build verification includes frontend type checking and production build, backend tests, backend import/startup checks, secret-pattern scanning, staged-file safety checks, and a report mapping every acceptance criterion to evidence. Tests must run with no API key and no network dependency.

## Completion Criteria

The demo is complete when the frontend and backend both start with documented commands; the frontend displays all required kiosk regions in iPad landscape layout; recorded audio traverses the mock STT, safety, AI, VitaFlow, and mock TTS pipeline; WebSocket and fallback avatar states work; all required routes return typed mock responses; red flags escalate; unknown products create purchasing queries; active branch-aware promotion rules hold; no external provider is called; tests and builds pass; acceptance evidence is recorded; no sensitive or business data is staged; and the protected VitaFlow release folder remains untouched.
