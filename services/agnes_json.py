from __future__ import annotations

import json
import re


_SINGLE_JSON_FENCE = re.compile(
    r"\A```(?:json)?\s*\n?(?P<body>.*?)\n?```\Z",
    re.IGNORECASE | re.DOTALL,
)


def parse_agnes_json_object(content: object) -> dict[str, object]:
    """Parse one plain or fenced JSON object without accepting extra prose."""

    if not isinstance(content, str):
        raise ValueError("Agnes response content must be text")
    stripped = content.strip()
    fenced = _SINGLE_JSON_FENCE.fullmatch(stripped)
    if fenced is not None:
        stripped = fenced.group("body").strip()
    elif "```" in stripped:
        raise ValueError("Agnes response contains invalid fenced content")

    parsed = json.loads(stripped)
    if not isinstance(parsed, dict):
        raise ValueError("Agnes response must be a JSON object")
    return parsed
