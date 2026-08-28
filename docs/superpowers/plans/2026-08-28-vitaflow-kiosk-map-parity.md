# VitaFlow and VitaKiosk Map Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the installed VitaFlow ERP and VitaKiosk render the same authoritative Jalan Kulim floor-plan geometry, with readable styling, safe editing, and honest collision-aware kiosk routing.

**Architecture:** VitaFlow remains the read-only source of map regions and product locations. The adapter normalizes VitaFlow's center-coordinate contract without changing authoritative geometry; a focused frontend geometry module renders and routes in the same `0..100` space. A repository-owned, idempotent runtime patch updates the installed VitaFlow map UI after backing up only the two active runtime assets, without accessing the protected release directory or writing the ERP database.

**Tech Stack:** Python dataclasses and pytest, React 18 and TypeScript, Vitest and Testing Library, CSS, Node.js runtime-patch and parity scripts, installed VitaFlow HTML/JavaScript/CSS runtime.

---

## File structure

- `services/models.py`: authoritative kiosk-side Python map DTOs.
- `services/vitaflow_api.py`: read-only VitaFlow response normalization.
- `backend/tests/test_vitaflow_readonly_api.py`: adapter contract and no-fabrication regression tests.
- `frontend/src/types.ts`: browser-side map metadata contract.
- `frontend/src/components/shelfMapGeometry.ts`: center geometry, rectangle intersection, and deterministic route planning.
- `frontend/src/components/shelfMapGeometry.test.ts`: pure geometry and route tests.
- `frontend/src/components/ShelfMap.tsx`: shared base-map and kiosk overlay rendering.
- `frontend/src/components/ShelfMap.test.tsx`: dashboard, enlarged viewer, interaction, and degraded-state tests.
- `frontend/src/styles.css`: shared `5:3` floor-plan styling inside existing kiosk chrome.
- `scripts/patch-vitaflow-map-runtime.mjs`: idempotent backup and narrow installed-runtime patch.
- `scripts/patch-vitaflow-map-runtime.test.mjs`: fixture-based runtime patch tests.
- `scripts/verify-map-parity.mjs`: live VitaFlow/API geometry and intersection verification.
- `reports/test-evidence.md`: commands, installed version, backup paths, parity output, and screenshot evidence.
- Installed files modified by the patcher only:
  - `C:\Users\Admin\AppData\Local\Programs\vitaflow-pharmacy-erp\resources\frontend-runtime\software-live-overrides.js`
  - `C:\Users\Admin\AppData\Local\Programs\vitaflow-pharmacy-erp\resources\frontend-runtime\software.css`

The patcher must never read or write `C:\Users\Admin\Documents\Playground\release` and must never modify `pharmacy-erp.db`.

### Task 1: Normalize the read-only center-coordinate contract

**Files:**
- Modify: `backend/tests/test_vitaflow_readonly_api.py:286-358`
- Modify: `services/models.py:57-66`
- Modify: `services/vitaflow_api.py:419-500`

- [ ] **Step 1: Write failing adapter tests for center geometry and metadata**

Replace the old top-left assertions with tests that prove full extents are retained and metadata survives:

```python
def test_readonly_api_normalizes_center_regions_and_preserves_visual_metadata() -> None:
    adapter = ReadOnlyVitaFlowAPI(base_url="http://vitaflow.invalid")
    shelf_map = adapter._map_shelf_map({"map": {
        "id": "MAP-JK-LIVE",
        "branchCode": "JK",
        "regions": [
            {
                "id": "SHELF-A",
                "regionName": "Shelf Island A",
                "regionType": "Shelf",
                "x": 65.01,
                "y": 25.01,
                "width": 46.73,
                "height": 7.85,
                "color": "#587ca8",
                "shape": "pill",
                "rotation": 4,
                "zIndex": 7,
                "layerKind": "fixture",
                "isVisible": True,
            }
        ],
    }}, "JK")

    assert shelf_map is not None
    region = shelf_map.regions[0]
    assert (region.x, region.y, region.width, region.height) == (65.01, 25.01, 46.73, 7.85)
    assert (region.color, region.shape, region.rotation, region.z_index, region.layer_kind) == (
        "#587ca8", "pill", 4, 7, "fixture"
    )
```

Add a second test with `x=99`, `width=20` and assert the normalized center is `90`, not that width becomes `1`. Add a third test with no explicit entrance and a visible `Main Entrance` region and assert `entrance.x/y` equal that region's center. Add a fourth test with neither source and assert `entrance is None`.

- [ ] **Step 2: Run the focused tests and confirm the old contract fails**

Run:

```powershell
python -m pytest backend/tests/test_vitaflow_readonly_api.py -k "shelf_map or center_regions or entrance" -q
```

Expected: failures show truncated widths, missing metadata fields, and a fabricated `(8, 84)` entrance.

- [ ] **Step 3: Extend the DTO and implement center-based normalization**

Add these fields to `ShelfMapRegion`:

```python
color: str | None = None
shape: str = "rounded"
rotation: float = 0
z_index: int = 0
layer_kind: str | None = None
```

In `_map_shelf_map_region`, normalize with the full width and height:

```python
safe_width = min(max(width if width is not None else 10, 2), 100)
safe_height = min(max(height if height is not None else 10, 2), 100)
safe_x = min(max(x if x is not None else safe_width / 2, safe_width / 2), 100 - safe_width / 2)
safe_y = min(max(y if y is not None else safe_height / 2, safe_height / 2), 100 - safe_height / 2)
```

Map `color`, normalized `shape`, `rotation`, `zIndex`, and `layerKind`. In `_map_shelf_map`, use an explicit entrance only when both coordinates exist; otherwise locate the visible region whose normalized name is `main entrance` and use its `x/y`; otherwise keep `entrance=None`.

- [ ] **Step 4: Run the focused adapter tests**

Run the command from Step 2.

Expected: all selected tests pass and the offline/no-fabrication tests remain green.

- [ ] **Step 5: Commit only the adapter contract files**

```powershell
git add -- services/models.py services/vitaflow_api.py backend/tests/test_vitaflow_readonly_api.py
node scripts/check-staged-files.mjs
git commit -m "fix: preserve VitaFlow center map geometry"
```

### Task 2: Add one testable browser geometry module

**Files:**
- Create: `frontend/src/components/shelfMapGeometry.ts`
- Create: `frontend/src/components/shelfMapGeometry.test.ts`
- Modify: `frontend/src/types.ts:84-93`

- [ ] **Step 1: Write failing pure geometry tests**

Cover center rectangles, touching versus intersection, and route authority:

```ts
it("uses x and y as the region center", () => {
  expect(regionRect({ ...region, x: 65, y: 25, width: 40, height: 10 }))
    .toEqual({ left: 45, top: 20, right: 85, bottom: 30, width: 40, height: 10 });
});

it("does not count touching edges as an overlap", () => {
  expect(rectanglesIntersect(rect(0, 0, 20, 20), rect(20, 0, 40, 20))).toBe(false);
  expect(rectanglesIntersect(rect(0, 0, 21, 20), rect(20, 0, 40, 20))).toBe(true);
});

it("returns no route without an authoritative entrance or target", () => {
  expect(buildOrthogonalRoute(null, { x: 70, y: 30 }, [])).toBeNull();
  expect(buildOrthogonalRoute({ x: 8, y: 88 }, null, [])).toBeNull();
});
```

Add a route test with a shelf rectangle between `(10, 80)` and `(80, 20)` and assert every returned segment has no positive-area intersection with the inflated obstacle.

- [ ] **Step 2: Run the pure tests and verify they fail because the module is absent**

```powershell
npm.cmd run test:run --prefix frontend -- src/components/shelfMapGeometry.test.ts
```

Expected: module resolution failure.

- [ ] **Step 3: Implement the center geometry and deterministic route candidates**

Export these exact APIs:

```ts
export const MAP_VIEWBOX = { width: 600, height: 360 } as const;
export type MapPoint = { x: number; y: number };
export type MapRect = { left: number; top: number; right: number; bottom: number; width: number; height: number };
export function regionRect(region: ShelfMapRegion): MapRect;
export function centerOfRegion(region: ShelfMapRegion | null): MapPoint | null;
export function rectanglesIntersect(left: MapRect, right: MapRect): boolean;
export function buildOrthogonalRoute(
  entrance: MapPoint | null,
  target: MapPoint | null,
  obstacles: MapRect[],
): MapPoint[] | null;
export function routeToSvgPath(points: MapPoint[]): string;
```

`regionRect` must subtract/add half extents. `rectanglesIntersect` must use strict inequalities so touching edges are allowed. `buildOrthogonalRoute` must evaluate, in order, horizontal-first, vertical-first, left/right boundary corridors, and top/bottom boundary corridors; remove duplicate consecutive points, reject any candidate whose segment crosses an obstacle inflated by `1.5%`, and select the shortest remaining candidate with stable candidate-order tie breaking. Return `null` when no candidate is safe.

Add the same visual fields from Task 1 to the TypeScript `ShelfMapRegion` interface, using `z_index` and `layer_kind` names to match the API JSON.

- [ ] **Step 4: Run the pure geometry tests**

Run the command from Step 2.

Expected: all geometry and route tests pass.

- [ ] **Step 5: Commit the isolated geometry unit**

```powershell
git add -- frontend/src/types.ts frontend/src/components/shelfMapGeometry.ts frontend/src/components/shelfMapGeometry.test.ts
node scripts/check-staged-files.mjs
git commit -m "feat: add shared center map geometry"
```

### Task 3: Render the authoritative floor plan identically in both kiosk sizes

**Files:**
- Modify: `frontend/src/components/ShelfMap.test.tsx:205-321`
- Modify: `frontend/src/components/ShelfMap.tsx:1-520`
- Modify: `frontend/src/styles.css:418-670,6048-6160`

- [ ] **Step 1: Write failing rendering and interaction tests**

Add tests which assert:

```ts
const shelf = screen.getByRole("group", { name: "Shelf Island A, Shelf" });
expect(shelf).toHaveStyle({
  left: "65.01%",
  top: "25.01%",
  width: "46.73%",
  height: "7.85%",
  transform: "translate(-50%, -50%) rotate(4deg)",
  zIndex: "17",
});
expect(screen.getByTestId("pharmacy-map-surface")).toHaveAttribute("data-map-ratio", "5:3");
```

Test `square`, `rounded`, and `pill` shape classes; preserved `--region-color`; no route when entrance is `null`; region highlight without target marker when an exact pin is missing; outside click and Escape closure for both manual and `openMapToken` opening.

- [ ] **Step 2: Run the ShelfMap tests and confirm the current top-left renderer fails**

```powershell
npm.cmd run test:run --prefix frontend -- src/components/ShelfMap.test.tsx
```

Expected: missing transform/metadata semantics and authority tests fail.

- [ ] **Step 3: Replace local geometry with the shared module**

Remove the component-local `centerOfRegion`, the `(8,84)` entrance fallback, and the fixed `600x260` scaling. Import `MAP_VIEWBOX`, `centerOfRegion`, `regionRect`, `buildOrthogonalRoute`, and `routeToSvgPath`. Exclude the entrance region and target region from route obstacles; treat `aisle` and `entrance` as walkable and all other visible regions as obstacles.

Render every region with:

```tsx
style={{
  left: `${region.x}%`,
  top: `${region.y}%`,
  width: `${region.width}%`,
  height: `${region.height}%`,
  transform: `translate(-50%, -50%) rotate(${region.rotation}deg)`,
  zIndex: region.z_index + 10,
  "--region-color": region.color ?? "#6d8092",
} as React.CSSProperties}
```

Keep all authoritative visible regions even when a reference image exists; the image is a neutral background, not a substitute for live region data. Use `role="group"`, a descriptive `aria-label`, and `title` on each region instead of `aria-hidden`.

- [ ] **Step 4: Apply the shared visual language in CSS**

Make `.map-plan-surface` a centered `aspect-ratio: 5 / 3` surface with `width:100%`, `max-height:100%`, warm-neutral floor, restrained grid, and letterboxing. Derive region border/fill using `color-mix(... var(--region-color) ...)`; keep labels inside with `overflow:hidden`, two-line wrapping, `text-wrap:balance`, and size-aware font clamps. Add `.map-shape-square`, `.map-shape-rounded`, and `.map-shape-pill`. Keep the cyan route, entrance, and purple target strictly on overlay z-indexes above the base map.

- [ ] **Step 5: Run component tests and the production frontend build**

```powershell
npm.cmd run test:run --prefix frontend -- src/components/ShelfMap.test.tsx src/components/shelfMapGeometry.test.ts
npm.cmd run build --prefix frontend
```

Expected: tests pass; TypeScript and Vite build complete without errors.

- [ ] **Step 6: Commit the kiosk rendering change**

```powershell
git add -- frontend/src/components/ShelfMap.tsx frontend/src/components/ShelfMap.test.tsx frontend/src/styles.css
node scripts/check-staged-files.mjs
git commit -m "fix: render VitaFlow map geometry consistently"
```

### Task 4: Build and test the reversible VitaFlow runtime patch

**Files:**
- Create: `scripts/patch-vitaflow-map-runtime.mjs`
- Create: `scripts/patch-vitaflow-map-runtime.test.mjs`

- [ ] **Step 1: Write failing idempotence, backup, and protected-path tests**

Use temporary fixture copies named `software-live-overrides.js` and `software.css`. Assert that the patcher:

```js
assert.equal(result.changedFiles.length, 2);
assert.equal(result.databaseWrites, 0);
assert.match(patchedJs, /VITAFLOW_MAP_PARITY_PATCH_V1/);
assert.match(patchedCss, /aspect-ratio:\s*5\s*\/\s*3/);
assert.deepEqual(await patchRuntime(fixture), await patchRuntime(fixture));
await assert.rejects(() => patchRuntime("C:\\Users\\Admin\\Documents\\Playground\\release"), /protected/i);
```

The test must also simulate a missing anchor and assert the patcher restores both files from its timestamped backup.

- [ ] **Step 2: Run the Node test and verify it fails before the patcher exists**

```powershell
node --test scripts/patch-vitaflow-map-runtime.test.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement a narrow, idempotent patcher**

The exported `patchRuntime(runtimeRoot, options)` must:

1. resolve and reject any path within the protected release directory;
2. require both expected runtime files and exact function/CSS anchors;
3. back them up under `%APPDATA%\vitaflow-pharmacy-erp\codex-backups\map-parity-<timestamp>` before writing;
4. never open or copy `pharmacy-erp.db`;
5. inject one `VITAFLOW_MAP_PARITY_PATCH_V1` JavaScript block and one CSS block;
6. write to temporary sibling files and atomically replace the originals only after both patched contents validate;
7. restore both originals if either replacement fails;
8. return `{ changedFiles, backupDirectory, databaseWrites: 0, alreadyApplied }`.

The JavaScript patch must keep `inventoryLocationRegionGeometry` as the single center-coordinate normalizer, add strict positive-area same-layer intersection detection, ignore touching edges, and require explicit confirmation before saving a real overlap. The CSS patch must set the planner viewport/stage/print map to `5 / 3`, contain the full stage, keep labels clipped/wrapped within regions, and use the same neutral floor/region color treatment as the kiosk.

- [ ] **Step 4: Run the fixture tests twice**

Run the command from Step 2 twice.

Expected: both runs pass; the second fixture application reports `alreadyApplied: true` and creates no duplicate markers.

- [ ] **Step 5: Commit the runtime patcher, not installed runtime files**

```powershell
git add -- scripts/patch-vitaflow-map-runtime.mjs scripts/patch-vitaflow-map-runtime.test.mjs
node scripts/check-staged-files.mjs
git commit -m "feat: add reversible VitaFlow map runtime patch"
```

### Task 5: Apply the VitaFlow patch and prove live geometry parity

**Files:**
- Create: `scripts/verify-map-parity.mjs`
- Modify: `reports/test-evidence.md`
- Runtime modification through the tested patcher only: the two installed files listed above.

- [ ] **Step 1: Write the live parity verifier before applying the patch**

The script must fetch `http://127.0.0.1:3100/api/vitakiosk/catalog/shelf-map?branchCode=JK`, normalize each visible region into `{id,name,left,top,right,bottom,width,height}`, fail on any out-of-bounds rectangle, and report strict positive-area intersections only within the same `layerKind`. It must emit stable JSON containing region count, intersection count, and every normalized rectangle.

- [ ] **Step 2: Run the verifier against the current VitaFlow endpoint**

```powershell
node scripts/verify-map-parity.mjs --url http://127.0.0.1:3100 --branch JK --output reports/evidence/map-parity-before.json
```

Expected current JK result: authoritative regions are returned, center-normalized intersection count is `0`, and no rectangle is out of bounds. If the endpoint is unavailable, start VitaFlow normally and rerun; do not substitute mock data.

- [ ] **Step 3: Apply the tested runtime patch**

```powershell
node scripts/patch-vitaflow-map-runtime.mjs --runtime "C:\Users\Admin\AppData\Local\Programs\vitaflow-pharmacy-erp\resources\frontend-runtime"
```

Expected: two runtime files patched, an AppData backup directory printed, `databaseWrites: 0`, and protected release access count `0`.

- [ ] **Step 4: Restart VitaFlow and rerun parity verification**

Close and reopen VitaFlow Pharmacy ERP 0.1.272, then run:

```powershell
node scripts/verify-map-parity.mjs --url http://127.0.0.1:3100 --branch JK --output reports/evidence/map-parity-after.json
```

Expected: the same region IDs and normalized rectangles as before; intersections remain `0`; the patch changed presentation/validation, not authoritative geometry.

- [ ] **Step 5: Commit the verifier and textual evidence**

Record installed version, exact backup directory, before/after hashes, region count, zero intersections, zero database writes, and zero protected-release access in `reports/test-evidence.md`.

```powershell
git add -- scripts/verify-map-parity.mjs reports/test-evidence.md reports/evidence/map-parity-before.json reports/evidence/map-parity-after.json
node scripts/check-staged-files.mjs
git commit -m "test: verify VitaFlow kiosk map parity"
```

### Task 6: Browser acceptance and regression verification

**Files:**
- Modify: `reports/test-evidence.md`
- Create: `reports/evidence/vitaflow-map-parity.png`
- Create: `reports/evidence/vitakiosk-map-parity.png`

- [ ] **Step 1: Run all relevant automated checks**

```powershell
python -m pytest backend/tests/test_vitaflow_readonly_api.py -q
npm.cmd run test:run --prefix frontend -- src/components/ShelfMap.test.tsx src/components/shelfMapGeometry.test.ts
npm.cmd run build --prefix frontend
npm.cmd run check:repo
node scripts/check-provider-secrets.mjs
git diff --check
```

Expected: every command exits `0`. Secret scan output must contain no credential values.

- [ ] **Step 2: Validate VitaFlow live behavior**

Open the Jalan Kulim overall-location view and editor. Confirm Shelf Island A/B/C, Counselling Room, Loading Bay, Counter 1/2, Poison Store Room, Promo Display B/C, New zone, New shelf, and Main Entrance are fully inside the `5:3` map and readable. Drag a temporary unsaved region until it touches another region and confirm no warning; move it one grid step into the region and confirm an overlap warning appears. Cancel the draft so the database remains unchanged.

- [ ] **Step 3: Validate VitaKiosk live behavior**

At `http://127.0.0.1:5175/`, load a real VitaFlow JK product with an authoritative location. Confirm the dashboard and enlarged map use the same region rectangles as VitaFlow, route segments avoid non-walkable regions, exact-pin absence is stated honestly, outside click closes an AI-opened map, and Escape closes it too. Load a product with no shelf location and confirm no target or route is fabricated.

- [ ] **Step 4: Capture comparable evidence**

Capture both maps at the same `5:3` interior aspect ratio into the two evidence PNGs. Append the automated command results, manual checks, screenshot paths, and any unavoidable limitation to `reports/test-evidence.md`.

- [ ] **Step 5: Commit only final evidence changes**

```powershell
git add -- reports/test-evidence.md reports/evidence/vitaflow-map-parity.png reports/evidence/vitakiosk-map-parity.png
node scripts/check-staged-files.mjs
git commit -m "docs: record live map parity acceptance"
```

### Task 7: Final safety audit and handoff

**Files:**
- Read-only audit of all files committed by Tasks 1-6.

- [ ] **Step 1: Inspect the exact commit range and staged state**

```powershell
git log --oneline --max-count=8
git status --short
git diff HEAD~6..HEAD --check
```

Expected: map commits contain only the listed repository files; unrelated pre-existing worktree changes remain untouched.

- [ ] **Step 2: Recheck data and secret safety**

Confirm no `.env`, key, database, log, backup, customer, or sales file is committed. Confirm the patcher's recorded `databaseWrites` is `0` and the protected release directory was never accessed.

- [ ] **Step 3: Deliver an evidence-based handoff**

Report the live VitaFlow/Kiosk URLs, test results, parity region/intersection counts, installed runtime version, reversible backup path, screenshot links, and the precise limitation that a future VitaFlow application update may overwrite the installed runtime patch.
