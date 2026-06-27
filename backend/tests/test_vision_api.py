from fastapi.testclient import TestClient


def test_mock_vision_scan_returns_vitaflow_backed_candidate(client: TestClient) -> None:
    response = client.post(
        "/api/vision/scan-product",
        json={
            "session_id": "vision-session",
            "branch_id": "SG-001",
            "barcode": "955000000001",
            "ocr_text": "Relief Balm",
            "image_signature": "relief balm rectangular pack",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "mock"
    assert payload["source"] == "mock_vitaflow"
    assert payload["status"] == "mock_candidates"
    assert payload["requires_confirmation"] is True
    assert payload["product"] is None
    assert payload["candidates"][0]["product"]["id"] == "MOCK-P001"
    assert payload["candidates"][0]["product"]["price"] == 12.5
    assert payload["candidates"][0]["product"]["imageUrl"] == "/assets/products/mock-relief-balm.svg"
    assert "barcode_lookup" in payload["candidate_generation"]
    assert "fuzzy_product_search" in payload["candidate_generation"]


def test_mock_vision_scan_creates_purchasing_query_instead_of_guess(client: TestClient) -> None:
    response = client.post(
        "/api/vision/scan-product",
        json={
            "session_id": "vision-session",
            "branch_id": "SG-001",
            "ocr_text": "unknown capsule box",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "purchasing_query_created"
    assert payload["requires_confirmation"] is False
    assert payload["candidates"] == []
    assert payload["product"] is None
    assert payload["purchasing_query_id"].startswith("PQ-")
    assert "instead of guessing" in payload["message"]


def test_mock_vision_scan_sanitizes_text(client: TestClient) -> None:
    response = client.post(
        "/api/vision/scan-product",
        json={
            "session_id": "vision-session",
            "branch_id": "SG-001",
            "ocr_text": "<script>Relief Bomb</script>",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["candidates"][0]["matched_text"] == "Relief Bomb"
    assert payload["candidates"][0]["match_reason"] == "near_name_match"
