import { describe, expect, it } from "vitest";

import { calculateAudioActivity } from "./useAudioActivity";


describe("calculateAudioActivity", () => {
  it("returns zero for a silent time-domain buffer", () => {
    expect(calculateAudioActivity(new Uint8Array([128, 128, 128, 128]))).toBe(0);
  });

  it("returns a clamped normalized RMS value", () => {
    const activity = calculateAudioActivity(new Uint8Array([0, 255, 0, 255]));

    expect(activity).toBeGreaterThan(0.9);
    expect(activity).toBeLessThanOrEqual(1);
  });
});
