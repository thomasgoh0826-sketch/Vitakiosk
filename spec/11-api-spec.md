# API Specification

## Purpose

Expose typed mock contracts for the kiosk without provider-specific route logic.

## Endpoints

`GET /health`, three voice/AI POST routes, three catalog GET routes, two action POST routes, and one WebSocket route.

## Acceptance criteria

- Every requested route is present in OpenAPI except the WebSocket, which is registered separately.
- Empty audio and empty search values return validation errors.
- `/api/voice/transcribe` returns `transcript`, `provider`, `language`, and `clarification_needed` metadata for both mock and explicitly enabled Whisper STT.
- TTS returns `audio/wav` and `X-Voice-Provider: mock_tts`.
- Product, promotion, poster, query, and escalation responses include mock provenance.
- AI responses include customer-safe text plus structured `ui_actions` and active branch-valid leaflet data when the workflow calls for UI changes.
- `ui_actions` must be from the approved action set; no free-form click target, URL, selector, or raw UI instruction is accepted.
- Backend starts without provider credentials.

## Test evidence

- `backend/tests/test_health.py`
- `backend/tests/test_api.py`
- `backend/tests/test_websocket.py`
