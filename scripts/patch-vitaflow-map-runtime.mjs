import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const PATCH_MARKER = "VITAFLOW_MAP_PARITY_PATCH_V1";
const VIEWPORT_FIX_MARKER = "VITAFLOW_MAP_PARITY_VIEWPORT_FIX_V1";
const LABEL_FIX_MARKER = "VITAFLOW_MAP_PARITY_LABEL_FIX_V1";
const LAYOUT_FIX_MARKER = "VITAFLOW_MAP_PARITY_LAYOUT_FIX_V1";
const PROTECTED_RELEASE = "C:\\Users\\Admin\\Documents\\Playground\\release";
const RUNTIME_FILES = ["software-live-overrides.js", "software.css"];

const JS_GEOMETRY_ANCHOR = "\nfunction inventoryLocationRegionBorderRadius(shape = \"rounded\") {";
const JS_SAVE_ANCHOR = "const savedRegion = await apiRequest(\"/api/inventory/location-setup/regions\", {";
const JS_LABEL_RENDER_ANCHOR = '<span>${escapeHtml(region.regionName || region.regionType || "Region")}</span>';
const CSS_ANCHOR = ".inventory-map-stage {";

const JS_PATCH = `
/* ${PATCH_MARKER}: center-coordinate bounds and overlap guard. */
function inventoryLocationRegionRect(region = {}) {
  const geometry = inventoryLocationRegionGeometry(region);
  return {
    left: geometry.x - (geometry.width / 2),
    top: geometry.y - (geometry.height / 2),
    right: geometry.x + (geometry.width / 2),
    bottom: geometry.y + (geometry.height / 2),
  };
}

function inventoryLocationRegionRectanglesIntersect(left, right) {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

function inventoryLocationRegionLayerKey(region = {}) {
  return String(region.layerKind || "zone").trim().toLowerCase();
}

function inventoryLocationConfirmNoOverlap(regionDraft, regions = []) {
  const draftRect = inventoryLocationRegionRect(regionDraft);
  const draftId = String(regionDraft?.id || "");
  const draftLayer = inventoryLocationRegionLayerKey(regionDraft);
  const overlaps = ensureArray(regions).filter((region) => {
    if (region?.isVisible === false || String(region?.id || "") === draftId) return false;
    if (inventoryLocationRegionLayerKey(region) !== draftLayer) return false;
    return inventoryLocationRegionRectanglesIntersect(draftRect, inventoryLocationRegionRect(region));
  });
  if (!overlaps.length) return true;
  const names = overlaps.map((region) => region.regionName || region.regionType || "Unnamed region").join(", ");
  if (!window.confirm(\`This region overlaps: \${names}. Save this intentional same-layer overlap?\`)) {
    throw new Error("Region save cancelled because it overlaps another map region.");
  }
  return true;
}
`;

const JS_LABEL_FIX = `
/* ${LABEL_FIX_MARKER}: abbreviate labels only when the authoritative region is very narrow. */
function inventoryLocationRegionDisplayLabel(region = {}) {
  const fullLabel = String(region.regionName || region.regionType || "Region").trim();
  const geometry = inventoryLocationRegionGeometry(region);
  if (geometry.width >= 6) return fullLabel;
  const words = fullLabel.match(/[A-Za-z0-9]+/g) || [];
  const initials = words.map((word) => word[0]).join("").toUpperCase();
  return initials.length >= 2 ? initials.slice(0, 4) : fullLabel.slice(0, 4).toUpperCase();
}
`;

const CSS_PATCH = `

/* ${PATCH_MARKER}: shared VitaFlow and VitaKiosk floor-plan presentation. */
html body.software-mode .inventory-location-planner-viewport {
  min-height: 0 !important;
  display: grid !important;
  place-items: start center !important;
  overflow: auto !important;
  background: #e8e4dc !important;
}

html body.software-mode .inventory-map-stage,
html body.software-mode .inventory-location-print-map-stage {
  width: 100%;
  aspect-ratio: 5 / 3 !important;
  min-width: 100%;
  overflow: hidden !important;
  border: 1px solid rgba(69, 85, 82, 0.28);
  border-radius: 14px;
  background:
    linear-gradient(rgba(246, 242, 232, 0.9), rgba(232, 230, 222, 0.94)),
    #eeeae1 !important;
  box-shadow: inset 0 0 22px rgba(24, 49, 47, 0.08);
}

html body.software-mode .inventory-map-grid {
  background-image:
    linear-gradient(to right, rgba(65, 82, 82, 0.13) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(65, 82, 82, 0.13) 1px, transparent 1px) !important;
}

html body.software-mode .inventory-map-image {
  object-fit: contain !important;
  background: transparent !important;
}

html body.software-mode .inventory-map-region,
html body.software-mode button.inventory-map-region {
  min-width: 0 !important;
  min-height: 0 !important;
  overflow: hidden !important;
  padding: clamp(3px, 0.7vw, 9px) !important;
  border-width: 1.5px !important;
  box-shadow: 0 2px 8px rgba(37, 49, 48, 0.15), 0 0 0 2px var(--region-draft-shadow, transparent) !important;
}

html body.software-mode .inventory-map-region > span,
html body.software-mode .inventory-map-region > small {
  max-width: 100% !important;
  overflow: hidden !important;
  overflow-wrap: anywhere !important;
  text-wrap: balance;
  line-height: 1.15 !important;
}

html body.software-mode .inventory-map-region > span {
  display: -webkit-box !important;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: clamp(8px, 0.85vw, 13px) !important;
}

html body.software-mode .inventory-map-region > small {
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: clamp(7px, 0.7vw, 11px) !important;
}

/* ${VIEWPORT_FIX_MARKER}: fit the complete 5:3 map in read-only viewers. */
html body.software-mode .inventory-map-canvas.inventory-location-planner-viewport:not(.is-setup) {
  height: min(58vh, 620px) !important;
  min-height: 360px !important;
  place-items: center !important;
}

html body.software-mode .inventory-map-canvas.inventory-location-planner-viewport:not(.is-setup) > .inventory-map-stage {
  width: min(100%, 96.666vh) !important;
  min-width: 0 !important;
  margin: 0 auto !important;
}
`;

const CSS_VIEWPORT_FIX = `

/* ${VIEWPORT_FIX_MARKER}: fit the complete 5:3 map in read-only viewers. */
html body.software-mode .inventory-map-canvas.inventory-location-planner-viewport:not(.is-setup) {
  height: min(58vh, 620px) !important;
  min-height: 360px !important;
  place-items: center !important;
}

html body.software-mode .inventory-map-canvas.inventory-location-planner-viewport:not(.is-setup) > .inventory-map-stage {
  width: min(100%, 96.666vh) !important;
  min-width: 0 !important;
  margin: 0 auto !important;
}
`;

const CSS_LAYOUT_FIX = `

/* ${LAYOUT_FIX_MARKER}: keep the map in flow and prevent cards from covering it. */
@media (min-width: 981px) and (max-width: 1280px) {
  html body.software-mode .inventory-location-modal-layout {
    grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr) !important;
  }
}

html body.software-mode .inventory-location-map-panel {
  overflow: hidden !important;
}

html body.software-mode .inventory-map-canvas.inventory-location-planner-viewport:not(.is-setup) {
  height: 100% !important;
  min-height: 0 !important;
}

html body.software-mode .inventory-map-canvas.inventory-location-planner-viewport:not(.is-setup) > .inventory-map-stage {
  width: auto !important;
  min-width: 0 !important;
  max-width: 100% !important;
  height: 100% !important;
  margin: 0 auto !important;
}

@media (max-width: 980px) {
  html body.software-mode .inventory-location-map-modal {
    grid-template-rows: auto auto auto !important;
    overflow: auto !important;
  }

  html body.software-mode .inventory-location-modal-layout {
    display: block !important;
  }

  html body.software-mode .inventory-location-map-panel {
    height: min(70vh, 620px) !important;
    margin-bottom: 14px;
  }
}
`;

function normalizedPath(value) {
  return path.resolve(value).replaceAll("/", "\\").toLowerCase();
}

function assertRuntimeIsAllowed(runtimeRoot) {
  const candidate = normalizedPath(runtimeRoot);
  const protectedPath = normalizedPath(PROTECTED_RELEASE);
  if (candidate === protectedPath || candidate.startsWith(`${protectedPath}\\`)) {
    throw new Error("Refusing to access the protected VitaFlow release directory.");
  }
}

function patchJavaScript(source) {
  let patched = source;
  if (!patched.includes(PATCH_MARKER)) {
    if (!patched.includes(JS_GEOMETRY_ANCHOR) || !patched.includes(JS_SAVE_ANCHOR)) {
      throw new Error("Required VitaFlow JavaScript patch anchor is missing.");
    }
    patched = patched
      .replace(JS_GEOMETRY_ANCHOR, `${JS_PATCH}${JS_GEOMETRY_ANCHOR}`)
      .replace(JS_SAVE_ANCHOR, `inventoryLocationConfirmNoOverlap(regionDraft, inventoryLocationSetupRegions());\n    ${JS_SAVE_ANCHOR}`);
  }
  if (!patched.includes(LABEL_FIX_MARKER)) {
    if (!patched.includes(JS_GEOMETRY_ANCHOR) || !patched.includes(JS_LABEL_RENDER_ANCHOR)) {
      throw new Error("Required VitaFlow region-label patch anchor is missing.");
    }
    patched = patched
      .replace(JS_GEOMETRY_ANCHOR, `${JS_LABEL_FIX}${JS_GEOMETRY_ANCHOR}`)
      .replace(JS_LABEL_RENDER_ANCHOR, '<span>${escapeHtml(inventoryLocationRegionDisplayLabel(region))}</span>');
  }
  return patched;
}

function patchCss(source) {
  let patched = source;
  if (!patched.includes(PATCH_MARKER)) {
    if (!patched.includes(CSS_ANCHOR)) {
      throw new Error("Required VitaFlow CSS patch anchor is missing.");
    }
    patched = `${patched.trimEnd()}${CSS_PATCH}\n`;
  } else if (!patched.includes(VIEWPORT_FIX_MARKER)) {
    patched = `${patched.trimEnd()}${CSS_VIEWPORT_FIX}\n`;
  }
  if (!patched.includes(LAYOUT_FIX_MARKER)) {
    patched = `${patched.trimEnd()}${CSS_LAYOUT_FIX}\n`;
  }
  return patched;
}

async function replaceFilesWithRollback(entries) {
  const replaced = [];
  try {
    for (const entry of entries) {
      await writeFile(entry.temporaryPath, entry.content, "utf8");
      await rm(entry.rollbackPath, { force: true });
      await rename(entry.path, entry.rollbackPath);
      try {
        await rename(entry.temporaryPath, entry.path);
      } catch (error) {
        await rename(entry.rollbackPath, entry.path);
        throw error;
      }
      replaced.push(entry);
    }
  } catch (error) {
    for (const entry of replaced.reverse()) {
      await rm(entry.path, { force: true });
      await rename(entry.rollbackPath, entry.path);
    }
    for (const entry of entries) {
      await rm(entry.temporaryPath, { force: true });
    }
    throw error;
  }
  for (const entry of replaced) {
    await rm(entry.rollbackPath, { force: true });
  }
}

export async function patchRuntime(runtimeRoot, options = {}) {
  assertRuntimeIsAllowed(runtimeRoot);
  const resolvedRoot = path.resolve(runtimeRoot);
  const paths = RUNTIME_FILES.map((file) => path.join(resolvedRoot, file));
  const [jsSource, cssSource] = await Promise.all(paths.map((file) => readFile(file, "utf8")));
  const alreadyApplied = jsSource.includes(PATCH_MARKER)
    && jsSource.includes(LABEL_FIX_MARKER)
    && cssSource.includes(PATCH_MARKER)
    && cssSource.includes(VIEWPORT_FIX_MARKER)
    && cssSource.includes(LAYOUT_FIX_MARKER);
  if (alreadyApplied) {
    return {
      changedFiles: [],
      backupDirectory: null,
      databaseWrites: 0,
      protectedReleaseAccesses: 0,
      alreadyApplied: true,
    };
  }

  const patchedSources = [patchJavaScript(jsSource), patchCss(cssSource)];
  if (!patchedSources[0].includes(PATCH_MARKER) || !patchedSources[1].includes(PATCH_MARKER)) {
    throw new Error("Patched runtime validation failed before write.");
  }

  const timestamp = options.timestamp
    ?? new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const backupRoot = path.resolve(
    options.backupRoot
      ?? path.join(process.env.APPDATA ?? osFallbackAppData(), "vitaflow-pharmacy-erp", "codex-backups"),
  );
  const backupDirectory = path.join(backupRoot, `map-parity-${timestamp}`);
  await mkdir(backupDirectory, { recursive: true });
  await Promise.all(paths.map((file) => copyFile(file, path.join(backupDirectory, path.basename(file)))));

  const entries = paths.map((file, index) => ({
    path: file,
    content: patchedSources[index],
    temporaryPath: `${file}.codex-map-parity.tmp`,
    rollbackPath: `${file}.codex-map-parity.rollback`,
  }));
  await replaceFilesWithRollback(entries);

  return {
    changedFiles: paths,
    backupDirectory,
    databaseWrites: 0,
    protectedReleaseAccesses: 0,
    alreadyApplied: false,
  };
}

function osFallbackAppData() {
  return path.join(process.env.USERPROFILE ?? process.cwd(), "AppData", "Roaming");
}

function cliArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const runtime = cliArgument("--runtime");
  if (!runtime) {
    throw new Error("Usage: node scripts/patch-vitaflow-map-runtime.mjs --runtime <frontend-runtime-directory>");
  }
  const result = await patchRuntime(runtime);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
