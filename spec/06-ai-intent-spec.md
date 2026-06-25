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
- `AI_PROVIDER=ollama` may be selected only in local `.env`; tests use mocked transports and must not require or call a real Ollama server.
- Ollama output must be structured JSON and is accepted only after schema validation, allowed UI action validation, non-invention checks, and post-output safety guardrails.
- If local Ollama is offline, invalid, or unsafe, the backend returns the deterministic mock AI workflow result rather than uncontrolled model text.
- Tests and CI keep default mock AI provider mode and must not call external model services.
- Product counselling remains non-diagnostic and recommends pharmacist review.
- Pregnancy and breastfeeding questions, including English, Malay, and Chinese terms, return pharmacist escalation/review before any product, promotion, shelf, or purchasing-query flow.
- High-risk terms for child use, kidney disease, liver disease, blood thinner use, severe allergy, chest pain, breathing difficulty, fainting, high fever, and severe symptoms escalate before product flow.
- Price, stock, promotion, and shelf responses reproduce adapter facts exactly.
- Near product matches from the VitaFlow adapter return a confirmation flow
  such as `Do you mean Relief Balm?` with product candidates and without
  creating a purchasing query.
- Unknown products return no product and create one purchasing query.
- Backend AI responses may include only structured whitelisted `ui_actions`; arbitrary UI instructions are not valid output.
- Product-specific promotion and campaign actions reference only adapter-provided leaflet IDs.
- General promotion and campaign queries return active branch-valid leaflets only.
- Red-flag responses return pharmacist escalation actions and do not return promotion or campaign leaflets first.
- Session-scoped affirmative confirmations may open a pending leaflet modal or create pharmacist assistance, but they must not execute arbitrary UI behavior.

## Test evidence

- `backend/tests/test_ai_brain.py`
- `backend/tests/test_ollama_ai.py`
- `backend/tests/test_services.py`
- `backend/tests/test_provider_config.py`
- `backend/tests/test_api.py`
