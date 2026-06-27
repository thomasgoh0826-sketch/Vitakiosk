from __future__ import annotations

from dataclasses import asdict
from typing import Annotated, Any

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import JSONResponse

from backend.app.dependencies import vision as vision_adapter
from backend.app.dependencies import vitaflow


router = APIRouter(prefix="/api/vision", tags=["vision"])

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def invalid_image_error() -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "ok": False,
            "error": "invalid_image",
            "message": "Image could not be decoded. Please try again.",
        },
    )


@router.post("/scan-product")
async def scan_product(
    branch_id: Annotated[str, Form(min_length=1, max_length=40)],
    mode: Annotated[str, Form(min_length=1, max_length=40)] = "auto",
    image: UploadFile = File(...),
) -> dict[str, Any]:
    if image.content_type not in SUPPORTED_IMAGE_TYPES:
        return invalid_image_error()

    frame = await image.read()
    if not frame:
        return invalid_image_error()

    try:
        result = vision_adapter.scan_product(
            frame,
            image.content_type or "",
            branch_id,
            mode,
            vitaflow,
        )
    except RuntimeError as exc:
        if str(exc) == "local_product_image_scan_not_configured":
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "ok": False,
                    "error": "local_product_image_scan_not_configured",
                    "message": "Local product image scan is not configured.",
                },
            )
        raise

    return asdict(result)
