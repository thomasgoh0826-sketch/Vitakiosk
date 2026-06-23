# VitaKiosk AI Pharmacy Kiosk

VitaKiosk is a mock-first, live-ready pharmacy kiosk demo for iPad landscape use. It combines a Lottie assistant, tap-to-speak browser voice capture with silence auto-stop, accessible typed input with an optional kiosk keyboard, a safety-first intent pipeline, fictional VitaFlow-shaped data, mock WAV speech, and session-scoped WebSocket updates.

By default, the demo does not call OpenAI, ElevenLabs, Ollama, or VitaFlow ERP. It does not read customer or sales records. OpenAI Whisper STT, local faster-whisper STT, and local Ollama AI wording are available only for reviewed local testing through explicit provider values in `.env`.

## Safety rules

- VitaFlow ERP is the source of truth for product, stock, price, promotion, and shelf location.
- AI must not diagnose, prescribe, or replace a pharmacist.
- Red-flag and diagnosis-seeking cases escalate to a pharmacist.
- Unknown products create a purchasing query; the kiosk does not guess.
- Promotion posters show only active, date-valid offers for the current branch.
- Missing authoritative data is displayed as unavailable.

## Prerequisites

- Node.js 24 or a compatible current LTS release.
- npm 11. On Windows PowerShell in this workspace, use `npm.cmd` because script execution policy may block `npm.ps1`.
- Python 3.12.

## Environment

Copy `.env.example` to a local `.env` only when local overrides are needed:

```powershell
Copy-Item .env.example .env
```

Mock mode requires no key. Keep these secret fields empty for the demo:

- `STT_PROVIDER=mock`
- `TTS_PROVIDER=mock`
- `AI_PROVIDER=mock`
- `VITAFLOW_PROVIDER=mock`
- `VISION_PROVIDER=mock`
- `OPENAI_API_KEY`
- `FASTER_WHISPER_MODEL_SIZE=small`
- `FASTER_WHISPER_DEVICE=cpu`
- `FASTER_WHISPER_COMPUTE_TYPE=int8`
- `FASTER_WHISPER_MODEL_DIR=.models/whisper`
- `FASTER_WHISPER_LANGUAGE=auto`
- `STT_LOW_CONFIDENCE_THRESHOLD=0.55`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `OLLAMA_BASE_URL=http://localhost:11434`
- `OLLAMA_MODEL=qwen2.5:7b`
- `OLLAMA_TIMEOUT_SECONDS=20`
- `VITAFLOW_API_BASE_URL`
- `VITE_API_BASE_URL=http://127.0.0.1:8000`
- `VITE_WS_BASE_URL=ws://127.0.0.1:8000`
- `VITE_AVATAR_RENDERER` may be left empty for the default Lottie avatar; set `VITE_AVATAR_RENDERER=threejs` or `VITE_AVATAR_RENDERER=vrm` only for reviewed local 3D avatar testing.
- `VITE_ENABLE_TYPED_INPUT=true` keeps the accessibility typed input visible.
- `VITE_TEXT_INPUT_MODE=native` is the default and relies on the device/browser keyboard; set `VITE_TEXT_INPUT_MODE=popup` only when a focused full-screen typing modal is needed.
- `VITE_KEYBOARD_DEFAULT_LANGUAGE=en` initializes the popup input preference; supported values are `en` and `zh`. Bahasa Melayu text is typed in EN mode.

`.env` is ignored. Never stage it.

### Optional local Whisper STT test

Use this only after backend/frontend mock tests pass and only with a key stored in local `.env`:

```powershell
STT_PROVIDER=openai_whisper
OPENAI_API_KEY=
```

Then start the normal backend and frontend. Test short phrases such as:

- “Where is Panadol?”
- “这个 probiotic 有 promotion 吗?”
- “Ada ubat batuk?”
- “I am pregnant, can I take this supplement?”

Expected behavior: the transcript is used internally for the safety-first workflow, the main UI keeps the customer transcript hidden, unclear speech asks the customer to try again, and red-flag wording still stops normal recommendation flow and escalates to pharmacist. Do not save or commit real customer audio, transcripts, logs, or recordings.

### Optional local faster-whisper STT test

Use this only in local `.env`; do not commit `.env`, downloaded models, raw audio, recordings, transcripts from real customers, cache files, or logs:

```powershell
STT_PROVIDER=faster_whisper
FASTER_WHISPER_MODEL_SIZE=small
FASTER_WHISPER_DEVICE=cpu
FASTER_WHISPER_COMPUTE_TYPE=int8
FASTER_WHISPER_MODEL_DIR=.models/whisper
FASTER_WHISPER_LANGUAGE=auto
STT_LOW_CONFIDENCE_THRESHOLD=0.55
```

The first manual run may download model files into `.models/whisper`, which is ignored by Git. Test phrases:

- “Where is Panadol?”
- “这个 probiotic 有 promotion 吗?”
- “Panadol ada stock 吗?”
- “Ada ubat batuk?”
- “I cannot breathe”

Expected behavior: the transcript is converted locally, language is detected or inferred, common Malaysian pharmacy terms are corrected through the local dictionary layer, unclear or low-confidence speech asks for clarification, and existing red-flag wording still escalates to pharmacist before product recommendation. The customer transcript remains hidden from the main kiosk UI unless the explicit dev debug flag is enabled.

### Optional local Ollama AI test

Use this only in local `.env`; do not commit `.env`, Ollama logs, model cache files, prompts from real customers, or transcripts:

```powershell
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_TIMEOUT_SECONDS=20
```

Ollama is used only as a local structured wording layer. The backend still runs safety guardrails before product flow, resolves product facts through VitaFlow/mock data, sends only safe context to Ollama, validates JSON output, runs safety checks after the model response, and falls back to the deterministic mock AI result if Ollama is offline or unsafe. Product, stock, price, promotion, campaign, and shelf facts must come only from VitaFlow/mock data.

Manual local phrases:

- "Where is Panadol?"
- "这个 probiotic 有 promotion 吗?"
- "Panadol ada stock 吗?"
- "Ada ubat batuk?"
- "I am pregnant, can I take this supplement?"

Expected behavior: matching-language safe wording when Ollama is available, no invented product facts, unknown products still create purchasing queries instead of guesses, and pregnancy/breastfeeding/red-flag questions escalate before any Ollama wording or product flow.

### Local Ollama + VRM demo profile

Use `docs/local-demo-env.md` when you want the local backend to run faster-whisper + Ollama and the frontend to run the self-hosted VRM avatar at the same time. Backend provider values belong in local `.env`; frontend avatar/API values belong in `frontend/.env.local`.

```powershell
# Backend
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001

# Frontend
npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5175
```

Frontend URL: [http://127.0.0.1:5175](http://127.0.0.1:5175).

The dev-only runtime badge should show `AI: ollama`, `STT: faster_whisper`, `Avatar: vrm`, and `VRM: vita-new`. Ollama and VRM are independent configs: if Ollama is offline, the backend must fall back safely without hiding the VRM avatar; if VRM fails, the frontend falls back to the holographic assistant and logs the reason without changing backend provider mode.

## Install

Run all commands from the repository root.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm.cmd install --prefix frontend
```

## Run backend

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) for the local API documentation.

## Run frontend

In a second terminal:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
$env:VITE_WS_BASE_URL="ws://127.0.0.1:8000"
npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5175
```

Open [http://127.0.0.1:5175](http://127.0.0.1:5175). Use an iPad landscape viewport such as 1024×768 for kiosk review. Browser microphone permission is required for Tap to Speak. The main button starts recording; sustained silence stops recording automatically, and the smaller `Start` control resets the kiosk for a fresh customer session without refreshing.

The typed input panel below Shelf navigation is available by default for customers who cannot or prefer not to speak. The default is `VITE_TEXT_INPUT_MODE=native`, which relies on the iPad, Windows touch keyboard, external keyboard, copy-paste, and the operating system IME for pinyin/Chinese input. Only EN and 中文 input preferences are shown; Bahasa Melayu is typed in EN mode. If a deployment needs a focused kiosk typing screen, opt in with `VITE_TEXT_INPUT_MODE=popup`; the popup preserves the draft when closed and still uses normal native text input rather than fake product/promotion shortcuts.

### Local VRM avatar demo

For local VRM testing, copy `frontend/.env.local.example` to `frontend/.env.local` and keep it untracked:

```powershell
Copy-Item frontend\.env.local.example frontend\.env.local
```

The local example uses Vite-exposed frontend variables:

```env
VITE_AVATAR_RENDERER=vrm
VITE_VRM_MODEL=vita-new
VITE_API_BASE_URL=http://127.0.0.1:8001
VITE_WS_BASE_URL=ws://127.0.0.1:8001
VITE_TEXT_INPUT_MODE=native
VITE_KEYBOARD_DEFAULT_LANGUAGE=en
```

Use `VITE_AVATAR_RENDERER=vrm`; plain `AVATAR_RENDERER` is not read by the browser runtime. If the VRM renderer cannot use the selected local model, the kiosk keeps the holographic fallback and writes a developer console warning with the fallback reason.

## API surface

| Method | Path | Mock behavior |
|---|---|---|
| GET | `/health` | Reports service, provider mode, and provider summary for dev diagnostics |
| POST | `/api/voice/transcribe` | Returns deterministic mock transcript plus provider/language/confidence/correction/clarification metadata; optional OpenAI Whisper or local faster-whisper STT only when explicitly enabled locally |
| POST | `/api/ai/respond` | Runs safety and mock intent workflow; optional local Ollama wording only when `AI_PROVIDER=ollama` is explicitly selected |
| POST | `/api/voice/tts` | Returns a generated WAV tone |
| GET | `/api/products/search` | Searches fictional branch-scoped products |
| GET | `/api/promotions/match` | Filters active branch-aware promotions |
| GET | `/api/posters/idle` | Returns eligible idle posters |
| POST | `/api/purchasing-query` | Creates an in-memory mock query |
| POST | `/api/escalate-pharmacist` | Creates an in-memory mock escalation |
| WS | `/ws/kiosk/{session_id}` | Sends session-scoped avatar states |

## Test and build

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -v -W error
npm.cmd run test:run --prefix frontend
npm.cmd run build --prefix frontend
npm.cmd audit --prefix frontend --audit-level=moderate
node scripts/check-repository.mjs
node scripts/check-specs.mjs
node scripts/check-staged-files.mjs
```

Before every commit, inspect staged paths and run the staged-file check. If `.env`, a database, SQLite file, log, backup, customer data, or sales data appears, stop without committing.

## Adapter replacement path

Consumers depend on interfaces in `services/contracts.py` and `frontend/src/components/avatar/AvatarRenderer.ts`. Current and future adapters include:

- OpenAI/Whisper STT adapter for explicit local testing through `STT_PROVIDER=openai_whisper`.
- Local faster-whisper STT adapter for explicit local testing through `STT_PROVIDER=faster_whisper`, with correction metadata from mock VitaFlow product names and a local pharmacy term lexicon.
- Ollama local AI adapter for explicit local testing through `AI_PROVIDER=ollama`; OpenAI AI remains a future reviewed placeholder.
- ElevenLabs TTS adapter as future reviewed work.
- VitaFlow HTTP API connector as future reviewed work.
- Rive, Three.js GLB, or Three.js VRM avatar renderer.
  - Lottie is the default.
  - Three.js is optional through `VITE_AVATAR_RENDERER=threejs`.
  - VRM is optional through `VITE_AVATAR_RENDERER=vrm`.
  - When `frontend/src/assets/avatar/vitakiosk-avatar.glb` exists, the Three.js renderer loads the GLB humanoid avatar.
  - When `frontend/src/assets/avatar/vita.vrm` exists, the VRM renderer loads the self-hosted character avatar and controls body, face, blinking, expressions, and amplitude-based mouth movement.
  - If no GLB is available or loading fails, it falls back to the abstract hologram.
  - If no VRM is available or loading fails, it falls back safely without blocking the kiosk UI.
  - Avatar models must be self-hosted from the local repository or a reviewed static asset path. Do not rely on Ready Player Me, cloud avatar editors, avatar creator APIs, or any external avatar runtime service. See `docs/avatar-model.md`.

Provider selection must be explicit. Adding a credential alone must never activate a live call. Live adapters require contract tests, red-flag tests, non-invention tests, network failure handling, and security review.

Controlled provider mode is per layer:

| Layer | Default | Future selector |
|---|---|---|
| STT | `STT_PROVIDER=mock` | `openai_whisper` or `faster_whisper` |
| TTS | `TTS_PROVIDER=mock` | `elevenlabs` |
| AI | `AI_PROVIDER=mock` | `openai` or `ollama` |
| VitaFlow | `VITAFLOW_PROVIDER=mock` | `readonly_api` |
| Vision | `VISION_PROVIDER=mock` | `barcode_ocr` |

To test a live or local provider locally, edit only one selector in local `.env`, provide only that provider's required key, endpoint, or model settings, and rerun backend safety, non-invention, and source-of-truth tests. The STT adapter can call OpenAI only when `STT_PROVIDER=openai_whisper` is explicitly selected; faster-whisper runs locally and stores model files under the ignored `.models/` path. The Ollama AI adapter can call local Ollama only when `AI_PROVIDER=ollama` is explicitly selected, and it falls back to the mock workflow if the local server is offline or returns invalid/unsafe JSON. The TTS, OpenAI AI, VitaFlow, and vision live classes remain placeholders until separate reviewed tasks implement them.

The first VitaFlow live task must use a reviewed read-only API or sanitized copy. It must not write to VitaFlow and must not read the ERP release directory or database directly.

The separate ERP release directory `C:\Users\Admin\Documents\Playground\release` is not an integration endpoint and must not be accessed or modified.

## Repository layout

- `frontend/`: React/Vite kiosk and UI tests.
- `backend/`: FastAPI routes, WebSocket manager, and API tests.
- `services/`: mock adapters and domain workflows.
- `spec/`: feature acceptance criteria.
- `docs/`: architecture and approved design records.
- `assets/`: repository-safe concepts and visual assets.
- `reports/`: test-evidence records.
- `scripts/`: repository and staged-file safety checks.
