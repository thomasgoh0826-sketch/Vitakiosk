from fastapi import HTTPException
from fastapi.testclient import TestClient
import pytest
from types import SimpleNamespace

from backend.app.routes import catalog as catalog_module
from services.models import TranscriptionResult
from services.models import Escalation


def test_vitaflow_asset_proxy_serves_same_origin_images(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requested: list[str] = []

    class ImageResponse:
        status_code = 200
        content = b"mock-webp"
        headers = {"content-type": "image/webp"}

    def fake_get(url: str, **_kwargs: object) -> ImageResponse:
        requested.append(url)
        return ImageResponse()

    monkeypatch.setattr(
        catalog_module,
        "settings",
        SimpleNamespace(vitaflow_api_base_url="http://vitaflow.test"),
    )
    monkeypatch.setattr(catalog_module.httpx, "get", fake_get)

    response = client.get("/api/vitaflow-assets/api/product-images/product.webp")

    assert response.status_code == 200
    assert response.content == b"mock-webp"
    assert response.headers["content-type"] == "image/webp"
    assert requested == ["http://vitaflow.test/api/product-images/product.webp"]


def test_vitaflow_asset_proxy_rejects_traversal_and_non_images(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with pytest.raises(HTTPException) as traversal:
        catalog_module.vitaflow_asset("../secret")
    assert traversal.value.status_code == 404

    class JsonResponse:
        status_code = 200
        content = b'{}'
        headers = {"content-type": "application/json"}

    monkeypatch.setattr(
        catalog_module,
        "settings",
        SimpleNamespace(vitaflow_api_base_url="http://vitaflow.test"),
    )
    monkeypatch.setattr(catalog_module.httpx, "get", lambda *_args, **_kwargs: JsonResponse())

    response = client.get("/api/vitaflow-assets/api/not-an-image")

    assert response.status_code == 404
    assert response.json() == {"detail": "VitaFlow asset unavailable"}


def test_transcribe_accepts_audio(client: TestClient) -> None:
    response = client.post(
        "/api/voice/transcribe",
        data={"session_id": "session-a"},
        files={"audio": ("voice.webm", b"\x1a\x45\xdf\xa3mock audio", "audio/webm")},
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
    assert response.json() == {
        "ok": False,
        "error": "invalid_audio",
        "message": "Audio could not be decoded. Please try again.",
    }


def test_transcribe_rejects_unsupported_content_type(client: TestClient) -> None:
    response = client.post(
        "/api/voice/transcribe",
        data={"session_id": "session-a"},
        files={"audio": ("voice.txt", b"not an audio file", "text/plain")},
    )

    assert response.status_code == 422
    assert response.json()["error"] == "invalid_audio"


def test_transcribe_rejects_malformed_audio_before_provider(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.routes import voice

    class UnexpectedSTT:
        provider_name = "unexpected"

        def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
            raise AssertionError("malformed audio should not reach provider")

    monkeypatch.setattr(voice, "stt", UnexpectedSTT())

    response = client.post(
        "/api/voice/transcribe",
        data={"session_id": "session-a"},
        files={"audio": ("voice.webm", b"not a webm file", "audio/webm")},
    )

    assert response.status_code == 422
    assert response.json() == {
        "ok": False,
        "error": "invalid_audio",
        "message": "Audio could not be decoded. Please try again.",
    }


def test_transcribe_provider_decode_failure_returns_controlled_error(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.routes import voice

    class DecodeFailingSTT:
        provider_name = "faster_whisper"

        def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
            del audio, content_type
            raise ValueError("ffmpeg could not decode input")

    monkeypatch.setattr(voice, "stt", DecodeFailingSTT())

    response = client.post(
        "/api/voice/transcribe",
        data={"session_id": "session-a"},
        files={"audio": ("voice.webm", b"\x1a\x45\xdf\xa3mock audio", "audio/webm")},
    )

    assert response.status_code == 422
    assert response.json()["error"] == "invalid_audio"


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
        "shelf": None,
        "reason": None,
    }
    assert payload["ui_actions"][1] == {
        "type": "OPEN_PRODUCT_DETAIL",
        "productId": "MOCK-P001",
        "promotionId": None,
        "campaignId": None,
        "shelf": None,
        "reason": None,
    }
    assert [leaflet["id"] for leaflet in payload["leaflets"]] == ["MOCK-LF-PROMO-001"]
    assert payload["source"] == "mock_vitaflow"


def test_ai_response_accepts_preferred_language_without_changing_product_facts(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/ai/respond",
        json={
            "session_id": "session-language",
            "text": "what is the price of relief balm",
            "branch_id": "SG-001",
            "preferred_language": "zh",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "price_check"
    assert payload["product"]["id"] == "MOCK-P001"
    assert payload["product"]["name"] == "Relief Balm"
    assert payload["product"]["price"] == 12.5
    assert payload["product"]["shelf_location"] == "A-03"
    assert payload["source"] == "mock_vitaflow"
    assert "VitaFlow mock" in payload["message"]
    assert "价格" in payload["message"]
    assert "RM12.50" in payload["message"]
    assert "price for" not in payload["message"]


def test_ai_response_uses_confirmed_scan_product_context_without_reopening_scanner(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/ai/respond",
        json={
            "session_id": "session-scan-followup",
            "text": "What is this product for, and how should I take it?",
            "branch_id": "SG-001",
            "current_product_id": "MOCK-P001",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["product"]["id"] == "MOCK-P001"
    assert "OPEN_PRODUCT_SCAN" not in [
        action["type"] for action in payload["ui_actions"]
    ]
    assert payload["requires_pharmacist"] is True


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
    assert "Hydration Health Campaign" in payload["message"]
    assert "Relief Balm Demo Leaflet" not in payload["message"]
    assert "Supplement Savings Demo" not in payload["message"]
    assert [action["type"] for action in payload["ui_actions"]] == [
        "SHOW_CAMPAIGN_GALLERY",
        "OPEN_CAMPAIGN_MODAL",
    ]
    assert payload["ui_actions"][1]["campaignId"] == "MOCK-LF-CAMP-001"
    assert [leaflet["id"] for leaflet in payload["leaflets"]] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
        "MOCK-LF-CAMP-001"
    ]


@pytest.mark.parametrize(
    "text",
    [
        "what can you do for me",
        "what is the weather today",
        "tell me a joke",
        "where is the toilet",
        "are you an AI",
    ],
)
def test_ai_non_product_questions_do_not_report_unknown_product(
    client: TestClient,
    text: str,
) -> None:
    response = client.post(
        "/api/ai/respond",
        json={
            "session_id": f"session-general-{text}",
            "text": text,
            "branch_id": "SG-001",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "general_conversation"
    assert payload["product"] is None
    assert payload["purchasing_query_id"] is None
    assert "not found" not in payload["message"].casefold()


@pytest.mark.parametrize(
    "text",
    [
        "promotion",
        "有什么promotion",
        "can you show me any promotion",
        "can you help me find any promotion",
        "could you help find available promotions",
        "show all active branch promotion",
        "show all active branch promot",
    ],
)
def test_ai_general_promotion_names_only_active_promotions(
    client: TestClient,
    text: str,
) -> None:
    response = client.post(
        "/api/ai/respond",
        json={
            "session_id": f"session-promotion-{text}",
            "text": text,
            "branch_id": "SG-001",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "promotion_check"
    assert "Relief Balm Demo Leaflet" in payload["message"]
    assert "Supplement Savings Demo" in payload["message"]
    assert "Hydration Health Campaign" not in payload["message"]
    assert [action["type"] for action in payload["ui_actions"]] == [
        "SHOW_PROMOTION_GALLERY",
        "OPEN_PROMOTION_MODAL",
    ]


@pytest.mark.parametrize("text", ["campaign", "caimpaign", "有什么campaign"])
def test_ai_general_campaign_variants_name_only_active_campaigns(
    client: TestClient,
    text: str,
) -> None:
    response = client.post(
        "/api/ai/respond",
        json={
            "session_id": f"session-campaign-{text}",
            "text": text,
            "branch_id": "SG-001",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "campaign_check"
    assert "Hydration Health Campaign" in payload["message"]
    assert "Relief Balm Demo Leaflet" not in payload["message"]
    assert "Supplement Savings Demo" not in payload["message"]
    assert [action["type"] for action in payload["ui_actions"]] == [
        "SHOW_CAMPAIGN_GALLERY",
        "OPEN_CAMPAIGN_MODAL",
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
    product = payload["items"][0]
    assert product["price"] == 12.5
    assert product["stock"] == 18
    assert product["shelf_location"] == "A-03"
    assert product["source"] == "mock_vitaflow"
    assert product["imageUrl"] == "/assets/mock-products/relief-balm-front.svg"
    assert product["thumbnailUrl"] == "/assets/mock-products/relief-balm-front.svg"
    assert product["images"][0] == {
        "url": "/assets/mock-products/relief-balm-front.svg",
        "type": "front_pack",
        "isPrimary": True,
        "alt": "Relief Balm product image",
    }
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


def test_product_search_returns_fuzzy_candidates_without_purchasing_query(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/products/search",
        params={"query": "Where is Relief Bomb?", "branch_id": "SG-001"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == []
    assert payload["purchasing_query_id"] is None
    assert payload["candidates"][0]["product"]["id"] == "MOCK-P001"
    assert payload["candidates"][0]["product"]["price"] == 12.5
    assert payload["candidates"][0]["product"]["stock"] == 18
    assert payload["candidates"][0]["product"]["shelf_location"] == "A-03"
    assert (
        payload["candidates"][0]["product"]["imageUrl"]
        == "/assets/mock-products/relief-balm-front.svg"
    )
    assert payload["candidates"][0]["match_reason"] == "near_name_match"


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


def test_active_leaflets_are_current_and_branch_aware(client: TestClient) -> None:
    response = client.get("/api/leaflets/active", params={"branch_id": "SG-001"})

    assert response.status_code == 200
    payload = response.json()
    assert [item["id"] for item in payload["items"]] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
        "MOCK-LF-CAMP-001",
    ]
    assert all(item["active"] for item in payload["items"])
    assert all(item["branch_id"] == "SG-001" for item in payload["items"])
    assert payload["source"] == "mock_vitaflow"


def test_shelf_map_returns_branch_map_with_regions(client: TestClient) -> None:
    response = client.get("/api/shelf-map", params={"branch_id": "SG-001"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["map"]["map_id"] == "MOCK-MAP-SG-001"
    assert payload["map"]["branch_id"] == "SG-001"
    assert payload["map"]["entrance"] == {"x": 8, "y": 84, "label": "Entrance"}
    assert [region["name"] for region in payload["map"]["regions"]] == [
        "Aisle 01",
        "Aisle 02",
        "Aisle 03",
        "Pharmacist",
    ]
    assert payload["source"] == "mock_vitaflow"


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


def test_escalation_endpoint_fails_closed_when_vitaflow_did_not_acknowledge(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.app.routes import actions

    class UnavailableEscalationStore:
        def create(self, reason: str, branch_id: str, *, session_id: str | None = None) -> Escalation:
            del session_id
            return Escalation(
                id="ERP-UNAVAILABLE",
                reason=reason,
                branch_id=branch_id,
                status="unavailable",
                source="vitaflow_erp_unavailable",
            )

    monkeypatch.setattr(actions, "escalation_store", UnavailableEscalationStore())

    response = client.post(
        "/api/escalate-pharmacist",
        json={
            "reason": "customer requested assistance",
            "branch_id": "JK",
            "session_id": "session-offline",
        },
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "VitaFlow did not acknowledge the pharmacist assistance request."
    }


def test_empty_product_query_is_rejected(client: TestClient) -> None:
    response = client.get(
        "/api/products/search",
        params={"query": "", "branch_id": "SG-001"},
    )

    assert response.status_code == 422


def test_scan_product_barcode_exact_match_returns_authoritative_candidate(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/vision/scan-product",
        data={"branch_id": "SG-001", "mode": "barcode_first"},
        files={
            "image": (
                "scan.jpg",
                b"\xff\xd8\xff mock camera frame BARCODE:9550000000019",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["provider"] == "mock"
    assert payload["scanSignals"]["barcode"] == "9550000000019"
    assert payload["scanSignals"]["imageSimilarity"] is False
    assert payload["scanSignals"]["ocr"] is False
    assert payload["candidates"][0]["product"]["id"] == "MOCK-P001"
    assert payload["candidates"][0]["product"]["price"] == 12.5
    assert payload["candidates"][0]["matchReason"] == "barcode_match"
    assert payload["requiresConfirmation"] is False


def test_scan_product_image_similarity_returns_candidate(client: TestClient) -> None:
    response = client.post(
        "/api/vision/scan-product",
        data={"branch_id": "SG-001", "mode": "image_first"},
        files={
            "image": (
                "scan.png",
                b"\x89PNG\r\n\x1a\n mock product photo IMAGE:MOCK-P001",
                "image/png",
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["scanSignals"]["barcode"] is None
    assert payload["scanSignals"]["imageSimilarity"] is True
    assert payload["candidates"][0]["product"]["id"] == "MOCK-P001"
    assert payload["candidates"][0]["confidence"] == 0.93
    assert payload["candidates"][0]["matchReason"] == "product_image_similarity"
    assert payload["requiresConfirmation"] is True


def test_scan_product_ocr_relief_bomb_returns_relief_balm_candidate(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/vision/scan-product",
        data={"branch_id": "SG-001", "mode": "ocr_first"},
        files={
            "image": (
                "scan.webp",
                b"RIFFxxxxWEBP OCR:Where is Relief Bomb?",
                "image/webp",
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["scanSignals"]["ocr"] is True
    assert payload["ocrText"] == "Where is Relief Bomb?"
    assert payload["correctedText"] == "Where is Relief Balm?"
    assert payload["candidates"][0]["product"]["id"] == "MOCK-P001"
    assert payload["candidates"][0]["matchReason"] in {
        "ocr_text_match",
        "near_name_match",
    }
    assert payload["requiresConfirmation"] is True


def test_scan_product_unrelated_image_returns_no_candidate(client: TestClient) -> None:
    response = client.post(
        "/api/vision/scan-product",
        data={"branch_id": "SG-001", "mode": "auto"},
        files={
            "image": (
                "scan.jpg",
                b"\xff\xd8\xff OCR:totally unrelated object",
                "image/jpeg",
            )
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["candidates"] == []
    assert payload["requiresConfirmation"] is False
    assert payload["message"] == "Product not found. Please try again or type the product name."


def test_scan_product_rejects_malformed_image(client: TestClient) -> None:
    response = client.post(
        "/api/vision/scan-product",
        data={"branch_id": "SG-001", "mode": "auto"},
        files={"image": ("scan.txt", b"not an image", "text/plain")},
    )

    assert response.status_code == 422
    assert response.json() == {
        "ok": False,
        "error": "invalid_image",
        "message": "Image could not be decoded. Please try again.",
    }


def test_scan_product_rejects_oversized_frame(client: TestClient) -> None:
    response = client.post(
        "/api/vision/scan-product",
        data={"branch_id": "SG-001", "mode": "auto"},
        files={"image": ("scan.jpg", b"x" * (4 * 1024 * 1024 + 1), "image/jpeg")},
    )

    assert response.status_code == 422
    assert response.json()["error"] == "invalid_image"


@pytest.mark.parametrize(
    "provider_error",
    ["agnes_direct_image_input_not_supported", "agnes_product_vision_unavailable"],
)
def test_scan_product_agnes_unavailable_returns_controlled_error(
    client: TestClient,
    monkeypatch,
    provider_error: str,
) -> None:
    from backend.app.routes import vision

    class UnavailableAgnesVision:
        provider_name = "agnes"

        def scan_product(self, image, content_type, branch_id, mode, vitaflow):
            del image, content_type, branch_id, mode, vitaflow
            raise RuntimeError(provider_error)

    monkeypatch.setattr(vision, "vision_adapter", UnavailableAgnesVision())

    response = client.post(
        "/api/vision/scan-product",
        data={"branch_id": "SG-001", "mode": "auto"},
        files={"image": ("scan.jpg", b"\xff\xd8\xff mock", "image/jpeg")},
    )

    assert response.status_code == 503
    assert response.json() == {
        "ok": False,
        "error": provider_error,
        "message": (
            "Cloud product vision is unavailable. "
            "Please scan again or search manually."
        ),
    }


def test_scan_product_provider_unavailable_returns_controlled_error(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.routes import vision

    class UnavailableVision:
        provider_name = "local_product_scan"

        def scan_product(self, image, content_type, branch_id, mode, vitaflow):
            del image, content_type, branch_id, mode, vitaflow
            raise RuntimeError("local_product_image_scan_not_configured")

    monkeypatch.setattr(vision, "vision_adapter", UnavailableVision())

    response = client.post(
        "/api/vision/scan-product",
        data={"branch_id": "SG-001", "mode": "auto"},
        files={"image": ("scan.jpg", b"\xff\xd8\xff mock", "image/jpeg")},
    )

    assert response.status_code == 503
    assert response.json() == {
        "ok": False,
        "error": "local_product_image_scan_not_configured",
        "message": "Local product image scan is not configured.",
    }
