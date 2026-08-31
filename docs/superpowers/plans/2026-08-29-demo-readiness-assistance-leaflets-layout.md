# VitaKiosk Demo Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Scan Product visible on short iPad landscape screens, deliver real pharmacist-assistance notifications into VitaFlow, and publish one approved Fisherman promotion leaflet plus one approved Blackmores campaign leaflet for JK.

**Architecture:** VitaKiosk keeps VitaFlow catalog reads in the existing `readonly_api` adapter but explicitly uses the already-scaffolded `VitaFlowEscalationStore` only for pharmacist assistance delivery. VitaFlow remains the writer and source of truth for queue cases, notifications, promotions, and campaigns. Short-screen layout is solved with a final measured five-row CSS override rather than an overlay or fake scroll.

**Tech Stack:** React 19, TypeScript, Vitest, FastAPI, Python pytest, VitaFlow Node/Electron backend, SQLite, browser-based acceptance checks.

---

### Task 1: Short iPad landscape layout

**Files:**
- Modify: `frontend/src/typedInputLayout.test.ts`
- Modify: `frontend/src/styles.css`
- Modify: `spec/03-kiosk-layout-spec.md`

- [ ] **Step 1: Write a failing CSS contract test**

Add an assertion that the final short-landscape override has five explicit rows, an 8px maximum card gap, short-screen product and shelf minimum heights, and a visible 42px Scan Product row after the typed-input row.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd run test:run --prefix frontend -- typedInputLayout.test.ts`

Expected: FAIL because the later measured collision guard currently overrides the older short-screen rules and emits only four explicit rows.

- [ ] **Step 3: Add the final measured short-landscape override**

Append a `max-height: 820px`, landscape, desktop-width media block after the measured collision guard. Override `--deck-card-gap`, product/shelf minimums, map canvas minimum height, and define all five deck rows so the scan rail remains inside the viewport without absolute positioning.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm.cmd run test:run --prefix frontend -- typedInputLayout.test.ts`

Expected: PASS.

### Task 2: Real VitaFlow pharmacist-assistance delivery

**Files:**
- Modify: `services/providers.py`
- Modify: `backend/app/routes/actions.py`
- Modify: `backend/tests/test_api.py`
- Modify: `backend/tests/test_vitaflow_readonly_api.py`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.integration.test.tsx`
- Modify: `.env.example`
- Modify: `spec/09-pharmacist-escalation-spec.md`

- [ ] **Step 1: Write failing backend tests**

Assert that explicit `VITAFLOW_ASSISTANCE_PROVIDER=vitaflow_api` wires `VitaFlowEscalationStore`, successful requests return the VitaFlow case code/source, and unavailable delivery returns HTTP 503 instead of a fake notified response. Keep the default and all mock tests local-only.

- [ ] **Step 2: Run focused backend tests and verify RED**

Run: `python -m pytest backend/tests/test_api.py backend/tests/test_vitaflow_readonly_api.py -q`

Expected: FAIL because the provider bundle currently always wires `EscalationStore`.

- [ ] **Step 3: Implement explicit assistance provider selection**

Add a reviewed `VITAFLOW_ASSISTANCE_PROVIDER=mock|vitaflow_api` setting. Wire `VitaFlowEscalationStore` only for `vitaflow_api`, reject unsupported values, and make `/api/escalate-pharmacist` return 503 when the ERP acknowledgement is unavailable. Do not send customer identity, audio, transcript history, stock, sale, or medical advice.

- [ ] **Step 4: Write and pass frontend delivery-state tests**

Assert that the confirmation ID comes from VitaFlow, and failure copy does not say that a pharmacist was notified. Run: `npm.cmd run test:run --prefix frontend -- App.integration.test.tsx`.

### Task 3: VitaFlow queue notification, deduplication, and live refresh

**Files:**
- Modify: `C:/Users/Admin/Documents/Playground/backend/routes.js`
- Modify: `C:/Users/Admin/Documents/Playground/backend/services.js`
- Modify: `C:/Users/Admin/Documents/Playground/software-live-overrides.js`
- Modify: `C:/Users/Admin/Documents/Playground/scripts/test-vitakiosk-hq-gate.js`
- Create: `C:/Users/Admin/Documents/Playground/scripts/test-vitakiosk-assistance-notification.js`

- [ ] **Step 1: Write failing VitaFlow regression tests**

POST the same JK/session/reason twice and assert one open query, one unread `vitakiosk.assistance_requested` notification, and a stable case code. Assert the VitaKiosk workspace declares an active-workspace refresh path and new-case alert rendering.

- [ ] **Step 2: Run the regression and verify RED**

Run: `node C:/Users/Admin/Documents/Playground/scripts/test-vitakiosk-assistance-notification.js`

Expected: FAIL because query creation currently always inserts and creates no notification.

- [ ] **Step 3: Implement authoritative notification behavior**

Validate the kiosk token, deduplicate open cases by source session plus exact problem statement, create one branch-scoped unread notification linked to the queue case, preserve the existing sync broadcast, and auto-refresh the VitaKiosk workspace while it is active. Render a prominent new/high case notice without exposing customer data.

- [ ] **Step 4: Run VitaFlow regressions and verify GREEN**

Run the new notification test plus `test-vitakiosk-hq-gate.js` and `test-vitakiosk-catalog-api.js`.

### Task 4: Approved JK leaflets

**Authoritative records:**
- Fisherman promotion: product `314`, `FISHERMAN S FRIEND (SF) LEMON 25GM`, bundle price two packs for RM8.00, valid 2026-08-29 through 2026-09-30, JK, visible in VitaKiosk.
- Blackmores campaign: product `5042`, `BLACKMORES BUFFERED C SLOW RELEASE TAB 30S`, free product-information campaign with no diagnosis, treatment claim, or extra discount, valid 2026-08-29 through 2026-09-30, JK, visible in VitaKiosk.

- [ ] **Step 1: Create the two records through VitaFlow**

Use the authenticated VitaFlow UI/API fields and existing product IDs. Do not hardcode records into VitaKiosk or mock data.

- [ ] **Step 2: Verify catalog exposure**

Read `/api/vitakiosk/catalog/promotions?branchCode=JK` and `/api/vitakiosk/catalog/campaigns?branchCode=JK`; assert both are active, branch-valid, date-valid, linked to the correct product, and sourced from VitaFlow.

### Task 5: End-to-end acceptance

**Files:**
- Modify: `reports/test-evidence.md`

- [ ] **Step 1: Run project checks**

Run focused tests, full frontend tests/build, backend pytest, VitaFlow notification/catalog regressions, and secret scans.

- [ ] **Step 2: Browser acceptance**

At 1280x720, 1024x768, and 1180x820 verify Scan Product is fully visible. Click Request assistance once and verify Kiosk shows the VitaFlow case code, VitaFlow Alerts receives one unread notification, and the VitaKiosk queue updates without manual refresh. Verify both approved leaflets open from Kiosk and show only VitaFlow facts.

- [ ] **Step 3: Record evidence**

Append exact commands, outcomes, and live UI observations to `reports/test-evidence.md`.
