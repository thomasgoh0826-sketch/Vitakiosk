import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function normalizeRegion(row) {
  if (!row || row.isVisible === false) return null;
  const id = String(row.id ?? row.regionId ?? row.code ?? "").trim();
  const name = String(row.name ?? row.regionName ?? row.label ?? "").trim();
  if (!id || !name) return null;
  const width = clamp(numberOrNull(row.width ?? row.w) ?? 10, 2, 100);
  const height = clamp(numberOrNull(row.height ?? row.h) ?? 10, 2, 100);
  const x = clamp(numberOrNull(row.x ?? row.left ?? row.pinX) ?? width / 2, width / 2, 100 - width / 2);
  const y = clamp(numberOrNull(row.y ?? row.top ?? row.pinY) ?? height / 2, height / 2, 100 - height / 2);
  return {
    id,
    name,
    type: String(row.type ?? row.regionType ?? "region").trim(),
    layerKind: String(row.layerKind ?? row.layer_kind ?? "zone").trim().toLowerCase(),
    x,
    y,
    width,
    height,
    left: x - width / 2,
    top: y - height / 2,
    right: x + width / 2,
    bottom: y + height / 2,
  };
}

export function rectanglesIntersect(left, right) {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

export function verifyRegions(rows) {
  const regions = rows.map(normalizeRegion).filter(Boolean);
  const outOfBounds = regions.filter((region) => (
    region.left < 0
    || region.top < 0
    || region.right > 100
    || region.bottom > 100
  ));
  const intersections = [];
  for (let leftIndex = 0; leftIndex < regions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < regions.length; rightIndex += 1) {
      const left = regions[leftIndex];
      const right = regions[rightIndex];
      if (left.layerKind === right.layerKind && rectanglesIntersect(left, right)) {
        intersections.push({ left: left.id, right: right.id, layerKind: left.layerKind });
      }
    }
  }
  return { regions, outOfBounds, intersections };
}

async function main() {
  const baseUrl = argument("--url", "http://127.0.0.1:3100").replace(/\/$/, "");
  const branch = argument("--branch", "JK");
  const output = argument("--output");
  const endpoint = `${baseUrl}/api/vitakiosk/catalog/shelf-map?branchCode=${encodeURIComponent(branch)}`;
  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`VitaFlow shelf-map request failed: ${response.status}`);
  }
  const payload = await response.json();
  const data = payload?.data ?? payload;
  const map = data?.map ?? data;
  const rows = map?.regions ?? map?.mapRegions ?? map?.branchMapRegions ?? data?.regions ?? [];
  if (!Array.isArray(rows)) {
    throw new Error("VitaFlow shelf-map response has no region array.");
  }
  const verified = verifyRegions(rows);
  const result = {
    verifiedAt: new Date().toISOString(),
    endpoint,
    branch,
    mapId: String(map?.id ?? map?.mapId ?? ""),
    regionCount: verified.regions.length,
    intersectionCount: verified.intersections.length,
    outOfBoundsCount: verified.outOfBounds.length,
    intersections: verified.intersections,
    outOfBounds: verified.outOfBounds.map((region) => region.id),
    regions: verified.regions,
  };
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (output) {
    const outputPath = path.resolve(output);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, serialized, "utf8");
  }
  process.stdout.write(serialized);
  if (result.intersectionCount || result.outOfBoundsCount) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("verify-map-parity.mjs")) {
  await main();
}
