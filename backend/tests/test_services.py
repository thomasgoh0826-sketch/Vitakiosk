from datetime import UTC, datetime

import pytest

from services.poster_engine import PosterEngine
from services.leaflet_engine import LeafletEngine
from services.models import LeafletKind
from services.models import Product
from services.product_vision import LocalProductScanVision, MockProductVision
from services.promotion_engine import PromotionEngine
from services.safety_guardrails import SafetyGuardrails
from services.vitaflow_api import MockVitaFlowAPI
from services.voice_ai import (
    ElevenLabsTTS,
    MockSTT,
    MockTTS,
    normalize_malaysian_currency_for_speech,
)


NOW = datetime(2026, 6, 21, 12, 0, tzinfo=UTC)


@pytest.fixture
def vitaflow() -> MockVitaFlowAPI:
    return MockVitaFlowAPI()


def test_known_product_returns_mock_vitaflow_facts(vitaflow: MockVitaFlowAPI) -> None:
    products = vitaflow.search_products("relief balm", "SG-001")

    assert len(products) == 1
    product = products[0]
    assert product.id == "MOCK-P001"
    assert product.price == 12.50
    assert product.stock == 18
    assert product.shelf_location == "A-03"
    assert product.source == "mock_vitaflow"


def test_unknown_product_is_not_invented(vitaflow: MockVitaFlowAPI) -> None:
    assert vitaflow.search_products("dragon miracle capsule", "SG-001") == []


def test_product_search_is_branch_scoped(vitaflow: MockVitaFlowAPI) -> None:
    assert vitaflow.search_products("relief balm", "SG-999") == []


def test_fuzzy_search_suggests_relief_balm_for_relief_bomb(
    vitaflow: MockVitaFlowAPI,
) -> None:
    candidates = vitaflow.search_product_candidates("Where is Relief Bomb?", "SG-001")

    assert candidates
    best = candidates[0]
    assert best.product.id == "MOCK-P001"
    assert best.product.name == "Relief Balm"
    assert best.product.price == 12.50
    assert best.product.stock == 18
    assert best.product.shelf_location == "A-03"
    assert best.product.source == "mock_vitaflow"
    assert 0.80 <= best.confidence < 0.95
    assert best.match_reason == "near_name_match"
    assert best.matched_text == "Relief Bomb"


def test_fuzzy_search_preserves_branch_scope(vitaflow: MockVitaFlowAPI) -> None:
    assert vitaflow.search_product_candidates("Where is Relief Bomb?", "SG-999") == []


def test_fuzzy_search_sorts_multiple_candidates_by_confidence() -> None:
    vitaflow = MockVitaFlowAPI(
        products=(
            Product(
                id="MOCK-RELIEF-CREAM",
                name="Relief Cream",
                aliases=("relief cream",),
                branch_id="SG-001",
                price=9.9,
                stock=6,
                shelf_location="A-04",
            ),
            Product(
                id="MOCK-RELIEF-BALM",
                name="Relief Balm",
                aliases=("relief balm", "balm"),
                branch_id="SG-001",
                price=12.5,
                stock=18,
                shelf_location="A-03",
            ),
        )
    )

    candidates = vitaflow.search_product_candidates("relief balm", "SG-001")

    assert [candidate.product.id for candidate in candidates[:2]] == [
        "MOCK-RELIEF-BALM",
        "MOCK-RELIEF-CREAM",
    ]
    assert candidates[0].confidence > candidates[1].confidence


def test_promotion_match_is_active_current_and_branch_aware() -> None:
    engine = PromotionEngine()

    matches = engine.match("MOCK-P001", "SG-001", now=NOW)

    assert [promotion.id for promotion in matches] == ["MOCK-PR001"]
    assert all(promotion.active for promotion in matches)
    assert all(promotion.branch_id == "SG-001" for promotion in matches)


def test_promotion_match_rejects_wrong_branch() -> None:
    engine = PromotionEngine()

    assert engine.match("MOCK-P001", "SG-002", now=NOW) == []


def test_idle_posters_use_only_eligible_promotions() -> None:
    engine = PosterEngine(PromotionEngine())

    posters = engine.idle("SG-001", now=NOW)

    assert [poster.id for poster in posters] == ["MOCK-POSTER001"]
    assert posters[0].promotion_id == "MOCK-PR001"
    assert posters[0].source == "mock_vitaflow"


def test_leaflets_are_active_current_and_branch_aware() -> None:
    engine = LeafletEngine()

    leaflets = engine.eligible_for_branch("SG-001", now=NOW)

    assert [leaflet.id for leaflet in leaflets] == [
        "MOCK-LF-PROMO-001",
        "MOCK-LF-PROMO-002",
        "MOCK-LF-CAMP-001",
    ]
    assert all(leaflet.active for leaflet in leaflets)
    assert all(leaflet.branch_id == "SG-001" for leaflet in leaflets)


def test_product_leaflets_are_product_and_kind_scoped() -> None:
    engine = LeafletEngine()

    relief_promotions = engine.for_product(
        "MOCK-P001",
        "SG-001",
        kind=LeafletKind.PROMOTION,
        now=NOW,
    )
    hydration_campaigns = engine.for_product(
        "MOCK-P002",
        "SG-001",
        kind=LeafletKind.CAMPAIGN,
        now=NOW,
    )

    assert [leaflet.id for leaflet in relief_promotions] == ["MOCK-LF-PROMO-001"]
    assert [leaflet.id for leaflet in hydration_campaigns] == ["MOCK-LF-CAMP-001"]


def test_mock_stt_returns_deterministic_transcript() -> None:
    transcript = MockSTT().transcribe(b"mock audio", "audio/webm")

    assert transcript.transcript == "show me pain relief products"
    assert transcript.provider == "mock_stt"
    assert transcript.language == "english"
    assert transcript.clarification_needed is False


def test_mock_stt_rejects_empty_audio() -> None:
    with pytest.raises(ValueError, match="Audio payload is empty"):
        MockSTT().transcribe(b"", "audio/webm")


def test_mock_tts_returns_playable_wav_header() -> None:
    audio = MockTTS().synthesize("Please speak with our pharmacist.")

    assert audio[:4] == b"RIFF"
    assert audio[8:12] == b"WAVE"
    assert len(audio) > 44


@pytest.mark.parametrize(
    ("text", "spoken"),
    [
        ("Offer RM 8 today.", "Offer eight ringgit today."),
        ("It costs RM5.30.", "It costs five ringgit thirty sen."),
        (
            "Deposit RM0.50 and balance RM12.05.",
            "Deposit fifty sen and balance twelve ringgit five sen.",
        ),
        (
            "Retail RM1,234.00.",
            "Retail one thousand two hundred thirty four ringgit.",
        ),
        ("Reference RMX5 is not a price.", "Reference RMX5 is not a price."),
    ],
)
def test_malaysian_currency_is_normalized_for_natural_speech(
    text: str,
    spoken: str,
) -> None:
    assert normalize_malaysian_currency_for_speech(text) == spoken


def test_elevenlabs_tts_posts_audio_request_without_real_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    class FakeResponse:
        status_code = 200
        content = b"\xff\xfbmock-mp3"

        def raise_for_status(self) -> None:
            return None

    class FakeClient:
        def __init__(self, *, timeout: float) -> None:
            captured["timeout"] = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(
            self,
            url: str,
            *,
            params: dict[str, str],
            headers: dict[str, str],
            json: dict[str, str],
        ) -> FakeResponse:
            captured["url"] = url
            captured["params"] = params
            captured["headers"] = headers
            captured["json"] = json
            return FakeResponse()

    monkeypatch.setattr("services.voice_ai.httpx.Client", FakeClient)

    audio = ElevenLabsTTS(
        api_key="test-api-key",
        voice_id="test-voice-id",
    ).synthesize("Promotion price is RM8.00; retail is RM5.30.")

    assert audio == b"\xff\xfbmock-mp3"
    assert captured["url"] == (
        "https://api.elevenlabs.io/v1/text-to-speech/test-voice-id"
    )
    assert captured["params"] == {"output_format": "mp3_44100_128"}
    assert captured["headers"] == {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": "test-api-key",
    }
    assert captured["json"] == {
        "text": "Promotion price is eight ringgit; retail is five ringgit thirty sen.",
        "model_id": "eleven_multilingual_v2",
    }


def test_red_flag_is_escalated() -> None:
    decision = SafetyGuardrails().evaluate("I cannot breathe")

    assert decision.allowed is False
    assert decision.requires_pharmacist is True
    assert decision.reason_code == "red_flag"


def test_diagnosis_request_is_blocked_and_handed_off() -> None:
    decision = SafetyGuardrails().evaluate("Can you diagnose this rash?")

    assert decision.allowed is False
    assert decision.requires_pharmacist is True
    assert decision.reason_code == "diagnosis_request"


@pytest.mark.parametrize(
    "text",
    [
        "I am pregnant, can I take this supplement?",
        "pregnancy supplement question",
        "expecting mother asking about vitamins",
        "breast feeding and cough medicine",
        "ibu mengandung boleh makan supplement?",
        "Saya hamil boleh makan supplement ini?",
        "怀孕可以吃这个吗?",
        "孕妇可以吃这个吗?",
        "哺乳可以吃这个吗?",
    ],
)
def test_pregnancy_and_breastfeeding_terms_require_pharmacist_review(text: str) -> None:
    decision = SafetyGuardrails().evaluate(text)

    assert decision.allowed is False
    assert decision.requires_pharmacist is True
    assert decision.reason_code == "pregnancy_safety"


@pytest.mark.parametrize(
    "text",
    [
        "Can a child take this medicine?",
        "I have kidney disease, can I use this?",
        "liver disease and supplement question",
        "I take blood thinner medicine",
        "severe allergy after taking this",
        "chest pain now",
        "breathing difficulty",
        "I feel fainting",
        "high fever for three days",
        "severe symptoms after medicine",
    ],
)
def test_high_risk_condition_terms_escalate_to_pharmacist(text: str) -> None:
    decision = SafetyGuardrails().evaluate(text)

    assert decision.allowed is False
    assert decision.requires_pharmacist is True
    assert decision.reason_code == "red_flag"


def test_safe_product_request_is_allowed() -> None:
    decision = SafetyGuardrails().evaluate("Where is the relief balm?")

    assert decision.allowed is True
    assert decision.requires_pharmacist is False
    assert decision.reason_code is None


def test_product_vision_never_guesses() -> None:
    assert MockProductVision().identify(b"unrecognized image") is None


def test_product_scan_barcode_uses_mock_vitaflow_authoritative_facts(
    vitaflow: MockVitaFlowAPI,
) -> None:
    result = MockProductVision().scan_product(
        b"BARCODE:9550000000019",
        "application/octet-stream",
        "SG-001",
        "auto",
        vitaflow,
    )

    assert result.ok is True
    assert result.requiresConfirmation is False
    assert result.scanSignals.barcode == "9550000000019"
    assert result.candidates[0].matchReason == "barcode_match"
    assert result.candidates[0].product.id == "MOCK-P001"
    assert result.candidates[0].product.price == 12.50
    assert result.candidates[0].product.stock == 18
    assert result.candidates[0].product.shelf_location == "A-03"
    assert result.candidates[0].product.source == "mock_vitaflow"


def test_product_scan_sorts_visual_candidates_by_confidence(
    vitaflow: MockVitaFlowAPI,
) -> None:
    result = MockProductVision().scan_product(
        b"IMAGE:MOCK-P002 IMAGE:MOCK-P001",
        "application/octet-stream",
        "SG-001",
        "image_first",
        vitaflow,
    )

    assert result.requiresConfirmation is True
    assert [candidate.product.id for candidate in result.candidates[:2]] == [
        "MOCK-P002",
        "MOCK-P001",
    ]
    assert result.candidates[0].confidence >= result.candidates[1].confidence


def test_product_scan_ocr_correction_keeps_confirmation_flow(
    vitaflow: MockVitaFlowAPI,
) -> None:
    result = MockProductVision().scan_product(
        b"OCR:Relief Bomb",
        "application/octet-stream",
        "SG-001",
        "ocr_first",
        vitaflow,
    )

    assert result.requiresConfirmation is True
    assert result.ocrText == "Relief Bomb"
    assert result.correctedText == "Relief Balm"
    assert result.candidates[0].product.name == "Relief Balm"
    assert result.candidates[0].matchReason == "ocr_text_match"


def test_product_scan_does_not_persist_raw_camera_frames(
    tmp_path,
    vitaflow: MockVitaFlowAPI,
) -> None:
    before = set(tmp_path.iterdir())

    result = MockProductVision().scan_product(
        b"IMAGE:MOCK-P001",
        "application/octet-stream",
        "SG-001",
        "auto",
        vitaflow,
    )

    assert result.candidates[0].product.id == "MOCK-P001"
    assert set(tmp_path.iterdir()) == before


def test_local_product_scan_reads_real_ocr_text_and_uses_vitaflow_facts() -> None:
    buffered_c = Product(
        id="5042",
        name="BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
        aliases=("Buffered C", "Blackmores Buffered C"),
        branch_id="JK",
        price=31.85,
        stock=1,
        shelf_location="Shelf Island C R3 B1",
        source="vitaflow_erp",
    )
    vitaflow = MockVitaFlowAPI((buffered_c,))
    scanner = LocalProductScanVision(
        ocr_reader=lambda image: (
            ("BLACKMORES", 0.99),
            ("BUFFEREDC", 0.98),
            ("SUSTAINED RELEASE", 0.94),
        )
    )

    result = scanner.scan_product(
        b"real-jpeg-bytes-are-handled-by-the-injected-reader",
        "image/jpeg",
        "JK",
        "auto",
        vitaflow,
    )

    assert result.provider == "local_product_scan"
    assert result.scanSignals.ocr is True
    assert result.ocrText == "BLACKMORES BUFFERED C SUSTAINED RELEASE"
    assert result.candidates[0].product.id == "5042"
    assert result.candidates[0].product.price == 31.85
    assert result.candidates[0].matchReason == "ocr_text_match"


def test_local_product_scan_prioritizes_high_confidence_label_over_compact_kiosk_copy() -> None:
    class ExactLabelVitaFlow(MockVitaFlowAPI):
        def search_products(self, query: str, branch_id: str):
            if " ".join(query.casefold().split()) == "blackmores buffered c":
                return super().search_products(query, branch_id)
            return []

        def search_product_candidates(self, query, branch_id, *, limit=5):
            del query, branch_id, limit
            return []

    buffered_c = Product(
        id="5042",
        name="BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
        aliases=("Buffered C", "Blackmores Buffered C"),
        branch_id="JK",
        price=31.85,
        stock=1,
        shelf_location="Shelf Island C R3 B1",
        source="vitaflow_erp",
    )
    vitaflow = ExactLabelVitaFlow((buffered_c,))
    scanner = LocalProductScanVision(
        ocr_reader=lambda image: (
            ("VITAFLOWPRODUCTSCAN", 0.986),
            ("Scan Product", 0.965),
            ("Placeproduct inside theframe.", 0.976),
            ("BLACKMORES", 0.982),
            ("BUFFEREDC", 0.994),
            ("Her5Nou", 0.633),
            ("THANYO", 0.722),
            ("149.00", 0.924),
            ("Scan again", 0.988),
        ),
        barcode_reader=lambda image: (),
    )

    result = scanner.scan_product(
        b"camera-frame-with-small-product-label-and-kiosk-copy",
        "image/jpeg",
        "JK",
        "auto",
        vitaflow,
    )

    assert result.candidates
    assert result.candidates[0].product.id == "5042"
    assert "BLACKMORES" in (result.candidates[0].matchedText or "")
    assert "BUFFERED C" in (result.candidates[0].matchedText or "")


def test_local_product_scan_does_not_treat_mock_markers_as_live_camera_ocr(
    vitaflow: MockVitaFlowAPI,
) -> None:
    scanner = LocalProductScanVision(
        ocr_reader=lambda image: (),
        barcode_reader=lambda image: (),
    )

    result = scanner.scan_product(
        b"OCR:Relief Balm IMAGE:MOCK-P001 BARCODE:9550000000019",
        "image/jpeg",
        "SG-001",
        "auto",
        vitaflow,
    )

    assert result.provider == "local_product_scan"
    assert result.scanSignals.ocr is False
    assert result.scanSignals.barcode is None
    assert result.candidates == ()


def test_local_product_scan_ignores_kiosk_copy_and_matches_other_erp_brands() -> None:
    class ExactOnlyVitaFlow(MockVitaFlowAPI):
        def search_product_candidates(self, query, branch_id, *, limit=5):
            del query, branch_id, limit
            return []

    fishermans_friend = Product(
        id="ERP-FISHERMAN-LEMON",
        name="FISHERMAN S FRIEND (SF) LEMON 25GM",
        aliases=("Fisherman's Friend", "Fisherman Friend", "Fisherman Lemon"),
        branch_id="JK",
        price=4.90,
        stock=8,
        shelf_location="Shelf Island B R2",
        source="vitaflow_erp",
    )
    vitaflow = ExactOnlyVitaFlow((fishermans_friend,))
    scanner = LocalProductScanVision(
        ocr_reader=lambda image: (
            ("MOCK VITAFLOW", 0.99),
            ("SCAN PRODUCT", 0.99),
            ("PLACE PRODUCT INSIDE THE FRAME", 0.98),
            ("LOOKING FOR PRODUCT", 0.97),
            ("HOLD STEADY", 0.97),
            ("CAPTURING", 0.96),
            ("SEARCHING PRODUCT", 0.95),
            ("FISHERMANS", 0.99),
            ("FRIEND", 0.99),
            ("LEMON", 0.96),
        )
    )

    result = scanner.scan_product(
        b"camera-frame-with-kiosk-copy-and-product-label",
        "image/jpeg",
        "JK",
        "auto",
        vitaflow,
    )

    assert result.provider == "local_product_scan"
    assert result.candidates[0].product.id == "ERP-FISHERMAN-LEMON"
    assert result.candidates[0].product.price == 4.90
    assert "FISHERMAN S FRIEND" in (result.candidates[0].matchedText or "")
