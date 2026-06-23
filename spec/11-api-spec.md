# API Specification

## Purpose

Expose typed mock contracts for the kiosk without provider-specific route logic.

## Endpoints

`GET /health`, three voice/AI POST routes, three catalog GET routes, two action POST routes, and one WebSocket route.

## Acceptance criteria

- Every requested route is present in OpenAPI except the WebSocket, which is registered separately.
- `/health` returns service status, provider mode, and a provider summary for development diagnostics without requiring live provider credentials.
- Empty audio and empty search values return validation errors.
- `/api/voice/transcribe` returns `transcript`, `provider`, `language`, `confidence`, `clarification_needed`, `corrected_transcript`, `detected_terms`, and `possible_product_matches` metadata for mock, explicitly enabled OpenAI Whisper STT, and explicitly enabled local faster-whisper STT.
- TTS returns `audio/wav` and `X-Voice-Provider: mock_tts`.
- Product, promotion, poster, query, and escalation responses include mock provenance.
- AI responses include customer-safe text plus structured `ui_actions` and active branch-valid leaflet data when the workflow calls for UI changes.
- `ui_actions` must be from the approved action set; no free-form click target, URL, selector, or raw UI instruction is accepted.
- `GET /api/runtime/status` returns safe local runtime provider diagnostics only: STT provider, AI provider, TTS provider, VitaFlow provider, vision provider, Ollama reachability, and selected Ollama model. It must not expose API keys, `.env` values, model cache paths, database URLs, logs, customer data, sales data, or private VitaFlow URLs.
- Backend starts without provider credentials.

## Test evidence

- `backend/tests/test_health.py`
- `backend/tests/test_api.py`
- `backend/tests/test_websocket.py`
