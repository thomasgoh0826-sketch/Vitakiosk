# Pharmacist Escalation Specification

## Purpose

Stop unsafe self-service flows and request human assistance.

## Triggers

Red-flag phrases, pregnancy or breastfeeding safety questions, diagnosis
requests, and manual customer assistance requests.

## Acceptance criteria

- Red flags short-circuit before VitaFlow lookup and TTS.
- Pregnancy and breastfeeding questions short-circuit before product lookup,
  promotion matching, shelf navigation, unknown-product handling, and
  purchasing-query creation.
- Diagnosis requests do not produce a diagnosis.
- With `VITAFLOW_ASSISTANCE_PROVIDER=mock`, escalation creates an `ESC-####`
  local mock record and never contacts VitaFlow.
- With the explicitly reviewed `VITAFLOW_ASSISTANCE_PROVIDER=vitaflow_api`
  selector and `VITAFLOW_PROVIDER=readonly_api`, escalation creates a
  branch-scoped VitaFlow VitaKiosk queue case containing only the branch,
  session identifier, request reason, priority, and source. It must not send
  customer identity, audio, transcript history, stock, sales, or medical advice.
- The Kiosk may say "A pharmacist has been notified" only after VitaFlow returns
  an authoritative case code. Missing acknowledgement returns a service error
  and the UI presents an explicit notification failure instead of an `ESC`
  placeholder.
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
