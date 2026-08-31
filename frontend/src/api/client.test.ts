import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveApiBaseUrl, VitaKioskApi } from "./client";

describe("VitaKioskApi controlled errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserves the backend customer-safe message for a vision outage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        ok: false,
        error: "agnes_product_vision_unavailable",
        message: "Cloud product vision is unavailable. Please scan again or search manually.",
      }),
    }));
    const api = new VitaKioskApi("https://kiosk.example");

    await expect(api.scanProduct(
      new Blob(["jpeg"], { type: "image/jpeg" }),
      "JK",
    )).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      message: "Cloud product vision is unavailable. Please scan again or search manually.",
    });
  });

  it("uses the page origin when the public kiosk selects automatic routing", () => {
    expect(resolveApiBaseUrl("auto")).toBe(window.location.origin);
  });
});
