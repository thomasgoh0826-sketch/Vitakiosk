# Kiosk Layout Specification

## Purpose

Provide a readable iPad landscape pharmacy kiosk surface.

## Required regions

AI assistant, Hold to Speak, Product, Promotion, Shelf navigation, ERP data, and Pharmacist assistance.

## Acceptance criteria

- All seven regions have accessible names and render in the primary view.
- Landscape layout uses a persistent assistant column and a structured information area.
- Controls have at least 44px interactive height and visible focus treatment.
- Portrait and narrow layouts stack without horizontal overflow.
- Mock provenance and connection state remain visible.

## Test evidence

- `frontend/src/App.test.tsx`
- `frontend/src/App.integration.test.tsx`
- Browser screenshot evidence recorded in `reports/test-evidence.md`.
