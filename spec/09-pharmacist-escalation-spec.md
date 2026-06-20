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

## Test evidence

- `backend/tests/test_ai_brain.py`
- `backend/tests/test_api.py`
- `backend/tests/test_websocket.py`
- `frontend/src/components/AvatarAssistant.test.tsx`
- `frontend/src/hooks/useVoiceInteraction.test.ts`
