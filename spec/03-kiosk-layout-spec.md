# Kiosk Layout Specification

## Purpose

Provide a readable iPad landscape pharmacy kiosk surface.

## Required regions

AI assistant, primary voice control plus Hold to Speak fallback, Product, Promotion, Shelf navigation, ERP data, and Pharmacist assistance.

## Acceptance criteria

- All seven regions have accessible names and render in the primary view.
- Landscape layout uses a persistent assistant column and a structured information area.
- Controls have at least 44px interactive height and visible focus treatment.
- Portrait and narrow layouts stack without horizontal overflow.
- Mock provenance and connection state remain visible.
- The primary landscape view uses a dark navy/black cinematic foundation, glass panels, cyan and purple neon accents, and no plain white dashboard background.
- The primary voice interaction reads `Tap to Speak` when ready and `Tap to Stop` while listening.
- At 1024 × 768 landscape, the assistant bay, conversation/product deck, promotion poster, shelf map, ERP panel, and pharmacist safety panel fit in one view without document scrolling.
- The promotion region is a poster composition rather than a small dashboard card.
- The existing Hold to Speak control may remain only as a visually secondary fallback.
- Shelf navigation is rendered as an indoor map with aisle and shelf blocks, not as a plain progress stepper.
- The map shows a labelled current position, target shelf marker, route line, Aisle, Shelf, Level, and a readable route summary.
- The route uses only VitaFlow-provided shelf location data; unavailable locations are never inferred.

## Test evidence

- `frontend/src/App.test.tsx`
- `frontend/src/App.integration.test.tsx`
- `frontend/src/components/ShelfMap.test.tsx`
- Browser screenshot evidence recorded in `reports/test-evidence.md`, including the 1024 × 768 dark neon single-screen composition.
