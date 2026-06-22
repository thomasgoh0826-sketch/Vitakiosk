import { describe, expect, it } from "vitest";

import { getMouthOpenAmount } from "./useAvatarLipSync";


describe("avatar lip sync helpers", () => {
  it("opens the mouth based on clamped audio activity while speaking", () => {
    expect(getMouthOpenAmount({ audioActivity: 0.75, state: "speaking" })).toBeCloseTo(0.75);
    expect(getMouthOpenAmount({ audioActivity: 2, state: "speaking" })).toBe(1);
    expect(getMouthOpenAmount({ audioActivity: -1, state: "speaking" })).toBe(0);
  });

  it("keeps non-speaking states mostly closed", () => {
    expect(getMouthOpenAmount({ audioActivity: 0.9, state: "idle" })).toBe(0);
    expect(getMouthOpenAmount({ audioActivity: 0.9, state: "pharmacist_escalation" })).toBe(0);
  });
});
