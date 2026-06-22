# WebSocket Specification

## Purpose

Synchronize avatar state without leaking events between kiosks.

## Contract

Connect to `/ws/kiosk/{session_id}`. Server events include type, session ID, canonical state, and detail. Clients may send `client_state` with a canonical state.

## Acceptance criteria

- A new connection receives `idle`.
- HTTP state events reach only matching-session sockets.
- Cross-session events are ignored by the frontend.
- Invalid client states receive a structured error.
- Disconnect switches the frontend to local state and schedules bounded reconnect.
- When the frontend starts a new customer session after escalation, local socket
  state resets to `idle` and the next session must not inherit the previous
  session's `pharmacist_escalation` state.

## Test evidence

- `backend/tests/test_websocket.py`
- `frontend/src/hooks/useKioskSocket.test.ts`
