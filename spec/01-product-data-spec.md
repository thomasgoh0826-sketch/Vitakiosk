# Product Data Specification

## Purpose

Display branch-scoped product facts without inventing authoritative values.

## Behavior

Product search uses the VitaFlow adapter and returns ID, name, price, stock, shelf location, branch, source, and an unavailable reason when applicable. Initial records are fictional and marked `mock_vitaflow`.

## Safety constraints

- Never infer missing price, stock, shelf location, or product details.
- A missing product creates a purchasing query.
- Product data contains no customer or sales fields.

## Acceptance criteria

- Known `MOCK-P001` returns the exact fixture values for `SG-001`.
- The same search in an unrelated branch returns no item.
- Unknown product responses contain no product object and include a purchasing-query ID.
- Missing values display `Unavailable from VitaFlow`.

## Test evidence

- `backend/tests/test_services.py`
- `backend/tests/test_api.py`
- `frontend/src/App.integration.test.tsx`
