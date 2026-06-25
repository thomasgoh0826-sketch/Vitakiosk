# Product Data Specification

## Purpose

Display branch-scoped product facts without inventing authoritative values.

## Behavior

Product search uses the VitaFlow adapter and returns ID, name, price, stock, shelf location, branch, source, and an unavailable reason when applicable. Initial records are fictional and marked `mock_vitaflow`.

When a typed or spoken product name is close but not exact, the adapter may
return fuzzy product candidates with confidence, match reason, and matched text.
Candidate identification is only an aid to selection: all displayed facts still
come from the VitaFlow/mock adapter, and a customer selection is required for
medium-confidence or ambiguous matches.

## Safety constraints

- Never infer missing price, stock, shelf location, or product details.
- A missing product creates a purchasing query.
- Product data contains no customer or sales fields.

## Acceptance criteria

- Known `MOCK-P001` returns the exact fixture values for `SG-001`.
- The same search in an unrelated branch returns no item.
- Unknown product responses contain no product object and include a purchasing-query ID.
- Near-name product search such as `Relief Bomb` returns a `Relief Balm`
  candidate with Mock VitaFlow facts and no purchasing-query ID.
- Candidate cards show only customer-safe match labels such as `Best match`,
  product facts, branch, shelf, and source; technical scoring terms are not
  shown to customers.
- Missing values display `Unavailable from VitaFlow`.

## Test evidence

- `backend/tests/test_services.py`
- `backend/tests/test_api.py`
- `frontend/src/App.integration.test.tsx`
