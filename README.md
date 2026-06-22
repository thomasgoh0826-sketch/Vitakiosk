# VitaKiosk AI Pharmacy Kiosk

VitaKiosk is a mock-first, live-ready pharmacy kiosk demo for iPad landscape use. It combines a Lottie assistant, press-and-hold browser voice capture, a safety-first intent pipeline, fictional VitaFlow-shaped data, mock WAV speech, and session-scoped WebSocket updates.

The demo does not call OpenAI, ElevenLabs, Ollama, or VitaFlow ERP. It does not read customer or sales records.

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
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`
- `OLLAMA_BASE_URL`
- `VITAFLOW_API_BASE_URL`
- `AVATAR_RENDERER` may be left empty for the default Lottie avatar; set `AVATAR_RENDERER=threejs` only for reviewed local Three.js avatar testing.

`.env` is ignored. Never stage it.

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
npm.cmd run dev --prefix frontend
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Use an iPad landscape viewport such as 1024×768 for kiosk review. Browser microphone permission is required for Hold to Speak.

## API surface

| Method | Path | Mock behavior |
|---|---|---|
| GET | `/health` | Reports service and provider mode |
| POST | `/api/voice/transcribe` | Returns deterministic mock transcript |
| POST | `/api/ai/respond` | Runs safety and mock intent workflow |
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

Consumers depend on interfaces in `services/contracts.py` and `frontend/src/components/avatar/AvatarRenderer.ts`. Future work may add:

- OpenAI/Whisper STT and AI adapters.
- ElevenLabs TTS adapter.
- VitaFlow HTTP API connector.
- Rive or Three.js avatar renderer. Lottie is the default; Three.js is optional through `AVATAR_RENDERER=threejs`.

Provider selection must be explicit. Adding a credential alone must never activate a live call. Live adapters require new contract tests, red-flag tests, non-invention tests, network failure handling, and security review.

Controlled provider mode is per layer:

| Layer | Default | Future selector |
|---|---|---|
| STT | `STT_PROVIDER=mock` | `openai_whisper` |
| TTS | `TTS_PROVIDER=mock` | `elevenlabs` |
| AI | `AI_PROVIDER=mock` | `openai` or `ollama` |
| VitaFlow | `VITAFLOW_PROVIDER=mock` | `readonly_api` |
| Vision | `VISION_PROVIDER=mock` | `barcode_ocr` |

To test a live provider later, edit only one selector in local `.env`, provide only that provider's required key or URL, and rerun backend safety, non-invention, and source-of-truth tests. The current live-provider classes are placeholders and make no network calls.

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
