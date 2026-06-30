# VitaFlow Adapter Specification

## Purpose

Define the only boundary allowed to provide authoritative commercial and shelf facts.

## Current adapter

`MockVitaFlowAPI` searches fictional in-repository records. It performs no file, database, or network access.

`VitaFlowAdapter` also exposes fuzzy read-only product candidate search through
`search_product_candidates(query, branch_id, limit=5)`. The method may help
identify likely products from near spelling, partial names, aliases, SKU/code,
barcode-capable future data, and STT variants, but it must return only
adapter-backed product facts plus confidence, match reason, and matched text.
It must not invent price, stock, shelf, promotion, branch, product details, or
availability.

For local product scan, the adapter also exposes read-only `get_product` and
`get_product_by_barcode` lookups. Vision/OCR/image-similarity layers may return
signals and candidate IDs, but VitaFlow/mock remains the only source for product
name, SKU, price, stock, branch, shelf, source, and availability.

Product image metadata is read-only adapter data. Mock and future VitaFlow
records may expose a primary image URL, thumbnail URL, and multiple image
entries with type, primary flag, and alt text. These fields support UI display
and future image-similarity indexing, but they do not authorize any frontend
hardcoded product image paths or any vision-generated product facts.

## Future connector

A live connector must implement `VitaFlowAdapter`, use an approved HTTP API, be selected explicitly, and never inspect an ERP release directory or database directly. The first live option is `VITAFLOW_PROVIDER=readonly_api` only.

## Acceptance criteria

- Mock mode starts without `VITAFLOW_API_BASE_URL`.
- Data returned by the AI equals adapter data.
- Branch mismatch returns no product.
- Credentials alone cannot activate live mode.
- `VITAFLOW_PROVIDER` defaults to `mock`.
- `readonly_api` is read-only and cannot write product, stock, promotion, shelf, purchasing, sales, or customer data.
- Fuzzy product search is branch-aware, read-only, sorted by confidence, and
  returns candidate facts from the adapter only.
- Barcode product lookup is branch-aware and read-only. Image/OCR matches must
  resolve product candidates through the adapter rather than returning raw
  model-invented product facts.
- Product image URLs, thumbnails, and image lists are returned only from the
  adapter/backend response. The frontend must fall back safely if a URL is
  absent, invalid, unsafe, or fails to load.
- Near-match candidates such as `Relief Bomb` -> `Relief Balm` do not create a
  purchasing query until the adapter returns no candidate.
- Tests must not call VitaFlow ERP or any real ERP database/API.
- `C:\Users\Admin\Documents\Playground\release` is never an integration source.

## Test evidence

- `backend/tests/test_services.py`
- `backend/tests/test_ai_brain.py`
- `backend/tests/test_api.py`
- `backend/tests/test_health.py`
- `backend/tests/test_provider_config.py`
- `scripts/check-repository.mjs`
