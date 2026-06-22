from fastapi.testclient import TestClient
import pytest


def test_health_reports_mock_mode(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "vitakiosk-api",
        "provider_mode": "mock",
    }


@pytest.mark.parametrize(
    "origin",
    [
        "http://127.0.0.1:5175",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
)
def test_local_dev_cors_allows_vite_ports(client: TestClient, origin: str) -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
