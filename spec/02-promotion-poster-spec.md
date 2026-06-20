# Promotion and Poster Specification

## Purpose

Show only eligible promotions and posters for the current branch.

## Behavior

Promotion eligibility requires `active=true`, an exact branch match, a current validity window, and product membership. Idle posters must reference an eligible promotion.

## Safety constraints

- Do not create promotional claims from AI output.
- Do not show inactive, expired, future, or other-branch promotions.
- Mock posters contain no medical efficacy claim.

## Acceptance criteria

- `MOCK-PR001` appears for `MOCK-P001` at `SG-001` on 2026-06-21.
- Wrong-branch and inactive promotions are excluded.
- `MOCK-POSTER001` is the only eligible idle poster for `SG-001`.
- The UI labels promotion data as fictional mock data.

## Test evidence

- `backend/tests/test_services.py`
- `backend/tests/test_api.py`
- `frontend/src/App.integration.test.tsx`
