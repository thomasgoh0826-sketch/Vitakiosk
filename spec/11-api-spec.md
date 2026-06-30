# API Specification

## Purpose

Expose typed mock contracts for the kiosk without provider-specific route logic.

## Endpoints

`GET /health`, three voice/AI POST routes, three catalog GET routes, one local product scan POST route, two action POST routes, and one WebSocket route.

## Acceptance criteria

- Every requested route is present in OpenAPI except the WebSocket, which is registered separately.
- `/health` returns service status, provider mode, and a provider summary for development diagnostics without requiring live provider credentials.
- Empty audio and empty search values return validation errors.
- `/api/voice/transcribe` returns `transcript`, `provider`, `language`, `confidence`, `clarification_needed`, `corrected_transcript`, `detected_terms`, and `possible_product_matches` metadata for mock, explicitly enabled OpenAI Whisper STT, and explicitly enabled local faster-whisper STT.
- `/api/voice/transcribe` rejects empty, unsupported, malformed, or provider-undecodable audio with a controlled 422 `invalid_audio` JSON response instead of a backend 500. The response must not expose stack traces, raw audio, local file paths, provider internals, API keys, or customer data.
- TTS returns `audio/wav` and `X-Voice-Provider: mock_tts`.
- Product, promotion, poster, query, and escalation responses include mock provenance.
- Product search responses include exact `items`, fuzzy `candidates`, mock
  provenance, and a purchasing-query ID only when neither exact products nor
  candidates are available.
- `POST /api/vision/scan-product` accepts one uploaded image plus `branch_id`
  and optional scan `mode`; it returns `provider`, `scanSignals`, candidate
  products, confirmation requirement, OCR/correction metadata when available,
  and controlled errors for malformed images or unavailable local scan
  configuration. The route must not save raw camera frames by default and must
  return only VitaFlow/mock-backed product facts.
- AI responses include customer-safe text plus structured `ui_actions`, active
  branch-valid leaflet data, and `product_candidates` when the workflow needs a
  customer to confirm a near product match.
- `ui_actions` must be from the approved action set; no free-form click target,
  URL, selector, or raw UI instruction is accepted. Product detail,
  promotion-modal, and shelf-map open actions must include enough adapter-backed
  identifiers for the frontend to verify the target before opening any overlay.
- `GET /api/runtime/status` returns safe local runtime provider diagnostics only: STT provider, AI provider, TTS provider, VitaFlow provider, vision provider, Ollama reachability, and selected Ollama model. It must not expose API keys, `.env` values, model cache paths, database URLs, logs, customer data, sales data, or private VitaFlow URLs.
- Backend starts without provider credentials.

## Test evidence

- `backend/tests/test_health.py`
- `backend/tests/test_api.py`
- `backend/tests/test_websocket.py`
