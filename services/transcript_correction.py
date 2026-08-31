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
    fuzzy_threshold: float = 0.9


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
        canonical="Blackmores",
        variants=(
            "blackmores",
            "black mores",
            "black moss",
            "blackmoor's",
            "black moors",
            "black morse",
            "black mars",
        ),
        kind="brand_term",
        source="correction_lexicon",
        fuzzy_threshold=0.82,
    ),
    CorrectionTerm(
        canonical="Buffered C",
        variants=(
            "buffered c",
            "buffer c",
            "bufford c",
            "buford c",
            "buffer the c",
            "buffered sea",
            "buffered see",
            "bufford sea",
            "buford sea",
            "buffer the sea",
            "buffer seed",
            "buffered seed",
        ),
        kind="product_or_brand_term",
        source="correction_lexicon",
        fuzzy_threshold=0.82,
    ),
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
        canonical="Fisherman's Friend",
        variants=(
            "fisherman's friend",
            "fisherman friend",
            "fisherman",
            "fisher man",
            "fishermen",
            "fish man",
        ),
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
        variants=(
            "vitamin c",
            "vitamin see",
            "vit c",
            "维他命c",
            "维他命 c",
            "维生素c",
            "维生素 c",
        ),
        kind="category_term",
        source="correction_lexicon",
    ),
)


CORRECTION_TERMS = (*_mock_product_terms(), *COMMON_PHARMACY_TERMS)


def _best_token_window(
    transcript: str,
    variant: str,
) -> tuple[float, tuple[int, int] | None]:
    transcript_matches = tuple(_TOKEN_PATTERN.finditer(transcript))
    variant_tokens = _TOKEN_PATTERN.findall(variant)
    if not transcript_matches or not variant_tokens:
        return 0.0, None

    best_score = 0.0
    best_span: tuple[int, int] | None = None
    target_size = len(variant_tokens)
    for window_size in range(max(1, target_size - 1), target_size + 2):
        if window_size > len(transcript_matches):
            continue
        for index in range(len(transcript_matches) - window_size + 1):
            window = transcript_matches[index : index + window_size]
            window_text = " ".join(match.group(0).casefold() for match in window)
            score = SequenceMatcher(None, _normalise(variant), window_text).ratio()
            if score > best_score:
                best_score = score
                best_span = (window[0].start(), window[-1].end())
    return best_score, best_span


def _match_score(
    transcript: str,
    variant: str,
    *,
    allow_window_fuzzy: bool = False,
) -> float:
    normalized_transcript = _normalise(transcript)
    normalized_variant = _normalise(variant)
    if not normalized_variant:
        return 0.0
    if normalized_variant in normalized_transcript:
        return 1.0
    whole_score = SequenceMatcher(None, normalized_variant, normalized_transcript).ratio()
    if not allow_window_fuzzy:
        return whole_score
    window_score, _span = _best_token_window(transcript, variant)
    return max(whole_score, window_score)


def _replace_variant(text: str, variant: str, canonical: str) -> str:
    tokens = _TOKEN_PATTERN.findall(variant)
    if not tokens:
        return text
    tolerant_variant = r"(?:[\W_]+)".join(re.escape(token) for token in tokens)
    if re.search(r"[\u3400-\u9fff]", variant):
        # Chinese product/category terms are normally spoken without spaces,
        # so they can sit directly beside other CJK characters in a sentence.
        pattern = re.compile(tolerant_variant, re.IGNORECASE)
    else:
        pattern = re.compile(rf"(?<!\w){tolerant_variant}(?!\w)", re.IGNORECASE)
    return pattern.sub(canonical, text)


def correct_transcript(transcript: str) -> TranscriptCorrection:
    corrected = " ".join(transcript.split())
    rewritten = COMMON_TRANSCRIPT_REWRITES.get(_normalise(corrected))
    if rewritten:
        corrected = rewritten
    detected: list[str] = []
    matches: list[dict[str, object]] = []

    for term in CORRECTION_TERMS:
        allow_window_fuzzy = term.fuzzy_threshold < 0.9
        best_variant = max(
            term.variants,
            key=lambda variant: _match_score(
                corrected,
                variant,
                allow_window_fuzzy=allow_window_fuzzy,
            ),
        )
        score = _match_score(
            corrected,
            best_variant,
            allow_window_fuzzy=allow_window_fuzzy,
        )
        if score < 0.74:
            continue

        normalized_variant = _normalise(best_variant)
        normalized_corrected = _normalise(corrected)
        if normalized_variant not in normalized_corrected and score < term.fuzzy_threshold:
            continue

        for variant in sorted(term.variants, key=len, reverse=True):
            normalized_variant = _normalise(variant)
            normalized_canonical = _normalise(term.canonical)
            if (
                normalized_variant in normalized_canonical
                and term.canonical in corrected
            ):
                continue
            corrected = _replace_variant(corrected, variant, term.canonical)

        if allow_window_fuzzy and _normalise(term.canonical) not in _normalise(corrected):
            fuzzy_score, fuzzy_span = _best_token_window(corrected, best_variant)
            if fuzzy_span is not None and fuzzy_score >= term.fuzzy_threshold:
                start, end = fuzzy_span
                corrected = f"{corrected[:start]}{term.canonical}{corrected[end:]}"

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
