# VitaKiosk AI Pharmacy Kiosk

VitaKiosk is a mock-first pharmacy kiosk for iPad landscape use. It combines an animated assistant, hold-to-speak interaction, safety-first intent handling, fictional product and promotion data, and pharmacist escalation.

## Current status

The repository skeleton and safety policy are in place. The runnable React frontend and FastAPI backend are developed task-by-task from the approved implementation plan.

## Non-negotiable rules

- VitaFlow ERP remains the source of truth for product, stock, price, promotion, and shelf location.
- The assistant does not diagnose and does not replace a pharmacist.
- Red flags escalate; unknown products create purchasing queries.
- This demo uses fictional mock data and makes no live provider calls.
- Secrets belong only in a local `.env`, which is ignored by Git.

## Repository layout

- `frontend/`: React/Vite kiosk UI.
- `backend/`: FastAPI application and tests.
- `services/`: provider-neutral mock adapters.
- `spec/`: feature specifications and acceptance criteria.
- `docs/`: architecture and design documentation.
- `assets/`: repository-safe visual assets.
- `reports/`: test-evidence records.

Full setup and run instructions will be maintained here as the runnable skeleton is completed.
