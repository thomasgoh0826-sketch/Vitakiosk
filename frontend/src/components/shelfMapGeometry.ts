import type { ShelfMapRegion } from "../types";

export const MAP_VIEWBOX = { width: 600, height: 360 } as const;
const ROUTE_MARGIN = 1.5;
const BOUNDARY_CORRIDORS = [1, 99] as const;

export type MapPoint = { x: number; y: number };
export type MapRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function regionRect(region: ShelfMapRegion): MapRect {
  return {
    left: region.x - region.width / 2,
    top: region.y - region.height / 2,
    right: region.x + region.width / 2,
    bottom: region.y + region.height / 2,
    width: region.width,
    height: region.height,
  };
}

export function centerOfRegion(region: ShelfMapRegion | null): MapPoint | null {
  return region ? { x: region.x, y: region.y } : null;
}

export function displayRegionLabel(region: ShelfMapRegion): string {
  const fullLabel = region.label?.trim() || region.name.trim() || region.type.trim() || "Region";
  if (region.width >= 12) return fullLabel;
  const words = fullLabel.match(/[\p{L}\p{N}]+/gu) ?? [];
  const initials = words.map((word) => word[0]).join("").toLocaleUpperCase();
  return initials.length >= 2
    ? initials.slice(0, 4)
    : fullLabel.slice(0, 4).toLocaleUpperCase();
}

export function rectanglesIntersect(left: MapRect, right: MapRect): boolean {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

function inflateRect(rect: MapRect, margin = ROUTE_MARGIN): MapRect {
  return {
    left: rect.left - margin,
    top: rect.top - margin,
    right: rect.right + margin,
    bottom: rect.bottom + margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}

function segmentIntersectsRect(start: MapPoint, end: MapPoint, rect: MapRect): boolean {
  if (start.x === end.x) {
    return start.x > rect.left
      && start.x < rect.right
      && Math.max(Math.min(start.y, end.y), rect.top) < Math.min(Math.max(start.y, end.y), rect.bottom);
  }
  if (start.y === end.y) {
    return start.y > rect.top
      && start.y < rect.bottom
      && Math.max(Math.min(start.x, end.x), rect.left) < Math.min(Math.max(start.x, end.x), rect.right);
  }
  return true;
}

function compactRoute(points: MapPoint[]): MapPoint[] {
  return points.filter((point, index) => (
    index === 0
    || point.x !== points[index - 1].x
    || point.y !== points[index - 1].y
  ));
}

function routeLength(points: MapPoint[]): number {
  return points.slice(1).reduce((total, point, index) => (
    total
    + Math.abs(point.x - points[index].x)
    + Math.abs(point.y - points[index].y)
  ), 0);
}

function routeIsClear(points: MapPoint[], obstacles: MapRect[]): boolean {
  const inflated = obstacles.map((obstacle) => inflateRect(obstacle));
  for (let index = 1; index < points.length; index += 1) {
    if (inflated.some((obstacle) => segmentIntersectsRect(points[index - 1], points[index], obstacle))) {
      return false;
    }
  }
  return true;
}

function pointIsInsideRect(point: MapPoint, rect: MapRect): boolean {
  return point.x > rect.left
    && point.x < rect.right
    && point.y > rect.top
    && point.y < rect.bottom;
}

function uniqueCoordinates(values: number[]): number[] {
  return Array.from(new Set(values.map((value) => Math.round(value * 10_000) / 10_000)))
    .filter((value) => value >= 0 && value <= 100)
    .sort((left, right) => left - right);
}

function compactCollinearRoute(points: MapPoint[]): MapPoint[] {
  const compacted = compactRoute(points);
  return compacted.filter((point, index) => {
    if (index === 0 || index === compacted.length - 1) return true;
    const previous = compacted[index - 1];
    const next = compacted[index + 1];
    return !(
      (previous.x === point.x && point.x === next.x)
      || (previous.y === point.y && point.y === next.y)
    );
  });
}

function buildVisibilityGraphRoute(
  entrance: MapPoint,
  target: MapPoint,
  obstacles: MapRect[],
): MapPoint[] | null {
  const inflated = obstacles.map((obstacle) => inflateRect(obstacle));
  const xCoordinates = uniqueCoordinates([
    entrance.x,
    target.x,
    0.5,
    99.5,
    ...inflated.flatMap((obstacle) => [obstacle.left, obstacle.right]),
  ]);
  const yCoordinates = uniqueCoordinates([
    entrance.y,
    target.y,
    0.5,
    99.5,
    ...inflated.flatMap((obstacle) => [obstacle.top, obstacle.bottom]),
  ]);
  const nodes: MapPoint[] = [];
  const indexByCoordinate = new Map<string, number>();
  const coordinateKey = (x: number, y: number) => `${x}:${y}`;

  for (const y of yCoordinates) {
    for (const x of xCoordinates) {
      const point = { x, y };
      if (inflated.some((obstacle) => pointIsInsideRect(point, obstacle))) continue;
      indexByCoordinate.set(coordinateKey(x, y), nodes.length);
      nodes.push(point);
    }
  }

  const startIndex = indexByCoordinate.get(coordinateKey(entrance.x, entrance.y));
  const targetIndex = indexByCoordinate.get(coordinateKey(target.x, target.y));
  if (startIndex === undefined || targetIndex === undefined) return null;

  const adjacency = nodes.map(() => [] as Array<{ index: number; cost: number }>);
  const connectLine = (indices: number[]) => {
    const sorted = [...indices].sort((left, right) => {
      const leftPoint = nodes[left];
      const rightPoint = nodes[right];
      return leftPoint.x - rightPoint.x || leftPoint.y - rightPoint.y;
    });
    for (let index = 1; index < sorted.length; index += 1) {
      const leftIndex = sorted[index - 1];
      const rightIndex = sorted[index];
      const leftPoint = nodes[leftIndex];
      const rightPoint = nodes[rightIndex];
      if (inflated.some((obstacle) => segmentIntersectsRect(leftPoint, rightPoint, obstacle))) continue;
      const cost = Math.abs(leftPoint.x - rightPoint.x) + Math.abs(leftPoint.y - rightPoint.y);
      adjacency[leftIndex].push({ index: rightIndex, cost });
      adjacency[rightIndex].push({ index: leftIndex, cost });
    }
  };

  for (const y of yCoordinates) {
    connectLine(nodes.map((point, index) => point.y === y ? index : -1).filter((index) => index >= 0));
  }
  for (const x of xCoordinates) {
    connectLine(nodes.map((point, index) => point.x === x ? index : -1).filter((index) => index >= 0));
  }

  const distances = nodes.map(() => Number.POSITIVE_INFINITY);
  const previous = nodes.map(() => -1);
  const visited = nodes.map(() => false);
  distances[startIndex] = 0;

  for (let iteration = 0; iteration < nodes.length; iteration += 1) {
    let current = -1;
    for (let index = 0; index < nodes.length; index += 1) {
      if (visited[index]) continue;
      if (current < 0 || distances[index] < distances[current]) current = index;
    }
    if (current < 0 || !Number.isFinite(distances[current])) break;
    if (current === targetIndex) break;
    visited[current] = true;
    for (const edge of adjacency[current]) {
      const nextDistance = distances[current] + edge.cost;
      if (nextDistance < distances[edge.index]) {
        distances[edge.index] = nextDistance;
        previous[edge.index] = current;
      }
    }
  }

  if (!Number.isFinite(distances[targetIndex])) return null;
  const route: MapPoint[] = [];
  for (let current = targetIndex; current >= 0; current = previous[current]) {
    route.push(nodes[current]);
    if (current === startIndex) break;
  }
  route.reverse();
  return compactCollinearRoute(route);
}

export function buildOrthogonalRoute(
  entrance: MapPoint | null,
  target: MapPoint | null,
  obstacles: MapRect[],
): MapPoint[] | null {
  if (!entrance || !target) {
    return null;
  }

  const candidates = [
    [entrance, { x: target.x, y: entrance.y }, target],
    [entrance, { x: entrance.x, y: target.y }, target],
    ...BOUNDARY_CORRIDORS.map((x) => [
      entrance,
      { x, y: entrance.y },
      { x, y: target.y },
      target,
    ]),
    ...BOUNDARY_CORRIDORS.map((y) => [
      entrance,
      { x: entrance.x, y },
      { x: target.x, y },
      target,
    ]),
  ].map(compactRoute);

  const simpleRoute = candidates
    .map((points, candidateOrder) => ({ points, candidateOrder, length: routeLength(points) }))
    .filter(({ points }) => routeIsClear(points, obstacles))
    .sort((left, right) => left.length - right.length || left.candidateOrder - right.candidateOrder)[0]?.points
    ?? null;
  return simpleRoute ?? buildVisibilityGraphRoute(entrance, target, obstacles);
}

function scaleCoordinate(value: number, extent: number): number {
  return Math.round((value / 100) * extent * 100) / 100;
}

export function routeToSvgPath(points: MapPoint[]): string {
  return points.map((point, index) => {
    const x = scaleCoordinate(point.x, MAP_VIEWBOX.width);
    const y = scaleCoordinate(point.y, MAP_VIEWBOX.height);
    return `${index === 0 ? "M" : "L"}${x} ${y}`;
  }).join(" ");
}
