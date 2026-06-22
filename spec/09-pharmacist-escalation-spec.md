# Pharmacist Escalation Specification

## Purpose

Stop unsafe self-service flows and request human assistance.

## Triggers

Red-flag phrases, diagnosis requests, and manual customer assistance requests.

## Acceptance criteria

- Red flags short-circuit before VitaFlow lookup and TTS.
- Diagnosis requests do not produce a diagnosis.
- Escalation creates an `ESC-####` mock record.
- WebSocket emits `pharmacist_escalation` for the correct session.
- UI presents an alert and keeps the pharmacist panel visible.
- UI shows a confirmation state with "Pharmacist assistance requested",
  "A pharmacist has been notified", and the escalation ID when available.
- UI offers "Start New Customer" / reset as the primary next action after the
  ticket is recorded; the kiosk must not require a browser refresh.
- Resetting the kiosk returns the assistant to `idle`, enables `Tap to Speak`,
  clears conversation/error/audio/microphone local state, restores default demo
  product, promotion, shelf, ERP, and pharmacist panel surfaces, and generates a
  fresh session when supported.
- Resetting the kiosk UI must not delete or cancel the original escalation
  ticket.
- If the customer does not press reset, the frontend auto-resets after a clear
  confirmation window of 10-20 seconds.

## Test evidence

- `backend/tests/test_ai_brain.py`
- `backend/tests/test_api.py`
- `backend/tests/test_websocket.py`
- `frontend/src/components/AvatarAssistant.test.tsx`
- `frontend/src/hooks/useVoiceInteraction.test.ts`
- `frontend/src/App.integration.test.tsx`
