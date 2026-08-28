# VitaFlow and VitaKiosk Map Parity Design

Date: 2026-08-28
Status: approved by user

## Objective

Make the Jalan Kulim pharmacy map readable, professional, and geometrically identical in VitaFlow ERP and VitaKiosk. VitaFlow remains the source of truth. VitaKiosk may add a route and target overlay, but it must not reinterpret, invent, move, resize, or restyle authoritative regions inconsistently.

This work must not access or modify `C:\Users\Admin\Documents\Playground\release`.

## Confirmed root cause

VitaFlow stores each region's `x` and `y` as the region center, with `width` and `height` as full percentage extents. VitaFlow renders regions with `translate(-50%, -50%)` and clamps the center to half-width/half-height boundaries.

VitaKiosk currently treats the same `x` and `y` as the top-left corner. Its read-only adapter also truncates a region using `100 - x` and `100 - y`, which is only valid for top-left coordinates. This shifts and clips regions such as Shelf Island A and Promo Display C. Route generation then adds half the region size again, producing another coordinate error.

Using VitaFlow's center-coordinate interpretation, the current visible JK regions have no rectangle intersections. The authoritative region positions do not need to be rewritten merely to fix the kiosk display.

## Chosen approach

Use one explicit center-coordinate map contract and one visual floor-plan language in both applications.

The shared semantic contract is:

- map coordinate space: `0..100` percentages;
- `x`, `y`: region center;
- `width`, `height`: full region extents;
- fixed floor-plan aspect ratio: `1200:720` (`5:3`);
- region metadata: name, type, color, shape, rotation, z-index, visibility, layer kind;
- entrance: the center of the authoritative Main Entrance region when present;
- item pin: authoritative VitaFlow product pin only;
- route: a VitaKiosk-only overlay that uses the same coordinate space and never changes base-map geometry.

## Data contract changes

`ShelfMapRegion` will preserve the VitaFlow fields currently discarded by the read-only adapter:

- `color`
- `shape`
- `rotation`
- `z_index`
- `layer_kind`

The adapter will normalize rather than reinterpret:

1. Clamp width and height to valid extents.
2. Clamp the region center to `[width / 2, 100 - width / 2]` and `[height / 2, 100 - height / 2]`.
3. Preserve color, shape, rotation, z-index, visibility, and layer kind.
4. Derive the entrance from the `Main Entrance` region center when the ERP response has no explicit entrance point.
5. Never synthesize a VitaFlow region or item pin.

The backend response remains read-only. Product, stock, price, promotion, and location data are not written by VitaKiosk.

## Shared visual design

The map interior will use the same neutral, professional pharmacy-floor-plan treatment in both applications:

- warm-neutral floor surface with a restrained structural grid;
- consistent region fill derived from the VitaFlow region color;
- clear dark labels with a secondary type label;
- shape mapping: rounded, square, and pill exactly as VitaFlow stores it;
- identical rotation and stacking order;
- one consistent border and radius system;
- no decorative glow inside the authoritative floor plan;
- labels use size-aware wrapping or abbreviation and never escape a region;
- very small regions show a short name with the full name retained in accessible text/title;
- the floor plan is always letterboxed at `5:3`, never stretched.

VitaKiosk keeps its existing dark-neon application chrome outside the map. The map content itself matches VitaFlow. The kiosk route, entrance marker, and target marker sit on an overlay layer above the identical base map.

## VitaFlow ERP improvements

The active installed VitaFlow runtime will receive a narrow, reversible map update. Before editing, its active runtime files and local database will be backed up outside the protected release directory.

The VitaFlow map editor/viewer will:

- keep the stage at the same `5:3` aspect ratio used by VitaKiosk;
- use the shared region visual rules;
- keep labels within their blocks;
- show the complete map without regions being clipped by the modal;
- validate center-coordinate bounds before saving;
- detect real same-layer rectangle intersections and show a clear warning before save;
- permit an overlap only when the user explicitly confirms it for a legitimate layered-zone use case;
- retain its existing undo/redo, lock, visibility, zoom, grid, and snapping behavior.

No current JK geometry will be changed unless the validation pass finds an actual center-coordinate overlap or out-of-bounds region. Existing item-to-region assignments remain intact.

Changes to the installed runtime may be overwritten by a future VitaFlow application update. Acceptance evidence will identify the installed version and the exact backed-up runtime files so the change can be reapplied deliberately if needed.

## VitaKiosk rendering changes

The kiosk map renderer will:

- render every authoritative region with `left: x%`, `top: y%`, and `translate(-50%, -50%)`;
- preserve the full ERP width and height after center-based clamping;
- use the ERP color, shape, rotation, z-index, and layer kind;
- use the same `5:3` floor-plan viewport in the dashboard and enlarged viewer;
- calculate a region center as `(x, y)`, not `(x + width / 2, y + height / 2)`;
- place the entrance at the authoritative Main Entrance region center;
- place a target only when VitaFlow provides a product pin or matching region;
- display unavailable state rather than a fabricated region, marker, or route.

## Route logic

When an authoritative target exists, VitaKiosk will calculate a deterministic orthogonal route over the shared `0..100` coordinate space.

- Region rectangles are treated as obstacles with a small safety margin.
- Main Entrance is the route origin.
- The target is the authoritative product pin, or the matched region center when an exact pin is unavailable.
- The route must not cross a non-walkable shelf, counter, room, store, or display region.
- Aisle and entrance regions may be used as walkable areas.
- If no collision-free path can be produced, the kiosk shows the region highlight and an unavailable-route message rather than drawing a misleading line.

## Error and degraded states

- VitaFlow unavailable: keep the existing map unavailable state; never fall back to mock geometry in live mode.
- Map returned without regions: show the reference floor plan only and explain that regions are unavailable.
- Invalid region metadata: omit only the invalid region and record a validation warning; do not shift other regions to compensate.
- Missing product pin: highlight the matched authoritative region and say that the exact pin is not set.
- Missing entrance: show the base map but do not draw a route.
- VitaFlow runtime patch failure: restore the backed-up runtime files and leave the ERP database unchanged.

## Test-first implementation

Implementation begins with failing tests for:

1. center-coordinate geometry preserves full width and height;
2. Shelf Island A and Promo Display C render at their VitaFlow rectangles;
3. region center calculation returns `(x, y)`;
4. Main Entrance supplies the entrance point;
5. color, shape, rotation, z-index, and layer kind survive ERP mapping;
6. map stage keeps a `5:3` ratio at dashboard and enlarged sizes;
7. labels do not overflow their region;
8. a route does not cross obstacle rectangles;
9. no route is drawn when entrance or target authority is missing;
10. VitaFlow overlap validation distinguishes touching edges, real intersections, and explicitly confirmed layered overlaps.

## Acceptance criteria

The change is complete only when all of the following are recorded:

- Kiosk and VitaFlow region geometry match for every visible JK region.
- Automated parity evidence compares the normalized rectangle for every region by ID/name.
- No JK region is clipped or visually overlaps another region in either application.
- Shelf Island A, Shelf Island B, Shelf Island C, counters, rooms, displays, entrance, and loading bay are readable.
- Kiosk dashboard and enlarged map both preserve the same map aspect ratio.
- A real VitaFlow product location produces a route or an honest unavailable-route state.
- Clicking outside and Escape still dismiss the enlarged kiosk map.
- VitaFlow editor reload preserves the map after restart.
- VitaKiosk frontend tests, backend tests, production build, repository checks, provider-secret scan, and diff checks pass.
- Live screenshots from both applications are captured at comparable dimensions for side-by-side review.
- No product, stock, price, promotion, customer, or sales data is modified.

## Out of scope

- Writing inventory, sales, stock, price, promotion, or customer data from VitaKiosk.
- Replacing VitaFlow's map editor with a new standalone service.
- Accessing or modifying `C:\Users\Admin\Documents\Playground\release`.
- Inventing missing product locations or navigation pins.
