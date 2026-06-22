import json

import httpx

from services.openai_stt import OpenAIWhisperSTT, detect_transcript_language


MIXED_PHRASE = "\u8fd9\u4e2a probiotic \u6709 promotion \u5417\uff1f"


def test_detect_transcript_language_handles_english_chinese_malay_and_mixed() -> None:
    assert detect_transcript_language("Where is Panadol?") == "english"
    assert detect_transcript_language("Ada ubat batuk?") == "malay"
    assert detect_transcript_language(MIXED_PHRASE) == "mixed"
    assert detect_transcript_language("   ...   ") == "unknown"


def test_openai_whisper_stt_posts_audio_with_api_key_and_returns_metadata() -> None:
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["authorization"] = request.headers.get("authorization")
        body = request.content
        captured["body"] = body
        assert b"whisper-1" in body
        assert b"response_format" in body
        assert b"verbose_json" in body
        return httpx.Response(
            200,
            json={
                "text": MIXED_PHRASE,
                "language": "zh",
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    stt = OpenAIWhisperSTT(api_key="test-openai-key", http_client=client)

    result = stt.transcribe(b"mock audio", "audio/webm")

    assert captured["url"] == "https://api.openai.com/v1/audio/transcriptions"
    assert captured["authorization"] == "Bearer test-openai-key"
    assert result.transcript == MIXED_PHRASE
    assert result.language == "mixed"
    assert result.provider == "openai_whisper"
    assert result.clarification_needed is False


def test_openai_whisper_stt_marks_unclear_transcript_without_guessing() -> None:
    client = httpx.Client(
        transport=httpx.MockTransport(
            lambda _request: httpx.Response(200, json={"text": "..."})
        )
    )
    stt = OpenAIWhisperSTT(api_key="test-openai-key", http_client=client)

    result = stt.transcribe(b"mock audio", "audio/webm")

    assert result.transcript == ""
    assert result.language == "unknown"
    assert result.clarification_needed is True


def test_openai_whisper_stt_surfaces_safe_request_error() -> None:
    client = httpx.Client(
        transport=httpx.MockTransport(
            lambda _request: httpx.Response(
                401,
                content=json.dumps({"error": {"message": "invalid api key"}}),
            )
        )
    )
    stt = OpenAIWhisperSTT(api_key="test-openai-key", http_client=client)

    try:
        stt.transcribe(b"mock audio", "audio/webm")
    except RuntimeError as caught:
        assert "OpenAI STT request failed" in str(caught)
        assert "api key" not in str(caught).casefold()
    else:
        raise AssertionError("Expected OpenAI STT failure")
