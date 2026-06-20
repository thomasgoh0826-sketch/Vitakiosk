# VitaKiosk Mock Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable mock-first VitaKiosk frontend and backend with a Lottie-first avatar, browser voice capture, safety-first AI orchestration, mock VitaFlow data, mock TTS audio, and session-scoped WebSocket state updates.

**Architecture:** React/Vite owns the iPad landscape kiosk and browser media lifecycle. FastAPI owns validation, WebSockets, and request orchestration while top-level Python service adapters own mock STT, AI, VitaFlow, promotion, poster, purchasing, escalation, and TTS behavior. Every external-provider seam remains explicit and disabled; tests require no credentials or network access.

**Tech Stack:** Node.js 24, npm 11 via `npm.cmd`, React 18, Vite 5, TypeScript 5, Lottie React, Vitest, React Testing Library, Python 3.12, FastAPI, Pydantic, Uvicorn, pytest.

---

## File Map

- Repository policy: `AGENTS.md`, `.env.example`, `.gitignore`, `README.md`, `CHANGELOG.md`, `TODO.md`, `scripts/check-staged-files.mjs`.
- Backend application: `backend/app/main.py`, `backend/app/config.py`, `backend/app/models.py`, `backend/app/routes/*.py`, `backend/app/websocket_manager.py`.
- Provider-neutral services: `services/contracts.py`, `services/models.py`, `services/mock_data.py`, `services/vitaflow_api.py`, `services/voice_ai.py`, `services/ai_brain.py`, `services/promotion_engine.py`, `services/poster_engine.py`, `services/safety_guardrails.py`, `services/product_vision.py`.
- Frontend application: `frontend/src/api/client.ts`, `frontend/src/types.ts`, `frontend/src/hooks/*.ts`, `frontend/src/components/*.tsx`, `frontend/src/App.tsx`, `frontend/src/styles.css`.
- Specifications and evidence: `spec/*.md`, `docs/architecture.md`, `reports/test-evidence.md`, `.github/workflows/ci.yml`.

### Task 1: Repository Governance and Secret Protection

**Files:**
- Create: `AGENTS.md`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `README.md`
- Create: `CHANGELOG.md`
- Create: `TODO.md`
- Create: `scripts/check-staged-files.mjs`
- Create: `assets/README.md`
- Create: `reports/README.md`
- Test: `scripts/check-repository.mjs`

- [ ] **Step 1: Write the failing repository contract check**

Create `scripts/check-repository.mjs` with assertions for the required files, required directories, protected `.env` patterns, empty secret values, and the exact protected VitaFlow path in `AGENTS.md`:

```js
import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

for (const path of ["AGENTS.md", "README.md", ".env.example", ".gitignore", "frontend", "backend", "services", "assets", "reports", "spec", "docs"]) {
  assert.ok(existsSync(path), `missing ${path}`);
}
const env = readFileSync(".env.example", "utf8");
for (const key of ["OPENAI_API_KEY", "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID", "VITAFLOW_API_BASE_URL"]) {
  assert.match(env, new RegExp(`^${key}=$`, "m"));
}
const ignore = readFileSync(".gitignore", "utf8");
for (const token of [".env", "*.db", "*.sqlite", "*.log", "backups/", "customer-data/", "sales-data/"]) {
  assert.ok(ignore.includes(token), `missing ignore rule ${token}`);
}
assert.ok(readFileSync("AGENTS.md", "utf8").includes("C:\\Users\\Admin\\Documents\\Playground\\release"));
console.log("repository contract: PASS");
```

- [ ] **Step 2: Run the contract check and verify it fails**

Run: `node scripts/check-repository.mjs`

Expected: failure naming the first missing repository file.

- [ ] **Step 3: Create governance files and tracked directory markers**

Write `AGENTS.md` with source-of-truth, non-diagnosis, pharmacist-escalation, unknown-product purchasing, active branch-aware promotion, mock-only, secret, data, and evidence rules. It must explicitly prohibit reading, inspecting, changing, or deleting `C:\Users\Admin\Documents\Playground\release`. Write `.env.example` exactly as safe configuration:

```dotenv
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
OLLAMA_BASE_URL=http://localhost:11434
VITAFLOW_API_BASE_URL=
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
VITAKIOSK_PROVIDER_MODE=mock
```

Write `.gitignore` rules for `.env`, `.env.*`, allow `!.env.example`, Python/Node build artifacts, `*.db`, `*.sqlite*`, `*.log`, `*.bak`, `*.backup`, `backups/`, `customer-data/`, `sales-data/`, generated audio, coverage, and editor files. Create concise README, changelog, work list, and tracked README files for assets and reports.

- [ ] **Step 4: Implement the staged-file blocker**

Create `scripts/check-staged-files.mjs` that runs `git diff --cached --name-only --diff-filter=ACMR`, permits `.env.example`, rejects `.env` variants, database/log/backup extensions, and path segments matching customer or sales data, prints every rejected path, and exits 1 when any match exists.

- [ ] **Step 5: Verify repository policy**

Run: `node scripts/check-repository.mjs && node scripts/check-staged-files.mjs`

Expected: `repository contract: PASS` and `staged file safety: PASS`.

- [ ] **Step 6: Commit repository policy**

```powershell
git add AGENTS.md README.md .env.example .gitignore CHANGELOG.md TODO.md scripts assets reports
node scripts/check-staged-files.mjs
git commit -m "chore: establish repository safety policy"
```

### Task 2: FastAPI Foundation and Health Endpoint

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/test_health.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create the backend virtual environment and install pinned-compatible dependencies**

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install "fastapi>=0.115,<1" "uvicorn[standard]>=0.34,<1" "python-multipart>=0.0.20,<1" "httpx>=0.28,<1" "pytest>=8.3,<9" "pytest-asyncio>=0.25,<1"
.\.venv\Scripts\python.exe -m pip freeze | Set-Content backend\requirements.lock
```

Write `backend/requirements.txt` with the same bounded dependencies.

- [ ] **Step 2: Write the failing health test**

```python
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_reports_mock_mode() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "vitakiosk-api", "provider_mode": "mock"}
```

- [ ] **Step 3: Run the health test and verify it fails**

Run: `.\.venv\Scripts\python.exe -m pytest backend/tests/test_health.py -v`

Expected: import failure because `backend.app.main` does not exist.

- [ ] **Step 4: Implement configuration and the FastAPI app**

`backend/app/config.py` defines an immutable `Settings` dataclass that reads all named environment variables but rejects any provider mode other than `mock` in this release. `backend/app/main.py` creates `FastAPI(title="VitaKiosk API")`, adds localhost CORS origins, and implements the exact health response from the test.

```python
@dataclass(frozen=True)
class Settings:
    provider_mode: str = os.getenv("VITAKIOSK_PROVIDER_MODE", "mock")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    elevenlabs_api_key: str = os.getenv("ELEVENLABS_API_KEY", "")
    elevenlabs_voice_id: str = os.getenv("ELEVENLABS_VOICE_ID", "")
    vitaflow_api_base_url: str = os.getenv("VITAFLOW_API_BASE_URL", "")

    def validate(self) -> None:
        if self.provider_mode != "mock":
            raise RuntimeError("Only mock provider mode is enabled in this demo")
```

- [ ] **Step 5: Run health test and import check**

Run: `.\.venv\Scripts\python.exe -m pytest backend/tests/test_health.py -v`

Expected: 1 passed.

Run: `.\.venv\Scripts\python.exe -c "from backend.app.main import app; print(app.title)"`

Expected: `VitaKiosk API`.

- [ ] **Step 6: Commit backend foundation**

```powershell
git add backend
node scripts/check-staged-files.mjs
git commit -m "feat: add FastAPI health service"
```

### Task 3: Mock VitaFlow, Promotion, Poster, Voice, and Safety Services

**Files:**
- Create: `services/__init__.py`
- Create: `services/contracts.py`
- Create: `services/models.py`
- Create: `services/mock_data.py`
- Create: `services/vitaflow_api.py`
- Create: `services/promotion_engine.py`
- Create: `services/poster_engine.py`
- Create: `services/voice_ai.py`
- Create: `services/safety_guardrails.py`
- Create: `services/product_vision.py`
- Test: `backend/tests/test_services.py`

- [ ] **Step 1: Write failing service behavior tests**

Tests must assert that a known fictional product returns price, stock, shelf, and `source="mock_vitaflow"`; an unknown product returns no product; promotions require active status, matching branch, and current dates; posters inherit the same filter; mock STT returns deterministic text; mock TTS starts with a RIFF/WAVE header; and red-flag text returns an escalation decision.

```python
def test_unknown_product_is_not_invented(vitaflow) -> None:
    assert vitaflow.search_products("dragon miracle capsule", "SG-001") == []

def test_mock_tts_returns_wav(mock_tts) -> None:
    audio = mock_tts.synthesize("Please speak with our pharmacist.")
    assert audio[:4] == b"RIFF"
    assert audio[8:12] == b"WAVE"

def test_red_flag_is_escalated(guardrails) -> None:
    decision = guardrails.evaluate("I cannot breathe")
    assert decision.allowed is False
    assert decision.requires_pharmacist is True
```

- [ ] **Step 2: Run service tests and verify they fail**

Run: `.\.venv\Scripts\python.exe -m pytest backend/tests/test_services.py -v`

Expected: import failures for the new service modules.

- [ ] **Step 3: Define provider-neutral contracts and domain models**

Create protocols for `STTAdapter.transcribe(audio: bytes, content_type: str) -> str`, `TTSAdapter.synthesize(text: str) -> bytes`, `AIBrain.respond(text: str, branch_id: str) -> AIResult`, and `VitaFlowAdapter.search_products(query: str, branch_id: str) -> list[Product]`. Define typed dataclasses or Pydantic-compatible records for Product, Promotion, Poster, SafetyDecision, PurchasingQuery, Escalation, and AIResult. Stock, price, promotion, and shelf values are optional and must carry a reason when absent.

- [ ] **Step 4: Implement deterministic fictional mock fixtures and engines**

Use product IDs such as `MOCK-P001`, branch `SG-001`, and clearly fictional names. `PromotionEngine.match` filters `active is True`, exact branch, `valid_from <= now <= valid_to`, and product membership. `PosterEngine.idle` selects only posters backed by eligible promotions.

- [ ] **Step 5: Implement mock STT, mock WAV TTS, and safety guardrails**

Mock STT returns `show me pain relief products` for non-empty audio. Mock TTS uses `io.BytesIO`, `wave`, and `math.sin` to produce a short mono 16-bit WAV. Guardrails match normalized red-flag phrases and diagnosis requests before any domain lookup.

- [ ] **Step 6: Run all service tests**

Run: `.\.venv\Scripts\python.exe -m pytest backend/tests/test_services.py -v`

Expected: all service tests pass with no network access.

- [ ] **Step 7: Commit mock services**

```powershell
git add services backend/tests/test_services.py
node scripts/check-staged-files.mjs
git commit -m "feat: add mock pharmacy service adapters"
```

### Task 4: AI Intent, Purchasing, and Escalation Orchestration

**Files:**
- Create: `services/ai_brain.py`
- Create: `services/workflows.py`
- Test: `backend/tests/test_ai_brain.py`

- [ ] **Step 1: Write failing intent and safety-first workflow tests**

Cover all required intents: `product_search`, `product_counselling`, `price_check`, `stock_check`, `promotion_check`, `shelf_location`, `unknown_product`, and `red_flag`. Assert red flags never call VitaFlow, unknown products create exactly one purchasing query, and all product facts in responses equal adapter fields.

```python
def test_red_flag_short_circuits_product_lookup(ai_brain, vitaflow_spy) -> None:
    result = ai_brain.respond("I cannot breathe", branch_id="SG-001")
    assert result.intent == "red_flag"
    assert result.requires_pharmacist is True
    assert vitaflow_spy.search_count == 0

def test_unknown_product_creates_query(ai_brain, purchasing_store) -> None:
    result = ai_brain.respond("dragon miracle capsule", branch_id="SG-001")
    assert result.intent == "unknown_product"
    assert result.purchasing_query_id == purchasing_store.items[0].id
    assert result.product is None
```

- [ ] **Step 2: Run AI tests and verify they fail**

Run: `.\.venv\Scripts\python.exe -m pytest backend/tests/test_ai_brain.py -v`

Expected: import failure for `services.ai_brain`.

- [ ] **Step 3: Implement deterministic classification and orchestration**

Classification uses explicit phrase tables and returns one enum value. Workflow order is guardrails, classification, VitaFlow lookup, promotion lookup, unknown-product purchasing creation, response assembly. Counselling text is limited to non-diagnostic general information plus a pharmacist handoff notice.

- [ ] **Step 4: Run AI tests**

Run: `.\.venv\Scripts\python.exe -m pytest backend/tests/test_ai_brain.py -v`

Expected: all intent, short-circuit, and non-invention tests pass.

- [ ] **Step 5: Commit AI workflow**

```powershell
git add services backend/tests/test_ai_brain.py
node scripts/check-staged-files.mjs
git commit -m "feat: add safety-first mock AI workflow"
```

### Task 5: HTTP API and Session-Scoped WebSocket Flow

**Files:**
- Create: `backend/app/websocket_manager.py`
- Create: `backend/app/dependencies.py`
- Create: `backend/app/routes/voice.py`
- Create: `backend/app/routes/ai.py`
- Create: `backend/app/routes/catalog.py`
- Create: `backend/app/routes/actions.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api.py`
- Test: `backend/tests/test_websocket.py`

- [ ] **Step 1: Write failing endpoint tests**

Test every requested route, validation of empty audio/query/branch, mock WAV content type, branch-aware promotion matching, unknown-product purchasing creation, and pharmacist escalation. Use a fixture that resets in-memory stores between tests.

```python
def test_transcribe_accepts_audio(client) -> None:
    response = client.post(
        "/api/voice/transcribe",
        data={"session_id": "session-a"},
        files={"audio": ("voice.webm", b"mock audio", "audio/webm")},
    )
    assert response.status_code == 200
    assert response.json()["transcript"] == "show me pain relief products"

def test_tts_returns_wav(client) -> None:
    response = client.post("/api/voice/tts", json={"session_id": "session-a", "text": "Hello"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/wav")
    assert response.content[:4] == b"RIFF"
```

- [ ] **Step 2: Write failing WebSocket isolation test**

Open two TestClient WebSockets, trigger an HTTP request for `session-a`, assert only `session-a` receives its `thinking` event, then send `{"type":"client_state","state":"idle"}` and assert the canonical event schema.

- [ ] **Step 3: Run API and WebSocket tests and verify they fail**

Run: `.\.venv\Scripts\python.exe -m pytest backend/tests/test_api.py backend/tests/test_websocket.py -v`

Expected: route and WebSocket imports fail.

- [ ] **Step 4: Implement the connection manager and routes**

`ConnectionManager` maps session IDs to sets of WebSockets, removes disconnected sockets, and broadcasts only JSON objects shaped as:

```json
{"type":"avatar_state","session_id":"session-a","state":"thinking","detail":"transcribing"}
```

HTTP routes validate inputs, call injected mock services, and broadcast `thinking`, `speaking`, `error`, or `pharmacist_escalation` as appropriate. The product search route creates and returns a mock purchasing query when its result is empty.

- [ ] **Step 5: Register routers and WebSocket endpoint**

Register all nine HTTP paths and `WS /ws/kiosk/{session_id}` in `main.py`. The socket accepts only canonical client state values and replies with a structured error event for invalid state names.

- [ ] **Step 6: Run backend suite**

Run: `.\.venv\Scripts\python.exe -m pytest backend/tests -v`

Expected: all backend tests pass.

- [ ] **Step 7: Commit API and WebSocket flow**

```powershell
git add backend services
node scripts/check-staged-files.mjs
git commit -m "feat: expose mock kiosk API and realtime states"
```

### Task 6: React/Vite Kiosk Foundation

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/styles.css`
- Create: `frontend/src/test/setup.ts`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Create the package manifest and install dependencies**

Declare scripts `dev`, `build`, `test`, and `test:run`. Use React, React DOM, `lottie-react`, Vite, TypeScript, Vitest, jsdom, React Testing Library, and jest-dom.

Run: `npm.cmd install --prefix frontend`

Expected: exit 0 and `frontend/package-lock.json` created.

- [ ] **Step 2: Write the failing kiosk surface test**

```tsx
render(<App />);
for (const name of [
  /AI assistant/i,
  /Hold to Speak/i,
  /Product/i,
  /Promotion/i,
  /Shelf navigation/i,
  /ERP data/i,
  /Pharmacist assistance/i,
]) {
  expect(screen.getByRole("region", { name })).toBeInTheDocument();
}
```

- [ ] **Step 3: Run the UI test and verify it fails**

Run: `npm.cmd run test:run --prefix frontend -- App.test.tsx`

Expected: missing application modules or required regions.

- [ ] **Step 4: Implement the typed kiosk shell and landscape CSS**

Create semantic regions for the seven surfaces. Use a two-column CSS grid at landscape widths, minimum 44px controls, high-contrast focus states, safe-area insets, and a compact stacked fallback below 768px. Define the exact `AvatarState` union and API response types in `types.ts`.

- [ ] **Step 5: Run UI test and production build**

Run: `npm.cmd run test:run --prefix frontend -- App.test.tsx`

Expected: test passes.

Run: `npm.cmd run build --prefix frontend`

Expected: TypeScript and Vite build exit 0.

- [ ] **Step 6: Commit frontend foundation**

```powershell
git add frontend
node scripts/check-staged-files.mjs
git commit -m "feat: add iPad landscape kiosk shell"
```

### Task 7: Lottie Avatar, Hold-to-Speak, and Web Audio Activity

**Files:**
- Create: `frontend/src/components/AvatarAssistant.tsx`
- Create: `frontend/src/components/avatar/AvatarRenderer.ts`
- Create: `frontend/src/components/avatar/LottieAvatarRenderer.tsx`
- Create: `frontend/src/components/HoldToSpeakButton.tsx`
- Create: `frontend/src/hooks/useAudioActivity.ts`
- Create: `frontend/src/assets/avatar-placeholder.json`
- Test: `frontend/src/components/AvatarAssistant.test.tsx`
- Test: `frontend/src/components/HoldToSpeakButton.test.tsx`
- Test: `frontend/src/hooks/useAudioActivity.test.ts`

- [ ] **Step 1: Write failing avatar and hold-control tests**

Assert every canonical state renders accessible text, `pharmacist_escalation` renders the pharmacist panel, pointer/key press invokes `onStart`, release/cancel invokes `onStop`, and disabled state does not start recording.

```tsx
render(<HoldToSpeakButton onStart={onStart} onStop={onStop} disabled={false} />);
const button = screen.getByRole("button", { name: /hold to speak/i });
fireEvent.pointerDown(button);
fireEvent.pointerUp(button);
expect(onStart).toHaveBeenCalledTimes(1);
expect(onStop).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run component tests and verify they fail**

Run: `npm.cmd run test:run --prefix frontend -- AvatarAssistant.test.tsx HoldToSpeakButton.test.tsx useAudioActivity.test.ts`

Expected: missing component and hook modules.

- [ ] **Step 3: Implement renderer boundary and bundled Lottie placeholder**

`AvatarRendererProps` contains `state: AvatarState` and `audioActivity: number`. `LottieAvatarRenderer` uses the local JSON animation and maps activity to a CSS mouth scale clamped to 0..1. `AvatarAssistant` owns no provider logic and presents state labels and connection status.

- [ ] **Step 4: Implement hold input and analyser mapping**

Hold control supports pointer and Space/Enter keyboard interactions without duplicate starts. `useAudioActivity` creates an `AudioContext`, `MediaElementAudioSourceNode`, and `AnalyserNode`, computes normalized RMS on animation frames, and disconnects/closes all nodes during cleanup.

- [ ] **Step 5: Run avatar tests and frontend build**

Run: `npm.cmd run test:run --prefix frontend -- AvatarAssistant.test.tsx HoldToSpeakButton.test.tsx useAudioActivity.test.ts`

Expected: all selected tests pass.

Run: `npm.cmd run build --prefix frontend`

Expected: exit 0.

- [ ] **Step 6: Commit avatar and audio components**

```powershell
git add frontend
node scripts/check-staged-files.mjs
git commit -m "feat: add Lottie avatar and voice controls"
```

### Task 8: Frontend API, WebSocket, and Mock Voice Pipeline

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/hooks/useKioskSocket.ts`
- Create: `frontend/src/hooks/useVoiceInteraction.ts`
- Create: `frontend/src/components/ProductCard.tsx`
- Create: `frontend/src/components/PromotionPoster.tsx`
- Create: `frontend/src/components/ShelfNavigationPanel.tsx`
- Create: `frontend/src/components/ErpDataPanel.tsx`
- Create: `frontend/src/components/PharmacistEscalationPanel.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/hooks/useKioskSocket.test.ts`
- Test: `frontend/src/hooks/useVoiceInteraction.test.ts`
- Test: `frontend/src/App.integration.test.tsx`

- [ ] **Step 1: Write failing socket and pipeline tests**

Mock WebSocket, MediaRecorder, fetch, URL object URLs, HTMLMediaElement playback, and AudioContext. Assert state progression `listening -> thinking -> speaking -> idle`; server escalation overrides local state; socket disconnect reports degraded mode; product responses populate panels; and unknown products display the purchasing query identifier without product guesses.

- [ ] **Step 2: Run integration tests and verify they fail**

Run: `npm.cmd run test:run --prefix frontend -- useKioskSocket.test.ts useVoiceInteraction.test.ts App.integration.test.tsx`

Expected: missing hooks, client, and panels.

- [ ] **Step 3: Implement typed API client**

Use `VITE_API_BASE_URL` with localhost fallback. Methods cover transcription multipart upload, AI JSON response, TTS blob, product search, promotions, posters, purchasing query, and escalation. Non-2xx responses throw an `ApiError` containing status and safe response detail.

- [ ] **Step 4: Implement session WebSocket hook**

Use `VITE_WS_BASE_URL` with localhost fallback, parse only valid avatar-state events for the current session, reconnect after 500ms/1s/2s with a maximum 5s delay, expose `connected`, and provide `sendState(state)` for playback completion. Cleanup cancels timers and closes the socket.

- [ ] **Step 5: Implement MediaRecorder voice orchestration**

Start requests microphone permission and selects the first supported type among `audio/webm;codecs=opus`, `audio/webm`, and the browser default. Stop builds a Blob, posts transcription, posts AI response, short-circuits on escalation, requests TTS, plays the audio, attaches analyser activity, sends `idle` after `ended`, and always stops microphone tracks.

- [ ] **Step 6: Wire panels and response provenance**

Panels render only typed response fields. ERP panel displays `mock_vitaflow`; missing values display `Unavailable from VitaFlow` with the backend reason. Promotion and poster panels render exact branch and active metadata. Escalation panel is visible only for `pharmacist_escalation`.

- [ ] **Step 7: Run full frontend tests and build**

Run: `npm.cmd run test:run --prefix frontend`

Expected: all frontend tests pass.

Run: `npm.cmd run build --prefix frontend`

Expected: exit 0.

- [ ] **Step 8: Commit integrated kiosk flow**

```powershell
git add frontend
node scripts/check-staged-files.mjs
git commit -m "feat: connect mock voice and realtime kiosk flow"
```

### Task 9: Architecture, Feature Specifications, and Acceptance Evidence

**Files:**
- Create: `docs/architecture.md`
- Create: `spec/01-product-data-spec.md`
- Create: `spec/02-promotion-poster-spec.md`
- Create: `spec/03-kiosk-layout-spec.md`
- Create: `spec/04-ai-avatar-spec.md`
- Create: `spec/05-voice-ai-spec.md`
- Create: `spec/06-ai-intent-spec.md`
- Create: `spec/07-vitaflow-adapter-spec.md`
- Create: `spec/08-purchasing-query-spec.md`
- Create: `spec/09-pharmacist-escalation-spec.md`
- Create: `spec/10-websocket-spec.md`
- Create: `spec/11-api-spec.md`
- Create: `spec/12-security-data-spec.md`
- Create: `spec/13-acceptance-standard.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `TODO.md`
- Create: `reports/test-evidence.md`
- Test: `scripts/check-specs.mjs`

- [ ] **Step 1: Write the failing spec coverage check**

`scripts/check-specs.mjs` loads every numbered spec, asserts it contains `## Acceptance criteria` and `## Test evidence`, checks the three specifically requested files, and checks `reports/test-evidence.md` contains backend, frontend, build, secret scan, staged-file scan, and protected-path declarations.

- [ ] **Step 2: Run spec check and verify it fails**

Run: `node scripts/check-specs.mjs`

Expected: failure naming the first absent spec.

- [ ] **Step 3: Write architecture and feature specs**

Document the exact adapter interfaces, request flow, WebSocket schema, canonical states, mock-only restriction, replacement procedure for OpenAI/Whisper, ElevenLabs, VitaFlow, Rive, and Three.js, and the rule that provider selection must be explicit. Every acceptance criterion is observable and maps to a test file or manual evidence item.

- [ ] **Step 4: Complete README run and integration guidance**

Document Windows commands using `npm.cmd`, Python environment setup, backend run command `.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload`, frontend run command `npm.cmd run dev --prefix frontend`, tests, build, mock behavior, `.env` handling, staged-file scan, and the future adapter replacement boundaries. State that the protected VitaFlow release path is never an integration target.

- [ ] **Step 5: Record evidence commands and current results**

`reports/test-evidence.md` contains a table with feature/spec, command, expected result, actual result, date, and status. Populate actual counts only from the fresh verification run in Task 10.

- [ ] **Step 6: Run documentation checks**

Run: `node scripts/check-specs.mjs && node scripts/check-repository.mjs`

Expected: both checks pass.

- [ ] **Step 7: Commit documentation and specs**

```powershell
git add AGENTS.md README.md CHANGELOG.md TODO.md docs spec reports scripts
node scripts/check-staged-files.mjs
git commit -m "docs: specify VitaKiosk architecture and acceptance"
```

### Task 10: CI, Full Verification, and Evidence Finalization

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `reports/test-evidence.md`

- [ ] **Step 1: Add GitHub Actions verification**

Create a workflow for pushes and pull requests using Node 24 and Python 3.12. Run `npm ci --prefix frontend`, frontend tests/build, Python dependency installation, backend tests, repository/spec checks, `git grep` secret-name safeguards without printing values, and `node scripts/check-staged-files.mjs`.

- [ ] **Step 2: Run fresh local verification**

```powershell
node scripts/check-repository.mjs
node scripts/check-specs.mjs
node scripts/check-staged-files.mjs
.\.venv\Scripts\python.exe -m pytest backend/tests -v
npm.cmd run test:run --prefix frontend
npm.cmd run build --prefix frontend
.\.venv\Scripts\python.exe -c "from backend.app.main import app; print(app.title)"
git diff --check
git status --short
```

Expected: all checks pass, frontend build exits 0, backend title is `VitaKiosk API`, and Git status contains only the intended CI/evidence changes before the final commit.

- [ ] **Step 3: Inspect staged paths before final commit**

```powershell
git add .github reports/test-evidence.md
git diff --cached --name-only
node scripts/check-staged-files.mjs
```

Expected: only `.github/workflows/ci.yml` and `reports/test-evidence.md` are staged; safety check passes. If `.env`, database, SQLite, logs, backups, customer data, or sales data appears, stop without committing and notify the user.

- [ ] **Step 4: Update evidence with exact fresh results**

Replace the evidence table's pending actual-result cells with the exact test counts and build status from Step 2. Do not claim browser microphone permission was manually verified unless it was actually exercised.

- [ ] **Step 5: Re-run verification after evidence update**

Run every command from Step 2 again plus `git diff --cached --check`.

Expected: all checks still pass with no whitespace errors.

- [ ] **Step 6: Commit CI and verified evidence**

```powershell
git add .github reports/test-evidence.md
node scripts/check-staged-files.mjs
git commit -m "ci: verify mock kiosk demo"
git status --short --branch
```

Expected: clean working tree on the current branch.
