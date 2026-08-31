import { describe, expect, it } from "vitest";

import type { ShelfMapRegion } from "../types";
import {
  MAP_VIEWBOX,
  buildOrthogonalRoute,
  centerOfRegion,
  displayRegionLabel,
  rectanglesIntersect,
  regionRect,
  routeToSvgPath,
  type MapRect,
} from "./shelfMapGeometry";

const region: ShelfMapRegion = {
  id: "shelf-a",
  name: "Shelf Island A",
  type: "Shelf",
  x: 65,
  y: 25,
  width: 40,
  height: 10,
  label: "Shelf Island A",
  color: "#587ca8",
  shape: "rounded",
  rotation: 0,
  z_index: 2,
  layer_kind: "fixture",
};

function rect(left: number, top: number, right: number, bottom: number): MapRect {
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function segmentIntersectsRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  obstacle: MapRect,
) {
  if (start.x === end.x) {
    return start.x > obstacle.left
      && start.x < obstacle.right
      && Math.max(Math.min(start.y, end.y), obstacle.top) < Math.min(Math.max(start.y, end.y), obstacle.bottom);
  }
  return start.y > obstacle.top
    && start.y < obstacle.bottom
    && Math.max(Math.min(start.x, end.x), obstacle.left) < Math.min(Math.max(start.x, end.x), obstacle.right);
}

describe("shelfMapGeometry", () => {
  it("uses x and y as the region center", () => {
    expect(regionRect(region)).toEqual({
      left: 45,
      top: 20,
      right: 85,
      bottom: 30,
      width: 40,
      height: 10,
    });
    expect(centerOfRegion(region)).toEqual({ x: 65, y: 25 });
  });

  it("uses readable abbreviations for very narrow authoritative regions", () => {
    expect(displayRegionLabel({ ...region, name: "Shelf Island B", label: "Shelf Island B", width: 4 })).toBe("SIB");
    expect(displayRegionLabel({ ...region, name: "Promo Display B", label: "Promo Display B", width: 4 })).toBe("PDB");
    expect(displayRegionLabel({ ...region, name: "New shelf", label: "New shelf", width: 7 })).toBe("NS");
    expect(displayRegionLabel({ ...region, name: "Poison Store Room", label: "Poison Store Room", width: 10 })).toBe("PSR");
    expect(displayRegionLabel({ ...region, name: "Counter 1", label: "Counter 1", width: 13 })).toBe("Counter 1");
  });

  it("does not count touching edges as an overlap", () => {
    expect(rectanglesIntersect(rect(0, 0, 20, 20), rect(20, 0, 40, 20))).toBe(false);
    expect(rectanglesIntersect(rect(0, 0, 21, 20), rect(20, 0, 40, 20))).toBe(true);
  });

  it("returns no route without an authoritative entrance or target", () => {
    expect(buildOrthogonalRoute(null, { x: 70, y: 30 }, [])).toBeNull();
    expect(buildOrthogonalRoute({ x: 8, y: 88 }, null, [])).toBeNull();
  });

  it("chooses a stable orthogonal route that avoids inflated obstacles", () => {
    const obstacle = rect(35, 30, 65, 70);
    const route = buildOrthogonalRoute(
      { x: 10, y: 90 },
      { x: 90, y: 10 },
      [obstacle],
    );

    expect(route).not.toBeNull();
    expect(route?.[0]).toEqual({ x: 10, y: 90 });
    expect(route?.at(-1)).toEqual({ x: 90, y: 10 });
    for (let index = 1; index < (route?.length ?? 0); index += 1) {
      expect(segmentIntersectsRect(route![index - 1], route![index], obstacle)).toBe(false);
    }
  });

  it("finds a multi-turn route through the authoritative Jalan Kulim layout", () => {
    const obstacles = [
      rect(20.15, 14.3, 39.85, 25.7),
      rect(41.645, 21.085, 88.375, 28.935),
      rect(88.69, 28.145, 92.69, 44.135),
      rect(10.545, 28.2, 29.475, 51.8),
      rect(13.25, 52.11, 26.75, 67.89),
      rect(85.015, 45.795, 95.005, 74.225),
      rect(13.32, 69.81, 26.68, 80.19),
      rect(4.16, 77.1, 8.16, 91.52),
      rect(26.375, 82.105, 85.585, 90.935),
      rect(76.905, 45.795, 83.915, 76.205),
    ];

    const route = buildOrthogonalRoute(
      { x: 18.01, y: 88.8 },
      { x: 60.01, y: 55 },
      obstacles,
    );

    expect(route).not.toBeNull();
    expect(route?.length).toBeGreaterThan(3);
    const inflated = obstacles.map((obstacle) => rect(
      obstacle.left - 1.5,
      obstacle.top - 1.5,
      obstacle.right + 1.5,
      obstacle.bottom + 1.5,
    ));
    for (let index = 1; index < (route?.length ?? 0); index += 1) {
      expect(inflated.some((obstacle) => segmentIntersectsRect(route![index - 1], route![index], obstacle)))
        .toBe(false);
    }
  });

  it("maps percent coordinates into the shared 5:3 SVG viewBox", () => {
    expect(MAP_VIEWBOX).toEqual({ width: 600, height: 360 });
    expect(routeToSvgPath([{ x: 10, y: 20 }, { x: 50, y: 20 }, { x: 50, y: 75 }]))
      .toBe("M60 72 L300 72 L300 270");
  });
});
