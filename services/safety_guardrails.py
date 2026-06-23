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
    PREGNANCY_PHRASES = (
        "pregnant",
        "pregnancy",
        "expecting",
        "breastfeeding",
        "breast feeding",
        "ibu mengandung",
        "mengandung",
        "hamil",
        "怀孕",
        "孕妇",
        "哺乳",
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
        if any(phrase in normalized for phrase in self.PREGNANCY_PHRASES):
            return SafetyDecision(
                allowed=False,
                requires_pharmacist=True,
                reason_code="pregnancy_safety",
            )
        return SafetyDecision(allowed=True, requires_pharmacist=False)

    def evaluate_any(self, *texts: str) -> SafetyDecision:
        for text in texts:
            decision = self.evaluate(text)
            if not decision.allowed:
                return decision
        return SafetyDecision(allowed=True, requires_pharmacist=False)
