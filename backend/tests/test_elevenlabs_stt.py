from __future__ import annotations

import httpx
import pytest

from services.elevenlabs_stt import ElevenLabsSTT


class FakeResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, object]:
        return self._payload


class RecordingClient:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload
        self.request: dict[str, object] = {}

    def post(self, url: str, **kwargs: object) -> FakeResponse:
        self.request = {"url": url, **kwargs}
        return FakeResponse(self.payload)


def test_elevenlabs_stt_posts_scribe_v2_audio_without_real_network() -> None:
    client = RecordingClient(
        {
            "text": "buffered c",
            "language_code": "eng",
            "language_probability": 0.98,
            "words": [
                {"type": "word", "text": "buffered", "logprob": -0.02},
                {"type": "word", "text": "c", "logprob": -0.04},
            ],
        }
    )

    result = ElevenLabsSTT(
        api_key="test-key",
        model_id="scribe_v2",
        http_client=client,
    ).transcribe(b"\x1a\x45\xdf\xa3audio", "audio/webm")

    assert client.request["url"] == "https://api.elevenlabs.io/v1/speech-to-text"
    assert client.request["headers"] == {"xi-api-key": "test-key"}
    assert client.request["data"] == {
        "model_id": "scribe_v2",
        "tag_audio_events": "false",
    }
    assert client.request["files"] == {
        "file": ("kiosk-turn.webm", b"\x1a\x45\xdf\xa3audio", "audio/webm")
    }
    assert result.provider == "elevenlabs"
    assert result.language == "english"
    assert result.corrected_transcript == "Buffered C"
    assert result.confidence == pytest.approx(0.97045, rel=1e-3)
    assert result.clarification_needed is False


@pytest.mark.parametrize(
    ("language_code", "expected"),
    [("eng", "english"), ("zho", "chinese"), ("cmn", "chinese"), ("msa", "malay")],
)
def test_elevenlabs_stt_maps_kiosk_languages(
    language_code: str,
    expected: str,
) -> None:
    client = RecordingClient(
        {
            "text": "vitamin c",
            "language_code": language_code,
            "words": [{"type": "word", "text": "vitamin", "logprob": -0.01}],
        }
    )

    result = ElevenLabsSTT(api_key="test-key", http_client=client).transcribe(
        b"audio",
        "audio/webm",
    )

    assert result.language == expected


def test_elevenlabs_stt_requests_clarification_for_empty_transcript() -> None:
    client = RecordingClient({"text": "", "language_code": "eng", "words": []})

    result = ElevenLabsSTT(api_key="test-key", http_client=client).transcribe(
        b"audio",
        "audio/webm",
    )

    assert result.transcript == ""
    assert result.confidence is None
    assert result.clarification_needed is True


def test_elevenlabs_stt_requests_clarification_for_low_word_confidence() -> None:
    client = RecordingClient(
        {
            "text": "fisherman",
            "language_code": "eng",
            "words": [{"type": "word", "text": "fisherman", "logprob": -1.2}],
        }
    )

    result = ElevenLabsSTT(
        api_key="test-key",
        low_confidence_threshold=0.55,
        http_client=client,
    ).transcribe(b"audio", "audio/webm")

    assert result.confidence == pytest.approx(0.301, rel=1e-2)
    assert result.clarification_needed is True


@pytest.mark.parametrize("failure", ["status", "timeout"])
def test_elevenlabs_stt_fails_closed_without_leaking_provider_details(failure: str) -> None:
    secret = "super-secret-test-key"

    class FailingClient:
        def post(self, url: str, **kwargs: object) -> FakeResponse:
            del kwargs
            request = httpx.Request("POST", url)
            if failure == "timeout":
                raise httpx.TimeoutException("upstream timeout body", request=request)
            response = httpx.Response(401, request=request, text="sensitive provider body")
            raise httpx.HTTPStatusError("unauthorized", request=request, response=response)

    with pytest.raises(RuntimeError, match="ElevenLabs STT request failed") as caught:
        ElevenLabsSTT(api_key=secret, http_client=FailingClient()).transcribe(
            b"audio",
            "audio/webm",
        )

    error_text = str(caught.value)
    assert secret not in error_text
    assert "sensitive provider body" not in error_text


def test_elevenlabs_stt_rejects_empty_audio_before_network() -> None:
    client = RecordingClient({})

    with pytest.raises(ValueError, match="Audio payload is empty"):
        ElevenLabsSTT(api_key="test-key", http_client=client).transcribe(b"", "audio/webm")

    assert client.request == {}
