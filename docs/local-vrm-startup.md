# Fixed local VRM startup

Use this when you restart the PC and want the same VitaKiosk local demo every time:

- Frontend: `http://127.0.0.1:5175`
- Backend: `http://127.0.0.1:8001`
- Avatar renderer: `vrm`
- VRM model: `vita-new`
- Text input mode: native/device keyboard
- Backend providers: local faster-whisper and Ollama when enabled in your local `.env`

Do not commit real `.env`, `frontend/.env.local`, API keys, model caches, audio files, logs, customer data, or sales data.

## One command after PC restart

Open PowerShell:

```powershell
cd "C:\Users\Admin\Documents\New project 2"
.\scripts\start-local-vrm-demo.ps1
```

Then open:

```text
http://127.0.0.1:5175
```

The script starts:

```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
npm.cmd run dev:vrm --prefix frontend
```

The frontend helper uses Vite strict port mode, so it must stay on `127.0.0.1:5175` and must not silently jump to `5176`, `5177`, `5178`, or another random port.

## Required local backend `.env`

Create local `.env` from `.env.local.example`. Keep it local only.

Expected local demo profile:

```env
STT_PROVIDER=faster_whisper
AI_PROVIDER=ollama
TTS_PROVIDER=mock
VITAFLOW_PROVIDER=mock
VISION_PROVIDER=mock

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_TIMEOUT_SECONDS=20

FASTER_WHISPER_MODEL_SIZE=small
FASTER_WHISPER_DEVICE=cpu
FASTER_WHISPER_COMPUTE_TYPE=int8
FASTER_WHISPER_MODEL_DIR=.models/whisper
FASTER_WHISPER_LANGUAGE=auto
```

No OpenAI, ElevenLabs, real VitaFlow, database URL, token, or password is required for this startup profile.

## Required frontend `frontend/.env.local`

Copy the safe example:

```powershell
Copy-Item frontend\.env.local.example frontend\.env.local
```

It should contain:

```env
VITE_AVATAR_RENDERER=vrm
VITE_VRM_MODEL=vita-new
VITE_API_BASE_URL=http://127.0.0.1:8001
VITE_WS_BASE_URL=ws://127.0.0.1:8001
VITE_TEXT_INPUT_MODE=native
```

Vite reads `frontend/.env.local` only when the dev server starts. If you edit `frontend/.env.local` while the frontend is already running, browser refresh alone is not enough. Stop the old 5175 dev server and restart it.

## If VRM disappears or falls back

Check `frontend/.env.local`:

```env
VITE_AVATAR_RENDERER=vrm
VITE_VRM_MODEL=vita-new
```

Then restart the frontend dev server. The most common cause is that an old `5175` server was started before the VRM env was present, so the browser keeps showing Lottie or the holographic fallback.

Always use one of these for the VRM demo:

```powershell
.\scripts\start-local-vrm-demo.ps1
npm.cmd run dev:vrm --prefix frontend
```

## If port 5175 is occupied

Vite strict port mode should fail clearly instead of switching to another port.

Check the listener:

```powershell
Get-NetTCPConnection -LocalPort 5175 -State Listen
Get-NetTCPConnection -LocalPort 5175 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

Stop the old process only after you confirm it is the old VitaKiosk frontend dev server:

```powershell
Stop-Process -Id <PID> -Force
```

Then rerun:

```powershell
.\scripts\start-local-vrm-demo.ps1
```

## If port 8001 is occupied

Check the backend listener:

```powershell
Get-NetTCPConnection -LocalPort 8001 -State Listen
Get-NetTCPConnection -LocalPort 8001 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

Stop the old process only after you confirm it is the old VitaKiosk backend:

```powershell
Stop-Process -Id <PID> -Force
```

## Runtime checks

Backend health:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
```

Provider status:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/runtime/status
```

In development mode, enable the small non-customer diagnostics badge only when needed:

```env
VITE_SHOW_DEBUG_STATUS=true
```

It can show safe runtime fields such as:

- frontend URL: `http://127.0.0.1:5175`
- backend URL: `http://127.0.0.1:8001`
- avatar renderer: `vrm`
- VRM model: `vita-new`
- AI provider from backend status
- STT provider from backend status

The diagnostics must not expose API keys, tokens, customer data, audio files, logs, model cache internals, database URLs, or private VitaFlow endpoints.

## Safety reminder

This startup profile does not change VitaKiosk pharmacy safety rules:

- VitaFlow/mock adapter remains the source of truth.
- AI must not diagnose, prescribe, or replace a pharmacist.
- Red flags still escalate before product flow.
- Unknown products still create purchasing queries instead of guesses.
- Product, stock, price, promotion, campaign, and shelf data must not be invented.
