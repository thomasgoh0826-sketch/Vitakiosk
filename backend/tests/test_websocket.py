from fastapi.testclient import TestClient


def test_websocket_broadcasts_only_to_matching_session(client: TestClient) -> None:
    with client.websocket_connect("/ws/kiosk/session-a") as socket_a:
        assert socket_a.receive_json() == {
            "type": "avatar_state",
            "session_id": "session-a",
            "state": "idle",
            "detail": "connected",
        }
        with client.websocket_connect("/ws/kiosk/session-b") as socket_b:
            assert socket_b.receive_json()["session_id"] == "session-b"

            response = client.post(
                "/api/voice/tts",
                json={"session_id": "session-a", "text": "Hello"},
            )
            assert response.status_code == 200
            event_a = socket_a.receive_json()
            assert event_a["session_id"] == "session-a"
            assert event_a["state"] == "speaking"

            socket_b.send_json({"type": "client_state", "state": "thinking"})
            event_b = socket_b.receive_json()
            assert event_b["session_id"] == "session-b"
            assert event_b["state"] == "thinking"


def test_websocket_rejects_invalid_client_state(client: TestClient) -> None:
    with client.websocket_connect("/ws/kiosk/session-a") as socket:
        socket.receive_json()
        socket.send_json({"type": "client_state", "state": "diagnosing"})

        event = socket.receive_json()

        assert event == {
            "type": "error",
            "session_id": "session-a",
            "detail": "invalid avatar state",
        }
