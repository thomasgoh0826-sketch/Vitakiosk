import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { patchRuntime } from "./patch-vitaflow-map-runtime.mjs";

const JS_FIXTURE = `
function inventoryLocationRegionGeometry(region = {}) {
  const width = 12;
  const height = 10;
  return { x: 50, y: 50, width, height };
}

function inventoryLocationRegionBorderRadius(shape = "rounded") {
  return shape === "pill" ? "999px" : "18px";
}

const saveInventoryLocationRegionDraft = async () => {
  const regionDraft = syncInventoryLocationRegionDraftFromDom();
  if (!String(regionDraft.regionName || "").trim()) {
    throw new Error("Region name is required before saving.");
  }
  const savedRegion = await apiRequest("/api/inventory/location-setup/regions", {
    method: "POST",
    body: inventoryLocationSaveRegionPayload(),
  });
  return savedRegion;
};

const regionMarkup = \`<span>\${escapeHtml(region.regionName || region.regionType || "Region")}</span>\`;
`;

const CSS_FIXTURE = `
.inventory-map-stage {
  position: relative;
  aspect-ratio: 16 / 10;
}
.inventory-map-region span { font-size: 12px; }
`;

async function fixtureRuntime() {
  const root = await mkdtemp(path.join(os.tmpdir(), "vitaflow-map-patch-"));
  await writeFile(path.join(root, "software-live-overrides.js"), JS_FIXTURE);
  await writeFile(path.join(root, "software.css"), CSS_FIXTURE);
  return root;
}

test("patches both runtime files once and records no database writes", async () => {
  const runtime = await fixtureRuntime();
  const backups = path.join(runtime, "backups");
  try {
    const first = await patchRuntime(runtime, { backupRoot: backups, timestamp: "20260828-190000" });
    const patchedJs = await readFile(path.join(runtime, "software-live-overrides.js"), "utf8");
    const patchedCss = await readFile(path.join(runtime, "software.css"), "utf8");

    assert.equal(first.changedFiles.length, 2);
    assert.equal(first.databaseWrites, 0);
    assert.equal(first.protectedReleaseAccesses, 0);
    assert.match(patchedJs, /VITAFLOW_MAP_PARITY_PATCH_V1/);
    assert.match(patchedJs, /inventoryLocationConfirmNoOverlap\(regionDraft/);
    assert.match(patchedJs, /VITAFLOW_MAP_PARITY_LABEL_FIX_V1/);
    assert.match(patchedJs, /inventoryLocationRegionDisplayLabel\(region\)/);
    assert.match(patchedCss, /VITAFLOW_MAP_PARITY_PATCH_V1/);
    assert.match(patchedCss, /VITAFLOW_MAP_PARITY_VIEWPORT_FIX_V1/);
    assert.match(patchedCss, /aspect-ratio:\s*5\s*\/\s*3/);
    assert.match(patchedCss, /inventory-location-planner-viewport:not\(\.is-setup\)/);
    assert.match(patchedCss, /VITAFLOW_MAP_PARITY_LAYOUT_FIX_V1/);
    assert.match(patchedCss, /inventory-location-modal-layout/);

    const second = await patchRuntime(runtime, { backupRoot: backups, timestamp: "20260828-190100" });
    assert.equal(second.alreadyApplied, true);
    assert.deepEqual(second.changedFiles, []);
    assert.equal((patchedJs.match(/VITAFLOW_MAP_PARITY_PATCH_V1/g) ?? []).length, 1);
  } finally {
    await rm(runtime, { recursive: true, force: true });
  }
});

test("rejects the protected VitaFlow release directory before accessing it", async () => {
  await assert.rejects(
    () => patchRuntime("C:\\Users\\Admin\\Documents\\Playground\\release"),
    /protected/i,
  );
});

test("leaves both runtime files unchanged when a required anchor is missing", async () => {
  const runtime = await fixtureRuntime();
  const backups = path.join(runtime, "backups");
  try {
    await writeFile(path.join(runtime, "software.css"), ".unrelated { color: red; }\n");
    await assert.rejects(
      () => patchRuntime(runtime, { backupRoot: backups, timestamp: "20260828-190200" }),
      /anchor/i,
    );
    assert.equal(await readFile(path.join(runtime, "software-live-overrides.js"), "utf8"), JS_FIXTURE);
    assert.equal(await readFile(path.join(runtime, "software.css"), "utf8"), ".unrelated { color: red; }\n");
  } finally {
    await rm(runtime, { recursive: true, force: true });
  }
});

test("restores the first file if replacing the second file fails", async () => {
  const runtime = await fixtureRuntime();
  const backups = path.join(runtime, "backups");
  const cssPath = path.join(runtime, "software.css");
  try {
    await rm(cssPath);
    await mkdir(cssPath);
    await assert.rejects(
      () => patchRuntime(runtime, { backupRoot: backups, timestamp: "20260828-190300" }),
    );
    assert.equal(await readFile(path.join(runtime, "software-live-overrides.js"), "utf8"), JS_FIXTURE);
  } finally {
    await rm(runtime, { recursive: true, force: true });
  }
});
