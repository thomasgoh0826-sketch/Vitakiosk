from __future__ import annotations


class MockProductVision:
    """Safe placeholder that never guesses a product from image bytes."""

    def identify(self, image: bytes) -> str | None:
        del image
        return None
