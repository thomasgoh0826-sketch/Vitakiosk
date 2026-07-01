import { describe, expect, it } from "vitest";

import { demoAssets, hasProtectedErpReleasePath, showcaseTabs } from "./demoAssets";

describe("demoAssets", () => {
  it("keeps all product demo media paths in one manifest", () => {
    expect(showcaseTabs.map((tab) => tab.label)).toEqual([
      "VitaKiosk iPad",
      "VitaKiosk Kiosk",
      "VitaFlow ERP",
      "Clinic Partner Flow",
    ]);
    expect(demoAssets.vitakiosk.ipad.screenshots.length).toBeGreaterThanOrEqual(4);
  });

  it("labels ERP capture as placeholder until safe approved assets exist", () => {
    expect(demoAssets.vitaflow.state).toBe("placeholder");
    expect(demoAssets.vitaflow.sourceLabel.toLowerCase()).toContain("placeholder");
  });

  it("does not reference the protected ERP release folder", () => {
    expect(hasProtectedErpReleasePath(JSON.stringify(demoAssets))).toBe(false);
  });
});
