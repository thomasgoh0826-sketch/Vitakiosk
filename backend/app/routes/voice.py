from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from backend.app.dependencies import stt, tts
from backend.app.models import TTSRequest
from backend.app.websocket_manager import manager


router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/transcribe")
async def transcribe(
    session_id: str = Form(min_length=1, max_length=80),
    audio: UploadFile = File(),
) -> dict[str, object]:
    content = await audio.read()
    if not content:
        raise HTTPException(status_code=422, detail="Audio payload is empty")
    await manager.broadcast_state(session_id, "thinking", "transcribing")
    result = stt.transcribe(content, audio.content_type or "application/octet-stream")
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
