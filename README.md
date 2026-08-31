# VitaKiosk AI Pharmacy Kiosk

VitaKiosk is a voice-first, vision-aware AI pharmacy kiosk for landscape tablet browsers, including iPadOS, Android, and Windows tablets. The reviewed live demo combines an interactive VRM assistant, ElevenLabs speech-to-text and text-to-speech, Agnes conversational AI and product vision, and branch-scoped product, price, stock, promotion, campaign, and shelf-location facts from the VitaFlow ERP API.

The repository remains safe by default: a fresh clone uses mock adapters and never activates a live provider merely because a credential exists. The competition live-demo profile is enabled explicitly, one layer at a time, through the provider selectors documented below. VitaFlow remains the source of truth, catalog access is read-only, and only the separately selected pharmacist-assistance connector may create a minimal assistance case.

## Safety rules

- VitaFlow ERP is the source of truth for product, stock, price, promotion, and shelf location.
- Product images are also backend/VitaFlow data: the frontend renders
  `imageUrl`, `thumbnailUrl`, or `images[]` from the product response and falls
  back to generated artwork when an image is missing or fails.
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

### Safe repository defaults

A fresh clone and all automated tests use the following no-key defaults. These are fallback and CI settings, **not the competition live-demo profile**:

- `STT_PROVIDER=mock`
- `TTS_PROVIDER=mock`
- `AI_PROVIDER=mock`
- `VITAFLOW_PROVIDER=mock`
- `VISION_PROVIDER=mock`
- `OPENAI_API_KEY=`
- `FASTER_WHISPER_MODEL_SIZE=small`
- `FASTER_WHISPER_DEVICE=cpu`
- `FASTER_WHISPER_COMPUTE_TYPE=int8`
- `FASTER_WHISPER_MODEL_DIR=.models/whisper`
- `FASTER_WHISPER_LANGUAGE=auto`
- `STT_LOW_CONFIDENCE_THRESHOLD=0.55`
- `ELEVENLABS_API_KEY=`
- `ELEVENLABS_VOICE_ID=`
- `OLLAMA_BASE_URL=http://localhost:11434`
- `OLLAMA_MODEL=qwen2.5:7b`
- `OLLAMA_TIMEOUT_SECONDS=20`
- `VITAFLOW_API_BASE_URL=`
- `VITAFLOW_API_TOKEN` optional local pairing token for ERP catalog access
- `VITE_API_BASE_URL=http://127.0.0.1:8000`
- `VITE_WS_BASE_URL=ws://127.0.0.1:8000`
- `VITE_AVATAR_RENDERER=` uses the lightweight fallback avatar; the reviewed live demo selects `vrm`.
- `VITE_ENABLE_TYPED_INPUT=true` keeps the accessibility typed input visible.
- `VITE_TEXT_INPUT_MODE=native` is the default and relies on the device/browser keyboard; set `VITE_TEXT_INPUT_MODE=popup` only when a focused full-screen typing modal is needed.

`.env` is ignored. Never stage it.

### Competition live-demo profile

The reviewed live profile uses these explicit selectors in the ignored local `.env` and `frontend/.env.local` files:

| Layer | Live selector | Role |
|---|---|---|
| Speech-to-text | `STT_PROVIDER=elevenlabs` | ElevenLabs Scribe transcription |
| Text-to-speech | `TTS_PROVIDER=elevenlabs` | ElevenLabs multilingual voice output |
| Conversational AI | `AI_PROVIDER=agnes` | Safety-constrained responses using VitaFlow facts |
| Product vision | `VISION_PROVIDER=agnes` | Agnes image analysis with local matching fallback |
| VitaFlow catalog | `VITAFLOW_PROVIDER=readonly_api` | Read-only product, price, stock, leaflet, and shelf data |
| Pharmacist assistance | `VITAFLOW_ASSISTANCE_PROVIDER=vitaflow_api` | Minimal assistance-case creation only |
| Avatar | `VITE_AVATAR_RENDERER=vrm` | Self-hosted `vita-new` VRM assistant |

The live launcher requires Agnes, ElevenLabs, the JK branch, the VitaFlow API, and fixed backend/frontend ports to be ready before reporting success:

```powershell
.\scripts\start-live-demo.ps1
```

`VITAKIOSK_PROVIDER_MODE=mock` remains a repository-wide safety/compatibility guard. The actual active services are determined by the five per-layer selectors above and are reported by `/api/runtime/status`; therefore that legacy value does not mean a correctly configured live demo is using mock speech, AI, vision, or ERP data.

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

Use `docs/local-vrm-startup.md` when you want one repeatable command after a PC restart. Use `docs/local-demo-env.md` for the longer provider profile notes. Backend provider values belong in local `.env`; frontend avatar/API values belong in `frontend/.env.local`.

```powershell
# Backend
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001

# Frontend
npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5175 --strictPort
```

For the VRM demo, you may also use the dedicated startup helper, which injects the frontend VRM values at Vite startup:

```powershell
npm.cmd run dev:vrm --prefix frontend
```

Frontend URL: [http://127.0.0.1:5175](http://127.0.0.1:5175).

The dev-only runtime badge should show `AI: ollama`, `STT: faster_whisper`, `Avatar: vrm`, and `VRM: vita-new`. Ollama and VRM are independent configs: if Ollama is offline, the backend must fall back safely without hiding the VRM avatar; if VRM fails, the frontend falls back to the holographic assistant and logs the reason without changing backend provider mode.

You can also start both local demo processes from one PowerShell prompt:

```powershell
.\scripts\start-local-vrm-demo.ps1
```

For the reviewed Agnes + ElevenLabs + read-only VitaFlow ERP profile, put the
credentials directly in the ignored root `.env`, start VitaFlow ERP on port
3100, then run:

```powershell
.\scripts\start-live-demo.ps1
```

The live launcher checks secret presence without displaying values, verifies
the approved provider selectors and JK branch, reuses healthy fixed-port
processes or starts hidden background processes on 8001 and 5175, then requires
safe Agnes and VitaFlow readiness booleans before reporting success. It never
creates or edits `.env` files.

The helper checks fixed ports 8001 and 5175, verifies the frontend VRM env values, starts the backend and frontend in separate terminals, and does not modify or print secrets.

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
npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5175 --strictPort
```

Open [http://127.0.0.1:5175](http://127.0.0.1:5175). Use a landscape tablet viewport such as 1024×768 for kiosk review. VitaKiosk is browser-based and is not limited to iPad; it also supports compatible Android and Windows tablets. Browser microphone permission is required for Tap to Speak. The main button starts recording; sustained silence stops recording automatically, and the smaller `Start` control resets the kiosk for a fresh customer session without refreshing.

The typed input panel below Shelf navigation is available by default for customers who cannot or prefer not to speak. The default is `VITE_TEXT_INPUT_MODE=native`, which relies on the tablet or desktop operating system keyboard, an external keyboard, copy-paste, and the operating system IME for pinyin/Chinese input. The compact keyboard icon opens an EN QWERTY virtual keyboard backup for English and Bahasa Melayu only; there is no custom Chinese keyboard toggle, phrase dictionary, or pinyin candidate system. Chinese text remains supported through the normal input field using the device keyboard or OS IME. If a deployment needs a focused kiosk typing screen, opt in with `VITE_TEXT_INPUT_MODE=popup`; the popup preserves the draft when closed and still uses the same safe typed workflow rather than fake product/promotion shortcuts.

The Vite dev server is pinned to `127.0.0.1:5175` with strict port mode. If port 5175 is occupied, Vite fails clearly instead of silently switching to 5176, 5177, or 5178. Find the old dev server and close it before restarting:

```powershell
Get-NetTCPConnection -LocalPort 5175 -State Listen
Get-NetTCPConnection -LocalPort 5175 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

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
```

Use `VITE_AVATAR_RENDERER=vrm`; plain `AVATAR_RENDERER` is not read by the browser runtime. If the VRM renderer cannot use the selected local model, the kiosk keeps the holographic fallback and writes a developer console warning with the fallback reason.

Vite reads `frontend/.env.local` only when the dev server starts. If you create or edit `frontend/.env.local` while the frontend is already running, stop the old 5175 dev server and restart it. As a no-copy option for local demos, run:

```powershell
npm.cmd run dev:vrm --prefix frontend
```

This helper sets `VITE_AVATAR_RENDERER=vrm`, `VITE_VRM_MODEL=vita-new`, `VITE_API_BASE_URL=http://127.0.0.1:8001`, and `VITE_WS_BASE_URL=ws://127.0.0.1:8001` before Vite starts.

The backend also exposes safe runtime diagnostics for the local demo:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/runtime/status
```

This endpoint returns provider names, Ollama reachability, and the selected Ollama model only. It must not expose API keys, `.env` values, model cache paths, database URLs, customer data, logs, or private VitaFlow URLs.

## API surface

| Method | Path | Behavior |
|---|---|---|
| GET | `/health` | Reports service, provider mode, and provider summary for dev diagnostics |
| GET | `/api/runtime/status` | Reports safe local provider diagnostics without secrets or business data |
| POST | `/api/voice/transcribe` | Uses the selected STT adapter; the live profile uses ElevenLabs Scribe |
| POST | `/api/ai/respond` | Runs safety guardrails, VitaFlow-grounded intent handling, and the selected AI adapter; the live profile uses Agnes |
| POST | `/api/voice/tts` | Uses the selected TTS adapter; the live profile uses ElevenLabs |
| GET | `/api/products/search` | Searches the selected branch-scoped VitaFlow adapter; the live profile is read-only |
| GET | `/api/promotions/match` | Filters active, branch-valid promotion and campaign data from the selected VitaFlow adapter |
| GET | `/api/posters/idle` | Returns eligible idle posters |
| GET | `/api/leaflets/active` | Returns current active leaflets for one branch |
| POST | `/api/purchasing-query` | Creates an in-memory mock query |
| POST | `/api/escalate-pharmacist` | Uses the selected assistance adapter; the live profile creates a minimal VitaFlow assistance case |
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

## Provider adapters

Consumers depend on interfaces in `services/contracts.py` and `frontend/src/components/avatar/AvatarRenderer.ts`. Implemented adapters include:

- OpenAI/Whisper STT adapter for explicit local testing through `STT_PROVIDER=openai_whisper`.
- Local faster-whisper STT adapter for explicit local testing through `STT_PROVIDER=faster_whisper`, with correction metadata from mock VitaFlow product names and a local pharmacy term lexicon.
- ElevenLabs STT through `STT_PROVIDER=elevenlabs` and Scribe v2.
- Ollama local AI through `AI_PROVIDER=ollama`; Agnes live AI through `AI_PROVIDER=agnes`.
- ElevenLabs TTS through `TTS_PROVIDER=elevenlabs`; keys stay in local root `.env` only.
- Read-only VitaFlow HTTP catalog, promotion, leaflet, map, and shelf connector through `VITAFLOW_PROVIDER=readonly_api`.
- Agnes product vision through `VISION_PROVIDER=agnes`, with local product matching fallback and no camera-frame persistence by default.
- Rive, Three.js GLB, or Three.js VRM avatar renderer.
  - A lightweight avatar is the safe fallback; the reviewed live demo uses the self-hosted VRM renderer.
  - Three.js is optional through `VITE_AVATAR_RENDERER=threejs`.
  - VRM is optional through `VITE_AVATAR_RENDERER=vrm`.
  - When `frontend/src/assets/avatar/vitakiosk-avatar.glb` exists, the Three.js renderer loads the GLB humanoid avatar.
  - When `frontend/src/assets/avatar/vita.vrm` exists, the VRM renderer loads the self-hosted character avatar and controls body, face, blinking, expressions, and amplitude-based mouth movement.
  - If no GLB is available or loading fails, it falls back to the abstract hologram.
  - If no VRM is available or loading fails, it falls back safely without blocking the kiosk UI.
  - Avatar models must be self-hosted from the local repository or a reviewed static asset path. Do not rely on Ready Player Me, cloud avatar editors, avatar creator APIs, or any external avatar runtime service. See `docs/avatar-model.md`.

Provider selection must be explicit. Adding a credential alone must never activate a live call. Live adapters require contract tests, red-flag tests, non-invention tests, network failure handling, and security review.

Controlled provider mode is per layer:

| Layer | Safe default | Implemented selectors | Competition live demo |
|---|---|---|---|
| STT | `mock` | `openai_whisper`, `faster_whisper`, `elevenlabs` | `elevenlabs` |
| TTS | `mock` | `elevenlabs`, `piper` | `elevenlabs` |
| AI | `mock` | `ollama`, `agnes`; `openai` is a guarded placeholder | `agnes` |
| VitaFlow | `mock` | `readonly_api` | `readonly_api` |
| Vision | `mock` | `local_product_scan`, `barcode_ocr`, `agnes` | `agnes` |

Provider selection is explicit. The ElevenLabs STT/TTS, Agnes AI/vision, and VitaFlow read-only adapters activate only when their selectors and required ignored local credentials are present. Product facts always come from VitaFlow in the competition profile; Agnes may interpret a request or camera image but cannot replace VitaFlow price, stock, promotion, or shelf data. Provider timeouts and invalid responses fail closed or use a controlled safe fallback rather than inventing facts.

The VitaFlow catalog connector is read-only and does not write sales, stock, purchasing, promotions, customer records, or shelf data. Pharmacist assistance uses a separate explicitly selected connector and may create only the minimum assistance-case payload.

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
