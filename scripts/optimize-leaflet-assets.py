from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def optimize_leaflet(source: Path, destination: Path, max_width: int) -> None:
    with Image.open(source) as image:
        image.load()
        if image.width > max_width:
            height = round(image.height * max_width / image.width)
            image = image.resize((max_width, height), Image.Resampling.LANCZOS)
        image = image.convert("RGBA").quantize(
            colors=256,
            method=Image.Quantize.FASTOCTREE,
            dither=Image.Dither.FLOYDSTEINBERG,
        )
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, format="PNG", optimize=True, compress_level=9)
    print(f"Optimized {source.name}: {source.stat().st_size} -> {destination.stat().st_size} bytes")


def main() -> None:
    parser = argparse.ArgumentParser(description="Optimize VitaKiosk leaflet artwork for tablet delivery")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--max-width", type=int, default=768)
    args = parser.parse_args()
    optimize_leaflet(args.source, args.destination, args.max_width)


if __name__ == "__main__":
    main()
