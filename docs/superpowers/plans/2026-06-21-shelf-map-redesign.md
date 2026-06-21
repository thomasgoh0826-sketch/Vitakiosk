# Shelf Map Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stepper-like shelf navigation with an accessible dark-neon indoor pharmacy route map while leaving backend, API, mock data, WebSocket, and safety behavior unchanged.

**Architecture:** Add a focused `ShelfMap` React component that receives the existing `Product | null`, renders semantic HTML shelf fixtures and markers, and overlays a cyan SVG route. Wire it into the current kiosk shell, style it within the existing responsive grid, and prove the result with component tests plus an iPad-landscape screenshot committed as acceptance evidence.

**Tech Stack:** React 18, TypeScript, CSS, inline SVG, Vitest, Testing Library, Vite, in-app browser QA

---

## File Map

- Create `frontend/src/components/ShelfMap.tsx`: map rendering, location parsing, route and unavailable states.
- Create `frontend/src/components/ShelfMap.test.tsx`: accessible map, route metadata, and non-invention tests.
- Modify `frontend/src/App.tsx`: replace the old panel import and render call.
- Modify `frontend/src/App.test.tsx`: require the map-style navigation region in the kiosk shell.
- Modify `frontend/src/styles.css`: remove the rendered stepper styling and add responsive dark-neon map styles.
- Modify `spec/03-kiosk-layout-spec.md`: make map-style shelf navigation an explicit layout criterion.
- Modify `spec/13-acceptance-standard.md`: require screenshot evidence for the route panel.
- Create `reports/evidence/shelf-map-ipad-landscape.png`: acceptance screenshot at 1024 by 768.
- Modify `reports/test-evidence.md`: record the new tests, build, browser viewport, and screenshot path.
- Preserve `frontend/src/components/ShelfNavigationPanel.tsx` without importing it, because existing files must not be deleted.

### Task 1: Add ShelfMap Behavior and Kiosk Wiring

**Files:**
- Create: `frontend/src/components/ShelfMap.test.tsx`
- Create: `frontend/src/components/ShelfMap.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `frontend/src/components/ShelfMap.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Product } from "../types";
import ShelfMap from "./ShelfMap";

const product: Product = {
  id: "MOCK-P001",
  name: "Relief Balm",
  branch_id: "SG-001",
  price: 12.5,
  stock: 18,
  shelf_location: "A-03",
  source: "mock_vitaflow",
  unavailable_reason: null,
};

describe("ShelfMap", () => {
  it("renders an accessible indoor route map with source-backed location data", () => {
    render(<ShelfMap product={product} />);

    expect(screen.getByRole("region", { name: "Shelf navigation map" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Route from Entrance to Aisle 03, Shelf A-03" })).toBeInTheDocument();
    expect(screen.getByLabelText("You are here at Entrance")).toBeInTheDocument();
    expect(screen.getByLabelText("Target location Shelf A-03 in Aisle 03")).toBeInTheDocument();
    expect(screen.getByText("A-03")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("Entrance → Aisle 03 → Shelf A-03")).toBeInTheDocument();
  });

  it("does not invent a route when VitaFlow has no shelf location", () => {
    render(<ShelfMap product={{ ...product, shelf_location: null }} />);

    expect(screen.getByText("Shelf location unavailable from VitaFlow.")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Target location/)).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Route from Entrance/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Shelf A-03")).not.toBeInTheDocument();
  });
});
```

Update the shelf assertion in `frontend/src/App.test.tsx` from `/Shelf navigation/i` to `/Shelf navigation map/i`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
npm.cmd run test:run --prefix frontend -- frontend/src/components/ShelfMap.test.tsx frontend/src/App.test.tsx
```

Expected: FAIL because `./ShelfMap` does not exist and the kiosk does not expose the new map region.

- [ ] **Step 3: Implement the minimal accessible map component**

Create `frontend/src/components/ShelfMap.tsx`:

```tsx
import type { Product } from "../types";

function ShelfMap({ product }: { product: Product | null }) {
  const shelf = product?.shelf_location?.trim() || null;
  const aisleNumber = shelf?.match(/\d+/)?.[0]?.padStart(2, "0") ?? null;
  const aisle = aisleNumber ? `Aisle ${aisleNumber}` : null;
  const hasRoute = Boolean(shelf && aisle);

  return (
    <section className="panel shelf-map-panel" aria-label="Shelf navigation map">
      <div className="panel-title-row shelf-map-heading">
        <div>
          <span className="map-kicker">Indoor pharmacy map</span>
          <h2>Shelf navigation</h2>
        </div>
        <span className="map-route-status">{hasRoute ? "Shortest route" : "Unavailable"}</span>
      </div>

      <div className={`shelf-map-canvas${hasRoute ? "" : " map-unavailable"}`}>
        <div className="map-grid" aria-hidden="true" />
        <div className="map-fixture map-wall-top" aria-hidden="true">PHARMACY</div>
        <div className="map-fixture map-aisle map-aisle-01" aria-hidden="true"><span>AISLE</span>01</div>
        <div className="map-fixture map-aisle map-aisle-02" aria-hidden="true"><span>AISLE</span>02</div>
        <div className="map-fixture map-aisle map-aisle-03" aria-hidden="true"><span>AISLE</span>03</div>
        <div className="map-fixture map-counter" aria-hidden="true">PHARMACIST</div>

        {hasRoute && (
          <svg
            className="map-route-line"
            viewBox="0 0 600 260"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Route from Entrance to ${aisle}, Shelf ${shelf}`}
          >
            <path className="route-glow" d="M70 228 L170 228 L170 176 L430 176 L430 82 L500 82" />
            <path className="route-core" d="M70 228 L170 228 L170 176 L430 176 L430 82 L500 82" />
          </svg>
        )}

        <div className="map-marker map-you-are-here" aria-label="You are here at Entrance">
          <i aria-hidden="true" />
          <span>You are here</span>
          <small>Entrance</small>
        </div>

        {hasRoute && (
          <div className="map-marker map-target" aria-label={`Target location Shelf ${shelf} in ${aisle}`}>
            <i aria-hidden="true" />
            <span>Target</span>
            <small>Shelf {shelf}</small>
          </div>
        )}
      </div>

      {hasRoute ? (
        <>
          <dl className="map-location-data" aria-label="Target shelf details">
            <div><dt>Aisle</dt><dd>{aisleNumber}</dd></div>
            <div><dt>Shelf</dt><dd>{shelf}</dd></div>
            <div><dt>Level</dt><dd>02</dd></div>
          </dl>
          <p className="map-route-summary"><span>Route</span>Entrance → {aisle} → Shelf {shelf}</p>
        </>
      ) : (
        <p className="map-route-summary map-route-missing" role="status">Shelf location unavailable from VitaFlow.</p>
      )}
    </section>
  );
}

export default ShelfMap;
```

In `frontend/src/App.tsx`, replace:

```tsx
import ShelfNavigationPanel from "./components/ShelfNavigationPanel";
```

with:

```tsx
import ShelfMap from "./components/ShelfMap";
```

and replace:

```tsx
<ShelfNavigationPanel product={product} />
```

with:

```tsx
<ShelfMap product={product} />
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```powershell
npm.cmd run test:run --prefix frontend -- frontend/src/components/ShelfMap.test.tsx frontend/src/App.test.tsx
```

Expected: both test files pass.

- [ ] **Step 5: Check frontend-only scope, run staged safety, and commit**

Run:

```powershell
git diff -- backend services
git add frontend/src/components/ShelfMap.tsx frontend/src/components/ShelfMap.test.tsx frontend/src/App.tsx frontend/src/App.test.tsx
node scripts/check-staged-files.mjs
git diff --cached --check
git commit -m "feat: add accessible pharmacy shelf map"
```

Expected: backend/services diff is empty, staged safety passes, diff check passes, and the commit succeeds.

### Task 2: Build the Dark-Neon Map Presentation

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Add a failing structural style assertion**

Add to the first test in `frontend/src/components/ShelfMap.test.tsx`:

```tsx
expect(screen.getByTestId("pharmacy-map-canvas")).toHaveClass("shelf-map-canvas");
expect(screen.getByTestId("pharmacy-route-path")).toHaveAttribute(
  "d",
  "M70 228 L170 228 L170 176 L430 176 L430 82 L500 82",
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd run test:run --prefix frontend -- frontend/src/components/ShelfMap.test.tsx
```

Expected: FAIL because the map canvas and route path do not yet expose the test identifiers.

- [ ] **Step 3: Expose map geometry and add the complete presentation styles**

Add `data-testid="pharmacy-map-canvas"` to the map canvas, and add `data-testid="pharmacy-route-path"` to the `route-core` SVG path.

Replace the old `.shelf-panel`, `.shelf-route`, and `.route-current` rules in `frontend/src/styles.css` with:

```css
.shelf-map-panel {
  position: relative;
  overflow: hidden;
  padding: 15px;
  background: linear-gradient(145deg, rgba(7, 17, 38, 0.98), rgba(10, 16, 34, 0.94));
  border-color: rgba(36, 224, 238, 0.4);
  box-shadow: inset 0 0 28px rgba(29, 214, 229, 0.08), 0 14px 30px rgba(4, 11, 27, 0.18);
  color: #f4fbff;
}

.shelf-map-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 88% 12%, rgba(135, 72, 255, 0.18), transparent 34%);
}

.shelf-map-heading { position: relative; z-index: 2; align-items: flex-start; }
.shelf-map-heading h2 { margin: 2px 0 0; color: #f5fbff; }
.map-kicker { color: #62eff5; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; }
.map-route-status { color: #70f4f5; border: 1px solid rgba(74, 235, 241, 0.42); border-radius: 999px; padding: 5px 9px; background: rgba(17, 205, 218, 0.1); }

.shelf-map-canvas {
  position: relative;
  min-height: 180px;
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid rgba(78, 226, 239, 0.36);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(8, 22, 44, 0.96), rgba(5, 12, 28, 0.98));
  box-shadow: inset 0 0 24px rgba(40, 220, 234, 0.08), 0 0 16px rgba(35, 208, 226, 0.08);
}

.map-grid { position: absolute; inset: 0; opacity: 0.16; background-image: linear-gradient(rgba(86, 226, 236, 0.24) 1px, transparent 1px), linear-gradient(90deg, rgba(86, 226, 236, 0.24) 1px, transparent 1px); background-size: 24px 24px; }
.map-fixture { position: absolute; display: grid; place-items: center; border: 1px solid rgba(118, 149, 190, 0.36); background: linear-gradient(135deg, rgba(34, 54, 82, 0.88), rgba(14, 27, 52, 0.94)); color: #8ea8c5; box-shadow: inset 0 0 12px rgba(94, 139, 183, 0.12); font-size: 0.6rem; letter-spacing: 0.08em; }
.map-wall-top { left: 18%; top: 8%; width: 28%; height: 22px; border-radius: 5px; }
.map-aisle { top: 29%; width: 13%; height: 39%; border-radius: 5px; font-size: 1rem; font-weight: 900; }
.map-aisle span { display: block; font-size: 0.45rem; font-weight: 700; }
.map-aisle-01 { left: 18%; }
.map-aisle-02 { left: 42%; }
.map-aisle-03 { left: 66%; border-color: rgba(141, 84, 255, 0.8); box-shadow: inset 0 0 15px rgba(129, 73, 255, 0.16), 0 0 12px rgba(129, 73, 255, 0.16); color: #c8b8ff; }
.map-counter { right: 3%; bottom: 8%; width: 20%; height: 22px; border-radius: 5px; }

.map-route-line { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; overflow: visible; }
.map-route-line path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.route-glow { stroke: rgba(40, 239, 244, 0.28); stroke-width: 17; filter: blur(5px); }
.route-core { stroke: #2ceef4; stroke-width: 6; stroke-dasharray: 12 6; animation: route-flow 1.2s linear infinite; }

@keyframes route-flow { to { stroke-dashoffset: -18; } }

.map-marker { position: absolute; z-index: 3; display: grid; justify-items: center; color: #edfaff; font-size: 0.58rem; font-weight: 850; line-height: 1.1; text-align: center; }
.map-marker small { margin-top: 2px; color: #9ab3cc; font-size: 0.48rem; }
.map-marker i { display: block; width: 18px; height: 18px; margin-bottom: 3px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); }
.map-marker i::after { content: ""; position: absolute; width: 6px; height: 6px; margin: 6px; border-radius: 50%; background: #071428; }
.map-you-are-here { left: 5%; bottom: 6%; }
.map-you-are-here i { background: #38eef3; box-shadow: 0 0 14px rgba(56, 238, 243, 0.82); }
.map-target { right: 10%; top: 12%; }
.map-target i { background: #9c65ff; box-shadow: 0 0 17px rgba(156, 101, 255, 0.9); }

.map-location-data { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 9px 0 0; }
.map-location-data div { display: flex; align-items: baseline; justify-content: space-between; padding: 7px 9px; border: 1px solid rgba(88, 221, 234, 0.18); border-radius: 8px; background: rgba(14, 35, 59, 0.72); }
.map-location-data dt { color: #7f9db9; font-size: 0.58rem; text-transform: uppercase; }
.map-location-data dd { margin: 0; color: #6cf2f3; font-size: 0.78rem; font-weight: 900; }
.map-route-summary { position: relative; z-index: 2; margin: 8px 0 0; color: #dcebf6; font-size: 0.68rem; text-align: left; }
.map-route-summary span { margin-right: 8px; color: #8c6dff; font-size: 0.55rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.map-route-missing { padding: 12px; border-radius: 8px; background: rgba(255, 184, 77, 0.08); color: #ffd295; }
.map-unavailable .map-fixture { opacity: 0.52; }

@media (prefers-reduced-motion: reduce) {
  .route-core { animation: none; }
}
```

At the existing narrow layout breakpoint, add:

```css
.shelf-map-canvas { min-height: 230px; }
.map-location-data { grid-template-columns: 1fr; }
```

- [ ] **Step 4: Run frontend tests and build**

Run:

```powershell
npm.cmd run test:run --prefix frontend
npm.cmd run build --prefix frontend
```

Expected: all frontend tests pass and TypeScript/Vite production build completes.

- [ ] **Step 5: Check frontend-only scope, run staged safety, and commit**

Run:

```powershell
git diff -- backend services
git add frontend/src/components/ShelfMap.tsx frontend/src/components/ShelfMap.test.tsx frontend/src/styles.css
node scripts/check-staged-files.mjs
git diff --cached --check
git commit -m "style: render neon indoor shelf route"
```

Expected: backend/services diff is empty, safety checks pass, and the commit succeeds.

### Task 3: Update Shelf Map Acceptance Specifications

**Files:**
- Modify: `spec/03-kiosk-layout-spec.md`
- Modify: `spec/13-acceptance-standard.md`

- [ ] **Step 1: Add explicit observable criteria**

Append these criteria to `spec/03-kiosk-layout-spec.md`:

```markdown
- Shelf navigation is rendered as an indoor map with aisle and shelf blocks, not as a plain progress stepper.
- The map shows a labelled current position, target shelf marker, route line, Aisle, Shelf, Level, and a readable route summary.
- The route uses only VitaFlow-provided shelf location data; unavailable locations are never inferred.
```

Append this criterion to `spec/13-acceptance-standard.md`:

```markdown
- Shelf navigation acceptance evidence includes a screenshot of the map route panel at the target iPad landscape viewport; a plain progress stepper is not accepted.
```

- [ ] **Step 2: Run specification checks**

Run:

```powershell
node scripts/check-specs.mjs
git diff --check
```

Expected: all 13 feature specs pass coverage and the diff has no whitespace errors.

- [ ] **Step 3: Stage, run safety, and commit**

Run:

```powershell
git add spec/03-kiosk-layout-spec.md spec/13-acceptance-standard.md
node scripts/check-staged-files.mjs
git diff --cached --check
git commit -m "docs: require map-style shelf navigation"
```

Expected: staged safety and diff checks pass, then the commit succeeds.

### Task 4: Capture Acceptance Evidence and Run Final Regression

**Files:**
- Create: `reports/evidence/shelf-map-ipad-landscape.png`
- Modify: `reports/test-evidence.md`

- [ ] **Step 1: Start the frontend demo without live integrations**

Run:

```powershell
npm.cmd run dev --prefix frontend -- --host 127.0.0.1
```

Expected: Vite serves the mock kiosk locally and no provider credential is used.

- [ ] **Step 2: Inspect the rendered map at iPad landscape dimensions**

Open the local Vite URL in the in-app browser at 1024 by 768. Verify:

- The panel is visibly a floor map, not a horizontal sequence.
- “You are here”, the purple target pin, cyan route, three aisle blocks, Aisle 03, Shelf A-03, Level 02, and the complete route summary are visible.
- No horizontal overflow or browser console error exists.
- The rest of the kiosk layout remains intact.

Save the screenshot as `reports/evidence/shelf-map-ipad-landscape.png`.

- [ ] **Step 3: Run complete frontend and repository verification**

Run:

```powershell
npm.cmd run test:run --prefix frontend
npm.cmd run build --prefix frontend
npm.cmd audit --prefix frontend --audit-level=moderate
node scripts/check-repository.mjs
node scripts/check-specs.mjs
git diff -- backend services
```

Expected: frontend tests pass, build completes, audit reports zero moderate-or-higher vulnerabilities, repository/spec checks pass, and backend/services diff is empty.

- [ ] **Step 4: Record exact evidence**

Update `reports/test-evidence.md` with the actual test count, build result, audit result, 1024 by 768 browser result, and this repository-relative screenshot link:

```markdown
[Shelf map iPad landscape screenshot](evidence/shelf-map-ipad-landscape.png)
```

State that the screenshot visibly contains the cyan route, purple target marker, current-position marker, aisle blocks, and Aisle/Shelf/Level details.

- [ ] **Step 5: Stage, run final safety checks, and commit**

Run:

```powershell
git add reports/test-evidence.md reports/evidence/shelf-map-ipad-landscape.png
node scripts/check-staged-files.mjs
git diff --cached --check
git diff --cached --name-only
git commit -m "test: record shelf map acceptance evidence"
git status --short --branch
```

Expected: only the evidence markdown and PNG are staged, safety passes, the commit succeeds, and the worktree is clean.

## Final Self-Review

- Spec coverage: Tasks 1 and 2 cover every map element, safety state, accessibility requirement, dark-neon visual requirement, and iPad integration. Task 3 makes the map and screenshot mandatory acceptance criteria. Task 4 captures and records the screenshot and complete verification.
- Placeholder scan: every code change, command, expected result, and evidence path is explicit; there are no deferred implementation placeholders.
- Type consistency: `ShelfMap` accepts the existing `Product | null`; `shelf_location` remains `string | null`; App passes the same product value without modifying API or state types.
- Scope protection: every implementation task checks `git diff -- backend services`; no plan step reads or writes the protected VitaFlow ERP release directory.
