from __future__ import annotations

from dataclasses import replace
import json

import httpx
import pytest

from services.agnes_vision import AgnesProductVision
from services.mock_data import MOCK_PRODUCTS
from services.models import ProductSearchResult
from services.product_vision import LocalProductScanVision
from services.vitaflow_api import MockVitaFlowAPI


JPEG_ONE = b"\xff\xd8\xff\xe0first-label\xff\xd9"
JPEG_TWO = b"\xff\xd8\xff\xe0second-label\xff\xd9"


class FakeResponse:
    def __init__(
        self,
        payload: dict[str, object],
        *,
        status_code: int = 200,
    ) -> None:
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code < 400:
            return
        request = httpx.Request("POST", "https://apihub.agnes-ai.com/v1/chat/completions")
        response = httpx.Response(self.status_code, request=request)
        raise httpx.HTTPStatusError("provider error", request=request, response=response)

    def json(self) -> dict[str, object]:
        return self._payload


class SequenceAgnesClient:
    def __init__(self, signals: list[dict[str, object]]) -> None:
        self._signals = list(signals)
        self.requests: list[dict[str, object]] = []

    def post(self, url: str, **kwargs: object) -> FakeResponse:
        self.requests.append({"url": url, **kwargs})
        signal = self._signals.pop(0)
        return FakeResponse(
            {
                "choices": [
                    {"message": {"content": json.dumps(signal)}}
                ]
            }
        )


def make_products():
    buffered = replace(
        MOCK_PRODUCTS[0],
        id="5042",
        name="BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
        aliases=("Blackmores Buffered C", "Buffered C 30S"),
        branch_id="JK",
        barcode="93299343",
        source="vitaflow_erp",
    )
    fisherman = replace(
        MOCK_PRODUCTS[1],
        id="314",
        name="FISHERMAN S FRIEND (SF) LEMON 25GM",
        aliases=("Fisherman's Friend Lemon", "Fisherman Lemon 25GM"),
        branch_id="JK",
        barcode="9556111625011",
        source="vitaflow_erp",
    )
    return buffered, fisherman


def make_vision(
    client: object,
    *,
    fallback: LocalProductScanVision | None = None,
    retry_delays: list[float] | None = None,
) -> AgnesProductVision:
    return AgnesProductVision(
        api_key="test-key",
        base_url="https://apihub.agnes-ai.com",
        model="agnes-2.0-flash",
        timeout_seconds=20,
        http_client=client,
        fallback=fallback,
        retry_sleeper=(
            retry_delays.append if retry_delays is not None else (lambda _delay: None)
        ),
    )


class StrictVisionVitaFlow(MockVitaFlowAPI):
    def __init__(self, product) -> None:  # type: ignore[no-untyped-def]
        super().__init__((product,))
        self.queries: list[str] = []

    def search_products(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        self.queries.append(query)
        if branch_id == "JK" and query.casefold() == "buffered c":
            return list(self._products)
        return []


class ExactIdentityVitaFlow(MockVitaFlowAPI):
    def __init__(self, product, expected_query: str) -> None:  # type: ignore[no-untyped-def]
        super().__init__((product,))
        self.expected_query = expected_query.casefold()

    def search_products(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        if branch_id == "JK" and query.casefold() == self.expected_query:
            return list(self._products)
        return []

    def search_product_candidates(self, query: str, branch_id: str, *, limit: int = 5):  # type: ignore[no-untyped-def]
        del query, branch_id, limit
        return []


class ScoredCandidateVitaFlow(MockVitaFlowAPI):
    def __init__(self, products, scores: tuple[float, ...]) -> None:  # type: ignore[no-untyped-def]
        super().__init__(products)
        self._scores = scores

    def search_products(self, query: str, branch_id: str):  # type: ignore[no-untyped-def]
        del query
        return [product for product in self._products if product.branch_id == branch_id]

    def search_product_candidates(self, query: str, branch_id: str, *, limit: int = 5):  # type: ignore[no-untyped-def]
        del limit
        return [
            ProductSearchResult(
                product=product,
                confidence=score,
                match_reason="erp_identity_score",
                matched_text=query,
            )
            for product, score in zip(self.search_products(query, branch_id), self._scores)
        ]

def test_agnes_vision_resolves_each_label_against_vitaflow() -> None:
    buffered, fisherman = make_products()
    vitaflow = MockVitaFlowAPI(products=(buffered, fisherman))
    client = SequenceAgnesClient(
        [
            {
                "brand": "Blackmores",
                "product_name": "Buffered C",
                "pack_size": "30S",
                "barcode": None,
                "label_text": "Blackmores Buffered C 30S",
            },
            {
                "brand": "Fisherman's Friend",
                "product_name": "Lemon",
                "pack_size": "25GM",
                "barcode": None,
                "label_text": "Fisherman's Friend Lemon 25GM",
            },
        ]
    )
    vision = make_vision(client)

    first = vision.scan_product(JPEG_ONE, "image/jpeg", "JK", "auto", vitaflow)
    second = vision.scan_product(JPEG_TWO, "image/jpeg", "JK", "auto", vitaflow)

    assert first.candidates[0].product.name.startswith("BLACKMORES BUFFERED C")
    assert second.candidates[0].product.name.startswith("FISHERMAN S FRIEND")
    assert first.candidates[0].product.id != second.candidates[0].product.id
    first_image_url = client.requests[0]["json"]["messages"][1]["content"][1]["image_url"]["url"]
    second_image_url = client.requests[1]["json"]["messages"][1]["content"][1]["image_url"]["url"]
    assert first_image_url.startswith("data:image/jpeg;base64,")
    assert first_image_url != second_image_url
    assert client.requests[0]["json"]["max_tokens"] == 2000
    system_prompt = client.requests[0]["json"]["messages"][0]["content"]
    user_prompt = client.requests[0]["json"]["messages"][1]["content"][0]["text"]
    assert "physical product package" in system_prompt
    assert "price stickers" in system_prompt
    assert "Chinese" in system_prompt
    assert "Malay" in system_prompt
    assert "manufacturer branding" in user_prompt
    assert "retailer sticker" in user_prompt
    assert "bottle shape" in user_prompt
    assert "standard retail product name" in user_prompt


def test_agnes_vision_recovers_multilingual_small_bottle_identity_through_generic_windows() -> None:
    buffered, _ = make_products()
    axe = replace(
        buffered,
        id="17097",
        name="AXE BRAND MEDICATED OIL 10ML",
        aliases=("AXE BRAND", "MEDICATED OIL"),
        barcode=None,
    )
    result = make_vision(
        SequenceAgnesClient(
            [
                {
                    "brand": "Long Biao / Dragon Brand",
                    "product_name": "Cap Kapak Medicated Oil",
                    "pack_size": "10ml",
                    "barcode": None,
                    "label_text": "CAP KAPAK MEDICATED OIL",
                }
            ]
        )
    ).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        ExactIdentityVitaFlow(axe, "Medicated Oil"),
    )

    assert result.candidates[0].product.id == "17097"
    assert result.candidates[0].matchedText == "Medicated Oil"
    assert result.requiresConfirmation is True


def test_agnes_vision_retries_short_distinctive_package_tokens_against_vitaflow() -> None:
    buffered, _ = make_products()
    axe = replace(
        buffered,
        id="17097",
        name="AXE BRAND MEDICATED OIL 10ML (CAP KAPAK)",
        aliases=("AXE BRAND", "MEDICATED OIL", "CAP KAPAK"),
        barcode=None,
    )
    result = make_vision(
        SequenceAgnesClient(
            [
                {
                    "brand": "Tan Kun",
                    "product_name": "Tan Kun Cap Kai",
                    "pack_size": None,
                    "barcode": None,
                    "label_text": "Tan Kun Cap Kai",
                }
            ]
        )
    ).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        ExactIdentityVitaFlow(axe, "Cap"),
    )

    assert result.candidates[0].product.id == "17097"
    assert result.candidates[0].matchedText == "Cap"
    assert result.requiresConfirmation is True


def test_agnes_vision_retries_distinctive_tokens_when_only_label_text_is_read() -> None:
    buffered, _ = make_products()
    axe = replace(
        buffered,
        id="17097",
        name="AXE BRAND MEDICATED OIL 10ML (CAP KAPAK)",
        aliases=("AXE BRAND", "MEDICATED OIL", "CAP KAPAK"),
        barcode=None,
    )
    result = make_vision(
        SequenceAgnesClient(
            [
                {
                    "brand": None,
                    "product_name": None,
                    "pack_size": None,
                    "barcode": None,
                    "label_text": "TAMUAN CAP KAKI",
                }
            ]
        )
    ).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        ExactIdentityVitaFlow(axe, "Cap"),
    )

    assert result.candidates[0].product.id == "17097"
    assert result.candidates[0].matchedText == "CAP"
    assert result.requiresConfirmation is True


@pytest.mark.parametrize(
    ("signals", "expected_query", "expected_product_id"),
    [
        (
            {
                "brand": "Blackmores",
                "product_name": "Sustained C Chewable Melts",
                "pack_size": None,
                "barcode": None,
                "label_text": "BLACKMORES SUSTAINED C CHEWABLE MELTS THANK YOU",
            },
            "Blackmores",
            "5042",
        ),
        (
            {
                "brand": None,
                "product_name": "MAN'S FRIEND LEMON",
                "pack_size": None,
                "barcode": None,
                "label_text": "THANK YOU MAN'S FRIEND LEMON",
            },
            "Lemon",
            "314",
        ),
    ],
)
def test_agnes_vision_recovers_from_partial_package_identity(
    signals: dict[str, object],
    expected_query: str,
    expected_product_id: str,
) -> None:
    buffered, fisherman = make_products()
    expected_product = buffered if expected_product_id == "5042" else fisherman
    result = make_vision(SequenceAgnesClient([signals])).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        ExactIdentityVitaFlow(expected_product, expected_query),
    )

    assert result.candidates[0].product.id == expected_product_id
    assert result.requiresConfirmation is True


def test_agnes_vision_retries_erp_with_core_product_name_windows() -> None:
    buffered, _ = make_products()
    vitaflow = StrictVisionVitaFlow(buffered)
    client = SequenceAgnesClient(
        [
            {
                "brand": "Blackmores",
                "product_name": "Buffered C Sustained Release",
                "pack_size": "30 Tablets",
                "barcode": None,
                "label_text": "Blackmores Buffered C Sustained Release 30 Tablets",
            }
        ]
    )

    result = make_vision(client).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        vitaflow,
    )

    assert "Buffered C" in vitaflow.queries
    assert result.candidates[0].product.id == "5042"


def test_agnes_vision_exact_barcode_auto_matches_authoritative_product() -> None:
    buffered, fisherman = make_products()
    client = SequenceAgnesClient(
        [
            {
                "brand": "",
                "product_name": "",
                "pack_size": "",
                "barcode": buffered.barcode,
                "label_text": "",
            }
        ]
    )

    result = make_vision(client).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, fisherman)),
    )

    assert result.candidates[0].product == buffered
    assert result.candidates[0].matchReason == "barcode_match"
    assert result.requiresConfirmation is False


def test_agnes_vision_ambiguous_label_requires_retry_instead_of_unrelated_choices() -> None:
    buffered, fisherman = make_products()
    buffered = replace(buffered, aliases=(*buffered.aliases, "Vitamin C"))
    fisherman = replace(fisherman, aliases=(*fisherman.aliases, "Vitamin C"))
    client = SequenceAgnesClient(
        [
            {
                "brand": "",
                "product_name": "Vitamin C",
                "pack_size": "",
                "barcode": None,
                "label_text": "Vitamin C",
            }
        ]
    )

    result = make_vision(client).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, fisherman)),
    )

    assert result.candidates == ()
    assert result.requiresConfirmation is False
    assert "scan again" in result.message.casefold()


def test_agnes_vision_preserves_vitaflow_scores_and_drops_distant_unrelated_hits() -> None:
    buffered, fisherman = make_products()
    buffered = replace(buffered, aliases=(*buffered.aliases, "Visible label"))
    fisherman = replace(fisherman, aliases=(*fisherman.aliases, "Visible label"))
    client = SequenceAgnesClient(
        [
            {
                "brand": "",
                "product_name": "Visible label",
                "pack_size": "",
                "barcode": None,
                "label_text": "Visible label",
            }
        ]
    )

    result = make_vision(client).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        ScoredCandidateVitaFlow((buffered, fisherman), (0.97, 0.74)),
    )

    assert len(result.candidates) == 1
    assert result.candidates[0].product.id == "5042"
    assert result.candidates[0].confidence == 0.97
    assert result.candidates[0].matchReason == "erp_identity_score"


def test_agnes_vision_keeps_close_variants_from_the_same_product_family() -> None:
    buffered, _ = make_products()
    buffered_120 = replace(
        buffered,
        id="5042-120",
        name="BLACKMORES BUFFERED C SLOW RELEASE TAB 120S",
        aliases=("Blackmores Buffered C", "Buffered C 120S"),
        barcode="9300807268438",
    )
    client = SequenceAgnesClient(
        [
            {
                "brand": "Blackmores",
                "product_name": "Buffered C",
                "pack_size": "",
                "barcode": None,
                "label_text": "Blackmores Buffered C",
            }
        ]
    )

    result = make_vision(client).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, buffered_120)),
    )

    assert [candidate.product.id for candidate in result.candidates] == [
        "5042",
        "5042-120",
    ]
    assert result.requiresConfirmation is True


def test_agnes_vision_no_vitaflow_match_returns_no_candidate() -> None:
    buffered, fisherman = make_products()
    client = SequenceAgnesClient(
        [
            {
                "brand": "Unknown",
                "product_name": "Mystery Bottle",
                "pack_size": "10S",
                "barcode": None,
                "label_text": "Unknown Mystery Bottle",
            }
        ]
    )

    result = make_vision(client).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, fisherman)),
    )

    assert result.candidates == ()
    assert result.requiresConfirmation is False
    assert "search manually" in result.message.casefold()


def test_agnes_vision_rejects_vitaflow_hits_that_match_description_not_identity() -> None:
    buffered, _ = make_products()
    client = SequenceAgnesClient(
        [
            {
                "brand": None,
                "product_name": "White",
                "pack_size": None,
                "barcode": None,
                "label_text": "yellow and white striped packaging",
            }
        ]
    )

    result = make_vision(client).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        ExactIdentityVitaFlow(buffered, "White"),
    )

    assert result.candidates == ()
    assert result.requiresConfirmation is False


@pytest.mark.parametrize(
    "content",
    [
        "```json\n{}\n```",
        json.dumps({"brand": "Blackmores", "unexpected": "field"}),
        json.dumps(
            {
                "brand": 123,
                "product_name": "Buffered C",
                "pack_size": "30S",
                "barcode": None,
                "label_text": "Buffered C",
            }
        ),
    ],
)
def test_agnes_vision_rejects_invalid_signal_json(content: str) -> None:
    class InvalidClient:
        def post(self, url: str, **kwargs: object) -> FakeResponse:
            del url, kwargs
            return FakeResponse({"choices": [{"message": {"content": content}}]})

    with pytest.raises(RuntimeError, match="agnes_product_vision_unavailable"):
        make_vision(InvalidClient()).scan_product(
            JPEG_ONE,
            "image/jpeg",
            "JK",
            "auto",
            MockVitaFlowAPI(products=make_products()),
        )


def test_agnes_vision_accepts_one_fenced_strict_signal_object() -> None:
    buffered, fisherman = make_products()
    signal = {
        "brand": "Blackmores",
        "product_name": "Buffered C",
        "pack_size": "30S",
        "barcode": None,
        "label_text": "Blackmores Buffered C 30S",
    }

    class FencedClient:
        def post(self, url: str, **kwargs: object) -> FakeResponse:
            del url, kwargs
            content = f"```json\n{json.dumps(signal)}\n```"
            return FakeResponse({"choices": [{"message": {"content": content}}]})

    result = make_vision(FencedClient()).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, fisherman)),
    )

    assert result.candidates[0].product.id == "5042"
    assert result.provider == "agnes"


def test_agnes_vision_accepts_unknown_optional_package_fields() -> None:
    buffered, fisherman = make_products()
    signal = {
        "brand": "BLACKMORES",
        "product_name": "BUFFERED C WITH ROSE HIPS",
        "pack_size": None,
        "barcode": None,
        "label_text": "BLACKMORES BUFFERED C WITH ROSE HIPS",
    }

    class NullableSignalClient:
        def post(self, url: str, **kwargs: object) -> FakeResponse:
            del url, kwargs
            return FakeResponse(
                {"choices": [{"message": {"content": json.dumps(signal)}}]}
            )

    result = make_vision(NullableSignalClient()).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, fisherman)),
    )

    assert result.candidates[0].product.id == "5042"
    assert result.ocrText == "BLACKMORES BUFFERED C WITH ROSE HIPS"


def test_agnes_vision_maps_direct_image_rejection_without_public_upload() -> None:
    class RejectingClient:
        def post(self, url: str, **kwargs: object) -> FakeResponse:
            del url, kwargs
            return FakeResponse({}, status_code=415)

    with pytest.raises(RuntimeError, match="agnes_direct_image_input_not_supported"):
        make_vision(RejectingClient()).scan_product(
            JPEG_ONE,
            "image/jpeg",
            "JK",
            "auto",
            MockVitaFlowAPI(products=make_products()),
        )


def test_agnes_vision_timeout_fails_closed() -> None:
    class TimeoutClient:
        def post(self, url: str, **kwargs: object) -> FakeResponse:
            del url, kwargs
            raise httpx.TimeoutException("timeout")

    with pytest.raises(RuntimeError, match="agnes_product_vision_unavailable"):
        make_vision(TimeoutClient()).scan_product(
            JPEG_ONE,
            "image/jpeg",
            "JK",
            "auto",
            MockVitaFlowAPI(products=make_products()),
        )


def test_agnes_vision_retries_one_transient_timeout() -> None:
    buffered, fisherman = make_products()

    class TransientTimeoutClient:
        def __init__(self) -> None:
            self.attempts = 0

        def post(self, url: str, **kwargs: object) -> FakeResponse:
            del url, kwargs
            self.attempts += 1
            if self.attempts == 1:
                raise httpx.TimeoutException("temporary timeout")
            return FakeResponse(
                {
                    "choices": [
                        {
                            "message": {
                                "content": json.dumps(
                                    {
                                        "brand": "Blackmores",
                                        "product_name": "Buffered C",
                                        "pack_size": "30S",
                                        "barcode": None,
                                        "label_text": "Blackmores Buffered C 30S",
                                    }
                                )
                            }
                        }
                    ]
                }
            )

    client = TransientTimeoutClient()
    retry_delays: list[float] = []
    result = make_vision(client, retry_delays=retry_delays).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, fisherman)),
    )

    assert client.attempts == 2
    assert retry_delays == [1.0]
    assert result.candidates[0].product.id == "5042"


def test_agnes_vision_prefers_local_vitaflow_match_without_cloud_request() -> None:
    buffered, fisherman = make_products()
    fallback = LocalProductScanVision(
        ocr_reader=lambda _image: (("BLACKMORES BUFFERED C", 0.99),),
        barcode_reader=lambda _image: (),
    )
    client = SequenceAgnesClient(
        [
            {
                "brand": "wrong cloud result",
                "product_name": "wrong cloud result",
                "pack_size": None,
                "barcode": None,
                "label_text": "wrong cloud result",
            }
        ]
    )

    result = make_vision(client, fallback=fallback).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, fisherman)),
    )

    assert result.candidates[0].product.id == "5042"
    assert result.provider == "local_product_scan"
    assert client.requests == []


def test_agnes_vision_returns_local_result_when_cloud_is_unavailable() -> None:
    buffered, fisherman = make_products()

    class TimeoutClient:
        def post(self, url: str, **kwargs: object) -> FakeResponse:
            del url, kwargs
            raise httpx.TimeoutException("timeout")

    fallback = LocalProductScanVision(
        ocr_reader=lambda _image: (),
        barcode_reader=lambda _image: (),
    )
    result = make_vision(TimeoutClient(), fallback=fallback).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, fisherman)),
    )

    assert result.ok is True
    assert result.provider == "local_product_scan"
    assert result.candidates == ()
    assert "Cloud vision is unavailable" in result.message


def test_agnes_vision_does_not_write_camera_frames(tmp_path, monkeypatch) -> None:
    buffered, fisherman = make_products()
    client = SequenceAgnesClient(
        [
            {
                "brand": "Blackmores",
                "product_name": "Buffered C",
                "pack_size": "30S",
                "barcode": None,
                "label_text": "Blackmores Buffered C 30S",
            }
        ]
    )
    monkeypatch.chdir(tmp_path)

    make_vision(client).scan_product(
        JPEG_ONE,
        "image/jpeg",
        "JK",
        "auto",
        MockVitaFlowAPI(products=(buffered, fisherman)),
    )

    assert list(tmp_path.iterdir()) == []
