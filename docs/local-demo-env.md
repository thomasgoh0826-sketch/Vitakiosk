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

For reviewed local camera product scan testing only, change the vision selector
in local `.env` to:

```env
VISION_PROVIDER=local_product_scan
```

Keep CI and normal demos on `VISION_PROVIDER=mock`.

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

For the full local voice demo after provider verification, `TTS_PROVIDER` may be
set to `elevenlabs` only in local `.env` after the ElevenLabs key has been
verified. Keep `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and
`ELEVENLABS_MODEL_ID` in root `.env` only. Do not copy any ElevenLabs key into
`frontend/.env.local`, docs, screenshots, logs, or reports.

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

## Reviewed live demo profile

Keep the mock safety envelope and enable only the reviewed provider layers in
the ignored root `.env`:

```dotenv
VITAKIOSK_PROVIDER_MODE=mock
STT_PROVIDER=elevenlabs
TTS_PROVIDER=elevenlabs
AI_PROVIDER=agnes
VISION_PROVIDER=agnes
VITAFLOW_PROVIDER=readonly_api
VITAFLOW_API_BASE_URL=http://127.0.0.1:3100
AGNES_API_KEY=
AGNES_BASE_URL=https://apihub.agnes-ai.com
AGNES_MODEL=agnes-2.0-flash
AGNES_VISION_MODEL=agnes-2.0-flash
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_STT_MODEL_ID=scribe_v2
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
```

Set `VITE_BRANCH_ID=JK`, `VITE_AVATAR_RENDERER=vrm`, and
`VITE_VRM_MODEL=vita-new` in ignored `frontend/.env.local`. With VitaFlow ERP
already listening on 3100, launch and verify the fixed demo URLs with:

```powershell
.\scripts\start-live-demo.ps1
```

The launcher reports only boolean readiness and provider names. It never prints
credentials or customer/provider response bodies.

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
- Product detail, promotion leaflet, and shelf map auto-enlarge behavior must
  come from whitelisted `OPEN_PRODUCT_DETAIL`, `OPEN_PROMOTION_MODAL`, and
  `OPEN_SHELF_MAP` actions with adapter-backed IDs. Unknown or malformed action
  payloads are ignored.
- No real customer audio, transcripts, logs, or screenshots are committed.

## Manual microphone QA checklist

Automated tests mock MediaRecorder and must not require real microphone hardware,
browser permission prompts, faster-whisper model downloads, ElevenLabs keys, or
live Ollama availability. Real microphone QA is manual:

1. Open `http://127.0.0.1:5175`.
2. Allow browser microphone permission.
3. Press `Tap to Speak`.
4. Say `Where is Relief Balm?`.
5. Confirm the raw transcript can remain `Relief Bomb` when STT hears it that
   way, but the corrected product flow resolves to mock VitaFlow `Relief Balm`.
6. Confirm the Product, Shelf, Promotion, and ERP panels use only mock VitaFlow
   facts.
7. Confirm ElevenLabs voice plays when `TTS_PROVIDER=elevenlabs` is explicitly
   enabled locally.
8. Confirm VRM enters speaking state during playback and returns to ready after
   audio ends.
9. If the browser blocks autoplay, confirm the kiosk keeps the answer visible,
   shows `Tap to play voice`, and does not fall into generic `Try Again`.
10. Test `I am pregnant. Can I use Relief Balm?` and confirm pharmacist
    escalation happens before normal product or promotion flow.
