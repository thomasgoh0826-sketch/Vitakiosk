# VitaKiosk Repository Scaffold Design

## Purpose

Create a GitHub-ready monorepo for the VitaKiosk AI Pharmacy Kiosk. The initial repository will contain runnable placeholder frontend and backend applications, isolated service adapters, mock data, feature specifications, acceptance criteria, and test-evidence records. It must not read or modify `C:\Users\Admin\Documents\Playground\release`.

## Scope

The initial delivery includes:

- Repository governance and onboarding documents.
- A React, Vite, and TypeScript kiosk frontend optimized for iPad landscape mode.
- A FastAPI backend exposing the six requested placeholder endpoints.
- Python service adapters for VitaFlow ERP, voice AI, product vision, promotions, posters, and safety guardrails.
- Repository-owned mock data only; no live ERP connection and no customer records.
- Automated tests and human-readable evidence reports.

The initial delivery excludes production authentication, live ERP database access, real AI provider calls, customer data, sales data, deployment infrastructure, and real secrets.

## Repository Structure

```text
/
├── AGENTS.md
├── README.md
├── TODO.md
├── CHANGELOG.md
├── .env.example
├── .gitignore
├── spec/
├── docs/
│   └── superpowers/
├── frontend/
├── backend/
├── services/
├── assets/
└── reports/
```

Empty folders will contain a short tracked README or `.gitkeep` file so that Git preserves the intended structure.

## Architecture

### Frontend

The frontend will use React, Vite, and TypeScript. A single kiosk workspace will arrange seven bounded UI regions: AI avatar, hold-to-speak control, product card, active promotion poster, shelf navigation, ERP data panel, and pharmacist escalation panel. CSS will target iPad landscape dimensions while remaining usable on smaller screens.

The UI will call the local backend through an environment-configured base URL. It will display explicit unavailable or escalation states when authoritative data is missing; it will never synthesize stock, price, promotion, or shelf location.

### Backend

The backend will use FastAPI with typed request and response models. It will expose:

- `GET /health`
- `GET /api/products/search`
- `POST /api/promotions/match`
- `GET /api/posters/idle`
- `POST /api/purchasing-query`
- `POST /api/escalate-pharmacist`

Product search will return trusted mock records. When no product matches, the response will instruct the client to create a purchasing query, and the dedicated purchasing endpoint will record a mock query without contacting VitaFlow ERP. Promotion and poster responses will filter by active status, branch, and validity window. Red-flag input will produce a pharmacist-escalation outcome rather than clinical advice.

### Services

Each service will have a narrow interface and no direct dependency on UI code:

- `vitaflow_api`: authoritative-data adapter with mock mode enabled by default.
- `voice_ai`: placeholder speech input/output adapter.
- `product_vision`: placeholder product-recognition adapter.
- `promotion_engine`: active and branch-aware promotion matcher.
- `poster_engine`: idle-poster selector using promotion eligibility.
- `safety_guardrails`: blocks diagnosis and identifies pharmacist-escalation cases.

Provider credentials and connection settings will only be read from environment variables. Placeholder modules will return deterministic mock results without calling external systems.

## Data Flow

1. The kiosk sends a user action to the backend.
2. Safety guardrails evaluate the request before product or promotion output is produced.
3. Red-flag cases terminate the normal flow and create a mock pharmacist escalation.
4. Safe product requests query the mock VitaFlow adapter.
5. Missing products return a purchasing-query-required state.
6. Promotion and poster output is filtered by branch, active state, and validity dates.
7. The frontend renders only fields supplied by the backend and labels unavailable fields clearly.

## Safety and Privacy Rules

- VitaFlow ERP is the source of truth for inventory, pricing, promotions, and shelf locations.
- AI output must not diagnose, prescribe, or replace a pharmacist.
- Red-flag cases must escalate to a pharmacist.
- Missing product results must lead to a purchasing query.
- Posters must only display active, branch-aware promotions.
- No real ERP database, customer data, sales data, logs, backups, or local database files may be added to Git.
- `.env` and secret-bearing variants are ignored; only an empty-value `.env.example` is tracked.
- A repository check will inspect staged filenames and stop when sensitive file types or business-data paths are detected.
- The unrelated VitaFlow release directory is outside the repository scope and must remain untouched.

## Error Handling

- Missing authoritative fields return an explicit unavailable value and a machine-readable reason.
- Invalid branch identifiers, empty searches, and malformed requests return clear 4xx responses.
- Unconfigured optional integrations remain in mock mode instead of failing startup.
- External-provider placeholders never silently fall back to invented data.
- Safety-blocked requests return a structured escalation response.

## Specifications and Acceptance Criteria

The `spec/` folder will contain a repository overview plus focused specifications for kiosk UI, API behavior, services, safety guardrails, ERP integration boundaries, and Git/data security. Every feature specification will include:

- Purpose and scope.
- Inputs and outputs.
- Safety constraints.
- Acceptance criteria expressed as observable behavior.
- Corresponding automated or manual test-evidence location.

## Testing and Evidence

Backend tests will cover endpoint health, product matches, product-not-found behavior, branch-aware active promotions, idle posters, purchasing queries, pharmacist escalation, and diagnosis blocking. Frontend tests will verify the seven required surfaces and key unavailable/escalation states. A repository safety test will inspect ignore rules and staged-file policy behavior.

`reports/test-evidence.md` will record commands, expected results, actual results, date, and evidence status. Generated coverage artifacts and runtime logs will remain untracked.

## Run Experience

The README will provide prerequisites and separate commands for installing and running the frontend and backend. It will explain mock mode, environment setup from `.env.example`, test commands, safe Git checks, and the future VitaFlow integration seam. Running locally will not require any API key.

## Completion Criteria

The scaffold is complete when all requested top-level files and folders exist, both applications start locally, all six API routes respond as specified, the kiosk displays all seven requested regions in landscape layout, automated tests pass, evidence is recorded, no real secret or business data is tracked, and the VitaFlow release directory has not been accessed or changed.
