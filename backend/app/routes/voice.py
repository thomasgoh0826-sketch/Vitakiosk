from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response

from backend.app.dependencies import stt, tts
from backend.app.models import TTSRequest
from backend.app.websocket_manager import manager


router = APIRouter(prefix="/api/voice", tags=["voice"])

SUPPORTED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "application/octet-stream",
}


def _base_content_type(content_type: str | None) -> str:
    return (content_type or "application/octet-stream").split(";", 1)[0].strip().casefold()


def _invalid_audio_response() -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "ok": False,
            "error": "invalid_audio",
            "message": "Audio could not be decoded. Please try again.",
        },
    )


def _looks_like_supported_audio(content: bytes, content_type: str) -> bool:
    if content_type == "application/octet-stream":
        return True
    if content_type == "audio/webm":
        return content.startswith(b"\x1a\x45\xdf\xa3")
    if content_type in {"audio/wav", "audio/x-wav"}:
        return content.startswith(b"RIFF")
    if content_type in {"audio/mpeg", "audio/mp3"}:
        return content.startswith(b"ID3") or content.startswith(b"\xff\xfb") or content.startswith(b"\xff\xf3")
    return False


def _should_prevalidate_audio() -> bool:
    return getattr(stt, "provider_name", "") != "mock_stt"


@router.post("/transcribe", response_model=None)
async def transcribe(
    session_id: str = Form(min_length=1, max_length=80),
    audio: UploadFile = File(),
) -> dict[str, object] | JSONResponse:
    content = await audio.read()
    if not content:
        return _invalid_audio_response()
    content_type = _base_content_type(audio.content_type)
    if content_type not in SUPPORTED_AUDIO_TYPES:
        return _invalid_audio_response()
    if _should_prevalidate_audio() and not _looks_like_supported_audio(content, content_type):
        return _invalid_audio_response()
    await manager.broadcast_state(session_id, "thinking", "transcribing")
    try:
        result = stt.transcribe(content, audio.content_type or "application/octet-stream")
    except ValueError:
        return _invalid_audio_response()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail="STT provider request failed",
        ) from exc
    return {
        "transcript": result.transcript,
        "provider": result.provider,
        "language": result.language,
        "confidence": result.confidence,
        "clarification_needed": result.clarification_needed,
        "corrected_transcript": result.corrected_transcript
        if result.corrected_transcript is not None
        else result.transcript,
        "detected_terms": list(result.detected_terms),
        "possible_product_matches": list(result.possible_product_matches),
    }


@router.post("/tts")
async def synthesize(request: TTSRequest) -> Response:
    try:
        audio = tts.synthesize(request.text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail="TTS provider request failed",
        ) from exc
    await manager.broadcast_state(request.session_id, "speaking", "playing response")
    provider_name = getattr(tts, "provider_name", "tts")
    media_type = getattr(tts, "media_type", "audio/wav")
    return Response(
        content=audio,
        media_type=media_type,
        headers={"X-Voice-Provider": provider_name},
    )
