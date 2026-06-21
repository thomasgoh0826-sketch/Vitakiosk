# AI Intent Specification

## Purpose

Classify requests deterministically before any future model integration.

## Required intents

`product_search`, `product_counselling`, `price_check`, `stock_check`, `promotion_check`, `shelf_location`, `unknown_product`, and `red_flag`.

## Acceptance criteria

- Phrase-table classification covers every required intent.
- Safety runs before classification and product lookup.
- `AI_PROVIDER` defaults to `mock`.
- Safety guardrails run before any live AI adapter response path.
- OpenAI or Ollama credentials alone cannot activate a live AI adapter.
- Tests must use the mock AI provider only and must not call external model services.
- Product counselling remains non-diagnostic and recommends pharmacist review.
- Price, stock, promotion, and shelf responses reproduce adapter facts exactly.
- Unknown products return no product and create one purchasing query.

## Test evidence

- `backend/tests/test_ai_brain.py`
- `backend/tests/test_services.py`
- `backend/tests/test_provider_config.py`
