# Purchasing Query Specification

## Purpose

Capture unknown-product demand without guessing a catalog record.

## Behavior

Unknown searches create an in-memory `PQ-####` record containing only query text, branch, open status, and mock source.

## Acceptance criteria

- An unknown AI request creates exactly one query.
- Direct unknown product search returns an empty item list and a query ID.
- The frontend displays the query ID and removes prior product data.
- No customer identifier is stored.

## Test evidence

- `backend/tests/test_ai_brain.py`
- `backend/tests/test_api.py`
- `frontend/src/App.integration.test.tsx`
