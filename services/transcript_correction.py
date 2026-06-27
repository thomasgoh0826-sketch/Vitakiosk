from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher

from services.mock_data import MOCK_PRODUCTS


_TOKEN_PATTERN = re.compile(r"[A-Za-z0-9\u3400-\u9fff]+", re.UNICODE)


@dataclass(frozen=True)
class TranscriptCorrection:
    original_transcript: str
    corrected_transcript: str
    detected_terms: tuple[str, ...]
    possible_product_matches: tuple[dict[str, object], ...]


@dataclass(frozen=True)
class CorrectionTerm:
    canonical: str
    variants: tuple[str, ...]
    kind: str
    source: str
    product_id: str | None = None


def _normalise(value: str) -> str:
    return " ".join(_TOKEN_PATTERN.findall(value.casefold()))


COMMON_TRANSCRIPT_REWRITES = {
    "aida you bat batuck": "ada ubat batuk",
    "aida you bat batuk": "ada ubat batuk",
    "ada you bat batuck": "ada ubat batuk",
    "ada you bat batuk": "ada ubat batuk",
    "you bat batuck": "ubat batuk",
}


def _mock_product_terms() -> tuple[CorrectionTerm, ...]:
    terms: list[CorrectionTerm] = []
    for product in MOCK_PRODUCTS:
        terms.append(
            CorrectionTerm(
                canonical=product.name,
                variants=(product.name, *product.aliases),
                kind="product",
                source=product.source,
                product_id=product.id,
            )
        )
    return tuple(terms)


COMMON_PHARMACY_TERMS: tuple[CorrectionTerm, ...] = (
    CorrectionTerm(
        canonical="Relief Balm",
        variants=("relief bomb",),
        kind="product",
        source="correction_lexicon",
        product_id="MOCK-P001",
    ),
    CorrectionTerm(
        canonical="Panadol",
        variants=("panadol", "pana doll", "pan a doll", "panadol"),
        kind="product_or_brand_term",
        source="correction_lexicon",
    ),
    CorrectionTerm(
        canonical="ProbioGut",
        variants=("probiogut", "probio gut", "pro bio gut", "probiotic gut"),
        kind="product_or_brand_term",
        source="correction_lexicon",
    ),
    CorrectionTerm(
        canonical="ubat batuk",
        variants=(
            "ubat batuk",
            "ubat batok",
            "aida you bat batuck",
            "aida you bat batuk",
            "you bat batuck",
            "batuk",
        ),
        kind="category_term",
        source="correction_lexicon",
    ),
    CorrectionTerm(
        canonical="cough medicine",
        variants=("cough medicine", "cough medication", "cough syrup", "cough"),
        kind="category_term",
        source="correction_lexicon",
    ),
    CorrectionTerm(
        canonical="magnesium glycinate",
        variants=("magnesium glycinate", "magnesium glicinate"),
        kind="category_term",
        source="correction_lexicon",
    ),
    CorrectionTerm(
        canonical="vitamin C",
        variants=("vitamin c", "vitamin see", "vit c"),
        kind="category_term",
        source="correction_lexicon",
    ),
)


CORRECTION_TERMS = (*_mock_product_terms(), *COMMON_PHARMACY_TERMS)


def _match_score(transcript: str, variant: str) -> float:
    normalized_transcript = _normalise(transcript)
    normalized_variant = _normalise(variant)
    if not normalized_variant:
        return 0.0
    if normalized_variant in normalized_transcript:
        return 1.0
    return SequenceMatcher(None, normalized_variant, normalized_transcript).ratio()


def _replace_variant(text: str, variant: str, canonical: str) -> str:
    pattern = re.compile(rf"(?<!\w){re.escape(variant)}(?!\w)", re.IGNORECASE)
    return pattern.sub(canonical, text)


def correct_transcript(transcript: str) -> TranscriptCorrection:
    corrected = " ".join(transcript.split())
    rewritten = COMMON_TRANSCRIPT_REWRITES.get(_normalise(corrected))
    if rewritten:
        corrected = rewritten
    detected: list[str] = []
    matches: list[dict[str, object]] = []

    for term in CORRECTION_TERMS:
        best_variant = max(term.variants, key=lambda variant: _match_score(corrected, variant))
        score = _match_score(corrected, best_variant)
        if score < 0.74:
            continue

        normalized_variant = _normalise(best_variant)
        normalized_corrected = _normalise(corrected)
        if normalized_variant not in normalized_corrected and score < 0.9:
            continue

        for variant in sorted(term.variants, key=len, reverse=True):
            normalized_variant = _normalise(variant)
            normalized_canonical = _normalise(term.canonical)
            normalized_corrected = _normalise(corrected)
            if (
                normalized_variant in normalized_canonical
                and normalized_canonical in normalized_corrected
            ):
                continue
            corrected = _replace_variant(corrected, variant, term.canonical)

        if term.canonical not in detected:
            detected.append(term.canonical)
            matches.append(
                {
                    "id": term.product_id,
                    "name": term.canonical,
                    "kind": term.kind,
                    "confidence": round(score, 2),
                    "source": term.source,
                }
            )

    return TranscriptCorrection(
        original_transcript=transcript,
        corrected_transcript=corrected,
        detected_terms=tuple(detected),
        possible_product_matches=tuple(matches),
    )
