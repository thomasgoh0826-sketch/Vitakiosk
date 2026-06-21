# Shelf Map Redesign

## Scope

Replace the stepper-like shelf navigation presentation with a static, map-style indoor pharmacy route panel. The change is limited to frontend components, layout, styles, accessibility, frontend tests, acceptance specifications, and screenshot evidence.

Backend endpoints, API contracts, mock datasets, WebSocket behavior, VitaFlow adapters, and safety rules remain unchanged.

## Component Design

Add `frontend/src/components/ShelfMap.tsx`. The component accepts the existing product value and uses only its available shelf location. It must not derive or invent a location when the source value is missing.

The existing application composition will render `ShelfMap` in place of `ShelfNavigationPanel`. The old file will be preserved to avoid deleting existing files, but it will no longer be used by the kiosk screen.

## Visual Design

The component uses a responsive HTML/CSS map canvas with an inline SVG route overlay:

- A dark navy and near-black glassmorphism map surface with glowing cyan borders.
- Block-shaped aisles and shelves arranged like an indoor floor plan, not a sequence of steps.
- A clearly labelled entrance marker for “You are here”.
- A cyan route with right-angle turns from the entrance to the target shelf.
- A purple target pin positioned at Shelf A-03 in Aisle 03.
- Location readouts for Aisle 03, Shelf A-03, and Level 02.
- Route summary: `Entrance → Aisle 03 → Shelf A-03`.

The map stays legible in iPad landscape kiosk mode and remains contained within the existing dashboard grid.

## Data and Safety States

The initial route geometry and Level 02 value are static mock presentation data. Shelf identification is displayed only when the existing product contains a shelf location.

When the shelf location is unavailable:

- No target location is guessed.
- The active route and target marker are hidden or visually disabled.
- The panel states that the VitaFlow shelf location is unavailable.

VitaFlow remains the source of truth for future dynamic route data.

## Accessibility

- The panel exposes `Shelf navigation map` as its accessible region name.
- The route graphic has a useful accessible name instead of relying on colour alone.
- “You are here” and the target marker have explicit text labels.
- A screen-reader route summary provides the full route and location details.
- Decorative aisle blocks and glow effects are hidden from assistive technology.
- Text and focus states maintain readable contrast on the dark map surface.

## Verification

Frontend tests will verify:

- The map region and route graphic are present.
- Current-position and target markers are labelled.
- Aisle, shelf, level, and full route values are displayed.
- Missing shelf data produces an unavailable state without a guessed route.
- The old progress-stepper presentation is no longer rendered by the kiosk.

Acceptance evidence will include a screenshot of the completed map route panel at iPad landscape dimensions. The normal frontend test, type-check/build, and staged-file safety checks must pass before commit.
