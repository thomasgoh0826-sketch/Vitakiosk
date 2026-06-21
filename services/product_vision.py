from __future__ import annotations


class MockProductVision:
    """Safe placeholder that never guesses a product from image bytes."""

    def identify(self, image: bytes) -> str | None:
        del image
        return None


class BarcodeOCRVision:
    """Placeholder for a future barcode/OCR adapter.

    It never guesses product identity and makes no external OCR calls in this
    mock-first demo.
    """

    provider_name = "barcode_ocr"

    def identify(self, image: bytes) -> str | None:
        del image
        raise RuntimeError(
            "Barcode/OCR vision is a live-provider placeholder and is not "
            "implemented in the mock-first demo."
        )
