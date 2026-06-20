from __future__ import annotations

from services.models import SafetyDecision


class SafetyGuardrails:
    RED_FLAG_PHRASES = (
        "cannot breathe",
        "can't breathe",
        "chest pain",
        "severe bleeding",
        "unconscious",
        "overdose",
        "suicidal",
        "severe allergic reaction",
    )
    DIAGNOSIS_PHRASES = (
        "diagnose",
        "what disease",
        "do i have",
        "what condition",
    )

    def evaluate(self, text: str) -> SafetyDecision:
        normalized = " ".join(text.casefold().split())
        if any(phrase in normalized for phrase in self.RED_FLAG_PHRASES):
            return SafetyDecision(
                allowed=False,
                requires_pharmacist=True,
                reason_code="red_flag",
            )
        if any(phrase in normalized for phrase in self.DIAGNOSIS_PHRASES):
            return SafetyDecision(
                allowed=False,
                requires_pharmacist=True,
                reason_code="diagnosis_request",
            )
        return SafetyDecision(allowed=True, requires_pharmacist=False)
