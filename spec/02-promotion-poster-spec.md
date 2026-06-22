# Promotion and Poster Specification

## Purpose

Show only eligible promotions, campaign leaflets, product leaflets, and posters for the current branch.

## Behavior

Promotion and campaign leaflet eligibility requires `active=true`, an exact branch match, and a current validity window. Product-specific leaflets must also include the current product ID. Category-linked leaflets must use adapter-provided category tags only. Idle posters must reference an eligible promotion.

The backend may return structured `ui_actions` to request a leaflet, gallery, modal, or pharmacist handoff. The frontend executes only whitelisted actions and must ignore arbitrary or unknown action types.

## Safety constraints

- Do not create promotional claims from AI output.
- Do not show inactive, expired, future, or other-branch promotions.
- Do not show inactive, expired, future, or other-branch campaign leaflets.
- Mock posters contain no medical efficacy claim.
- Pharmacist escalation overrides promotion/campaign browsing.

## Acceptance criteria

- `MOCK-PR001` appears for `MOCK-P001` at `SG-001` on 2026-06-21.
- Wrong-branch and inactive promotions are excluded.
- `MOCK-POSTER001` is the only eligible idle poster for `SG-001`.
- Product promotion leaflets appear automatically only when they are active, current, and branch-valid.
- Product with no specific promotion shows large touch-friendly `Promotion` and `Campaign` choices.
- General promotion/campaign questions show active branch-valid leaflets in a horizontal carousel.
- Leaflet modal supports enlarged view, next/previous when multiple leaflets exist, and close/back.
- Unknown frontend action types are ignored and never executed.
- The UI labels promotion data as fictional mock data.

## Test evidence

- `backend/tests/test_services.py`
- `backend/tests/test_api.py`
- `frontend/src/App.integration.test.tsx`
