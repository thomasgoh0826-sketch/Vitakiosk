import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";


const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("tablet leaflet asset budget", () => {
  it.each([
    "vitaflow-blackmores-campaign-20260829.png",
    "vitaflow-fisherman-promotion-20260829.png",
  ])("keeps %s below 900 KB", (fileName) => {
    const assetPath = resolve(frontendRoot, "public", "assets", "leaflets", fileName);

    expect(statSync(assetPath).size).toBeLessThanOrEqual(900 * 1024);
  });
});
