from __future__ import annotations

import argparse
import io
import json
import struct
from pathlib import Path

from PIL import Image


GLB_MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def pad4(data: bytes, fill: bytes) -> bytes:
    return data + fill * ((-len(data)) % 4)


def read_glb(path: Path) -> tuple[dict, bytes]:
    payload = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<III", payload, 0)
    if magic != GLB_MAGIC or version != 2 or total_length != len(payload):
        raise ValueError("Expected a valid GLB 2.0 VRM file")

    json_length, json_type = struct.unpack_from("<II", payload, 12)
    if json_type != JSON_CHUNK:
        raise ValueError("GLB JSON chunk is missing")
    json_start = 20
    document = json.loads(payload[json_start : json_start + json_length].decode("utf-8"))

    bin_header = json_start + json_length
    bin_length, bin_type = struct.unpack_from("<II", payload, bin_header)
    if bin_type != BIN_CHUNK:
        raise ValueError("GLB binary chunk is missing")
    bin_start = bin_header + 8
    return document, payload[bin_start : bin_start + bin_length]


def optimize_png(payload: bytes, max_dimension: int) -> bytes:
    with Image.open(io.BytesIO(payload)) as image:
        image.load()
        if max(image.size) > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format="PNG", optimize=True, compress_level=9)
        optimized = output.getvalue()
    return optimized if len(optimized) < len(payload) else payload


def optimize_vrm(input_path: Path, output_path: Path, max_texture: int) -> None:
    document, original_bin = read_glb(input_path)
    buffers = document.get("buffers", [])
    if len(buffers) != 1:
        raise ValueError("Tablet optimizer expects one embedded GLB buffer")

    buffer_views = document.get("bufferViews", [])
    replacements: dict[int, bytes] = {}
    for image_index, image in enumerate(document.get("images", [])):
        view_index = image.get("bufferView")
        if view_index is None or image.get("mimeType") != "image/png":
            continue
        view = buffer_views[view_index]
        start = view.get("byteOffset", 0)
        end = start + view["byteLength"]
        dimension = 256 if image_index == 21 else max_texture
        replacements[view_index] = optimize_png(original_bin[start:end], dimension)

    ordered_views = sorted(
        enumerate(buffer_views),
        key=lambda item: item[1].get("byteOffset", 0),
    )
    previous_end = 0
    rebuilt = bytearray()
    for view_index, view in ordered_views:
        old_start = view.get("byteOffset", 0)
        old_end = old_start + view["byteLength"]
        if old_start < previous_end:
            raise ValueError("Overlapping GLB buffer views are not supported")
        previous_end = old_end

        while len(rebuilt) % 4:
            rebuilt.append(0)
        view["byteOffset"] = len(rebuilt)
        view_payload = replacements.get(view_index, original_bin[old_start:old_end])
        view["byteLength"] = len(view_payload)
        rebuilt.extend(view_payload)

    rebuilt_bin = pad4(bytes(rebuilt), b"\x00")
    buffers[0]["byteLength"] = len(rebuilt_bin)

    json_payload = pad4(
        json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        b" ",
    )
    total_length = 12 + 8 + len(json_payload) + 8 + len(rebuilt_bin)
    output = bytearray(struct.pack("<III", GLB_MAGIC, 2, total_length))
    output.extend(struct.pack("<II", len(json_payload), JSON_CHUNK))
    output.extend(json_payload)
    output.extend(struct.pack("<II", len(rebuilt_bin), BIN_CHUNK))
    output.extend(rebuilt_bin)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary.write_bytes(output)
    temporary.replace(output_path)
    print(f"Optimized {input_path.name}: {input_path.stat().st_size} -> {output_path.stat().st_size} bytes")


def main() -> None:
    parser = argparse.ArgumentParser(description="Optimize an embedded VRM for tablet kiosk delivery")
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--max-texture", type=int, default=512)
    args = parser.parse_args()
    optimize_vrm(args.input, args.output, args.max_texture)


if __name__ == "__main__":
    main()
