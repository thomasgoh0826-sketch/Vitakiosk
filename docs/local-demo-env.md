# Local Ollama + VRM demo profile

This profile runs the local AI brain and the local avatar renderer together while keeping them independent:

- Backend AI/STT providers are configured in the repository-root `.env`.
- Frontend avatar/API settings are configured in `frontend/.env.local`.
- Ollama does not choose the avatar renderer.
- VRM does not change backend provider selection.

Do not commit real `.env`, `frontend/.env.local`, model caches, audio files, logs, customer data, sales data, or screenshots containing real customers.

## Backend `.env`

Copy the example values from `.env.local.example` into local `.env`, or create `.env` manually:

```env
VITAKIOSK_PROVIDER_MODE=mock
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
STT_LOW_CONFIDENCE_THRESHOLD=0.55
```

Keep `TTS_PROVIDER=mock` and `VITAFLOW_PROVIDER=mock` for this demo. Do not add OpenAI, ElevenLabs, VitaFlow, or database credentials.

If the Ollama model is not installed yet:

```powershell
ollama pull qwen2.5:7b
ollama list
```

Start the backend:

```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8001
```

Check provider diagnostics:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
```

Check the safe local runtime status endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/runtime/status
```

Expected local demo provider summary:

```json
{
  "provider_summary": {
    "stt": "faster_whisper",
    "tts": "mock",
    "ai": "ollama",
    "vitaflow": "mock",
    "vision": "mock"
  }
}
```

Expected local runtime status includes only safe provider fields:

```json
{
  "stt_provider": "faster_whisper",
  "ai_provider": "ollama",
  "tts_provider": "mock",
  "vitaflow_provider": "mock",
  "vision_provider": "mock",
  "ollama_reachable": true,
  "model": "qwen2.5:7b"
}
```

The runtime status endpoint must not expose API keys, `.env` values, model cache paths, database URLs, customer data, logs, or private VitaFlow URLs.

If Ollama is offline, the backend must fail safely or fall back to deterministic mock wording. Product, stock, price, promotion, campaign, and shelf facts still come only from VitaFlow/mock data.

## Frontend `frontend/.env.local`

Copy the frontend example:

```powershell
Copy-Item frontend\.env.local.example frontend\.env.local
```

Expected local profile values:

```env
VITE_AVATAR_RENDERER=vrm
VITE_VRM_MODEL=vita-new
VITE_API_BASE_URL=http://127.0.0.1:8001
VITE_WS_BASE_URL=ws://127.0.0.1:8001
```

Use Vite-exposed variables. `VITE_AVATAR_RENDERER=vrm` selects the browser VRM renderer; plain `AVATAR_RENDERER=vrm` is intentionally ignored by the browser runtime.

Start the frontend:

```powershell
npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5175 --strictPort
```

Or use the dedicated VRM helper, which sets the local frontend values before Vite starts:

```powershell
npm.cmd run dev:vrm --prefix frontend
```

To start both local demo terminals from one PowerShell prompt, use:

```powershell
.\scripts\start-local-vrm-demo.ps1
```

This helper checks that root `.env` and `frontend/.env.local` exist, verifies the local VRM frontend values, checks fixed ports 8001 and 5175, starts the backend and frontend in separate terminals, and does not modify or print secret values. See `docs/local-vrm-startup.md` for the PC-restart playbook.

Open [http://127.0.0.1:5175](http://127.0.0.1:5175).

Vite reads `frontend/.env.local` only at startup. If the browser still shows the holographic assistant after editing `frontend/.env.local`, stop the existing 5175 frontend process and restart it with one of the commands above.

Port 5175 is fixed. If it is occupied, Vite must fail instead of switching to a higher port. Check the existing listener and close the old dev server before restarting:

```powershell
Get-NetTCPConnection -LocalPort 5175 -State Listen
Get-NetTCPConnection -LocalPort 5175 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess
```

In dev mode, the kiosk shows a small local diagnostics badge:

- `AI: ollama`
- `STT: faster_whisper`
- `Avatar: vrm`
- `VRM: vita-new`

The assistant bay also shows the current renderer/model in a tiny dev-only badge. These indicators are not part of the customer-facing production UI.

## VRM fallback diagnostics

If the selected VRM cannot render, the kiosk keeps the holographic fallback and writes a console warning with a clear reason:

- `VITE_AVATAR_RENDERER is not set to vrm; using fallback renderer`
- `missing-vrm-model-url`
- `vrm-load-failed`
- `webgl-unavailable`

The fallback does not change backend provider settings. Ollama may be offline while VRM remains visible, and VRM may fall back while the backend still uses the configured safe provider mode.

## Safety checks for local demo

Before showing the local demo, verify:

- Pregnancy, breastfeeding, severe symptoms, and other red flags escalate before product flow.
- Unknown products create purchasing queries instead of guessed product facts.
- Ollama output is accepted only as structured, validated, safe wording.
- Frontend executes only whitelisted `ui_actions`.
- No real customer audio, transcripts, logs, or screenshots are committed.
