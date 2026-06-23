from fastapi.testclient import TestClient


def test_transcribe_accepts_audio(client: TestClient) -> None:
    response = client.post(
        "/api/voice/transcribe",
        data={"session_id": "session-a"},
        files={"audio": ("voice.webm", b"mock audio", "audio/webm")},
    )

    assert response.status_code == 200
    assert response.json() == {
        "transcript": "show me pain relief products",
        "provider": "mock_stt",
        "language": "english",
        "confidence": 1.0,
        "clarification_needed": False,
        "corrected_transcript": "show me pain relief products",
        "detected_terms": [],
        "possible_product_matches": [],
    }


def test_transcribe_rejects_empty_audio(client: TestClient) -> None:
    response = client.post(
        "/api/voice/transcribe",
        data={"session_id": "session-a"},
        files={"audio": ("voice.webm", b"", "audio/webm")},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Audio payload is empty"


def test_ai_response_returns_authoritative_product(client: TestClient) -> None:
    response = client.post(
        "/api/ai/respond",
        json={
            "session_id": "session-a",
            "text": "what is the price of relief balm",
            "branch_id": "SG-001",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "price_check"
    assert payload["product"]["id"] == "MOCK-P001"
    assert payload["product"]["price"] == 12.5
    assert payload["ui_actions"][0] == {
        "type": "SHOW_PRODUCT",
        "productId": "MOCK-P001",
        "promotionId": None,
        "campaignId": None,
    }
    assert payload["ui_actions"][1]["type"] == "SHOW_PROMOTION_LEAFLET"
    assert payload["ui_actions"][1]["promotionId"] == "MOCK-LF-PROMO-001"
    assert [leaflet["id"] for leaflet in payload["leaflets"]] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
        "MOCK-LF-CAMP-001",
    ]
    assert payload["source"] == "mock_vitaflow"


def test_ai_red_flag_creates_escalation(client: TestClient) -> None:
    response = client.post(
        "/api/ai/respond",
        json={
            "session_id": "session-red",
            "text": "I cannot breathe",
            "branch_id": "SG-001",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "red_flag"
    assert payload["requires_pharmacist"] is True
    assert payload["escalation_id"].startswith("ESC-")
    assert payload["product"] is None
    assert payload["leaflets"] == []
    assert [action["type"] for action in payload["ui_actions"]] == [
        "REQUEST_PHARMACIST_ASSISTANCE"
    ]


def test_ai_general_campaign_returns_controlled_gallery_action(client: TestClient) -> None:
    response = client.post(
        "/api/ai/respond",
        json={
            "session_id": "session-campaign",
            "text": "what health campaign do you have?",
            "branch_id": "SG-001",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "campaign_check"
    assert [action["type"] for action in payload["ui_actions"]] == [
        "SHOW_CAMPAIGN_GALLERY"
    ]
    assert [leaflet["id"] for leaflet in payload["leaflets"]] == [
        "MOCK-LF-CAMP-001"
    ]


def test_tts_returns_mock_wav(client: TestClient) -> None:
    response = client.post(
        "/api/voice/tts",
        json={"session_id": "session-a", "text": "Hello"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/wav")
    assert response.headers["x-voice-provider"] == "mock_tts"
    assert response.content[:4] == b"RIFF"


def test_product_search_returns_mock_product(client: TestClient) -> None:
    response = client.get(
        "/api/products/search",
        params={"query": "relief balm", "branch_id": "SG-001"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert [product["id"] for product in payload["items"]] == ["MOCK-P001"]
    assert payload["purchasing_query_id"] is None


def test_product_not_found_creates_purchasing_query(client: TestClient) -> None:
    response = client.get(
        "/api/products/search",
        params={"query": "dragon miracle capsule", "branch_id": "SG-001"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == []
    assert payload["purchasing_query_id"].startswith("PQ-")


def test_promotion_match_is_branch_aware(client: TestClient) -> None:
    matching = client.get(
        "/api/promotions/match",
        params={"product_id": "MOCK-P001", "branch_id": "SG-001"},
    )
    wrong_branch = client.get(
        "/api/promotions/match",
        params={"product_id": "MOCK-P001", "branch_id": "SG-002"},
    )

    assert matching.status_code == 200
    assert [item["id"] for item in matching.json()["items"]] == ["MOCK-PR001"]
    assert wrong_branch.status_code == 200
    assert wrong_branch.json()["items"] == []


def test_idle_posters_are_active_and_branch_aware(client: TestClient) -> None:
    response = client.get("/api/posters/idle", params={"branch_id": "SG-001"})

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [
        "MOCK-POSTER001"
    ]


def test_purchasing_query_endpoint_creates_mock_record(client: TestClient) -> None:
    response = client.post(
        "/api/purchasing-query",
        json={"query": "fictional requested item", "branch_id": "SG-001"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["id"].startswith("PQ-")
    assert payload["status"] == "open"
    assert payload["source"] == "mock_memory"


def test_escalation_endpoint_creates_mock_record(client: TestClient) -> None:
    response = client.post(
        "/api/escalate-pharmacist",
        json={"reason": "customer requested assistance", "branch_id": "SG-001"},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["id"].startswith("ESC-")
    assert payload["status"] == "waiting_for_pharmacist"
    assert payload["source"] == "mock_memory"


def test_empty_product_query_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/api/products/search",
        params={"query": "", "branch_id": "SG-001"},
    )

    assert response.status_code == 422
