# VitaFlow Adapter Specification

## Purpose

Define the only boundary allowed to provide authoritative commercial and shelf facts.

## Current adapter

`MockVitaFlowAPI` searches fictional in-repository records. It performs no file, database, or network access.

## Future connector

A live connector must implement `VitaFlowAdapter`, use an approved HTTP API, be selected explicitly, and never inspect an ERP release directory or database directly. The first live option is `VITAFLOW_PROVIDER=readonly_api` only.

## Acceptance criteria

- Mock mode starts without `VITAFLOW_API_BASE_URL`.
- Data returned by the AI equals adapter data.
- Branch mismatch returns no product.
- Credentials alone cannot activate live mode.
- `VITAFLOW_PROVIDER` defaults to `mock`.
- `readonly_api` is read-only and cannot write product, stock, promotion, shelf, purchasing, sales, or customer data.
- Tests must not call VitaFlow ERP or any real ERP database/API.
- `C:\Users\Admin\Documents\Playground\release` is never an integration source.

## Test evidence

- `backend/tests/test_services.py`
- `backend/tests/test_ai_brain.py`
- `backend/tests/test_health.py`
- `backend/tests/test_provider_config.py`
- `scripts/check-repository.mjs`
