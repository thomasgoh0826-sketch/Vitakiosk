# AI Intent Specification

## Purpose

Classify requests deterministically before any future model integration.

## Required intents

`product_search`, `product_counselling`, `price_check`, `stock_check`, `promotion_check`, `campaign_check`, `shelf_location`, `unknown_product`, and `red_flag`.

## Acceptance criteria

- Phrase-table classification covers every required intent.
- Safety runs before classification and product lookup.
- Safety evaluates raw, corrected, and normalized request text before product lookup, unknown-product handling, purchasing-query creation, promotion matching, shelf navigation, or recommendation text.
- `AI_PROVIDER` defaults to `mock`.
- Safety guardrails run before any live AI adapter response path.
- OpenAI or Ollama credentials alone cannot activate a live AI adapter.
- Tests must use the mock AI provider only and must not call external model services.
- Product counselling remains non-diagnostic and recommends pharmacist review.
- Pregnancy and breastfeeding questions, including English, Malay, and Chinese terms, return pharmacist escalation/review before any product, promotion, shelf, or purchasing-query flow.
- Price, stock, promotion, and shelf responses reproduce adapter facts exactly.
- Unknown products return no product and create one purchasing query.
- Backend AI responses may include only structured whitelisted `ui_actions`; arbitrary UI instructions are not valid output.
- Product-specific promotion and campaign actions reference only adapter-provided leaflet IDs.
- General promotion and campaign queries return active branch-valid leaflets only.
- Red-flag responses return pharmacist escalation actions and do not return promotion or campaign leaflets first.
- Session-scoped affirmative confirmations may open a pending leaflet modal or create pharmacist assistance, but they must not execute arbitrary UI behavior.

## Test evidence

- `backend/tests/test_ai_brain.py`
- `backend/tests/test_services.py`
- `backend/tests/test_provider_config.py`
- `backend/tests/test_api.py`
