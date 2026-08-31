import { describe, expect, it } from "vitest";

import { getMouthOpenAmount, getSpeechMouthShapeWeights } from "./useAvatarLipSync";


describe("avatar lip sync helpers", () => {
  it("opens the mouth based on clamped audio activity while speaking", () => {
    expect(getMouthOpenAmount({ audioActivity: 0.75, state: "speaking" })).toBeCloseTo(0.75);
    expect(getMouthOpenAmount({ audioActivity: 2, state: "speaking" })).toBe(1);
    expect(getMouthOpenAmount({ audioActivity: -1, state: "speaking" })).toBe(0);
  });

  it("keeps the mouth closed for low speaking amplitude so silence does not look like speech", () => {
    expect(getMouthOpenAmount({ audioActivity: 0, state: "speaking" })).toBe(0);
    expect(getMouthOpenAmount({ audioActivity: 0.03, state: "speaking" })).toBe(0);
    expect(getMouthOpenAmount({ audioActivity: 0.12, state: "speaking" })).toBeGreaterThan(0);
  });

  it("keeps non-speaking states mostly closed", () => {
    expect(getMouthOpenAmount({ audioActivity: 0.9, state: "idle" })).toBe(0);
    expect(getMouthOpenAmount({ audioActivity: 0.9, state: "listening" })).toBe(0);
    expect(getMouthOpenAmount({ audioActivity: 0.9, state: "thinking" })).toBe(0);
    expect(getMouthOpenAmount({ audioActivity: 0.9, state: "error" })).toBe(0);
    expect(getMouthOpenAmount({ audioActivity: 0.9, state: "pharmacist_escalation" })).toBe(0);
  });

  it("creates varied mouth shapes while speaking instead of one static open-mouth value", () => {
    const first = getSpeechMouthShapeWeights({
      audioActivity: 0.72,
      elapsed: 0.2,
      state: "speaking",
    });
    const later = getSpeechMouthShapeWeights({
      audioActivity: 0.72,
      elapsed: 0.42,
      state: "speaking",
    });

    expect(first.jaw).toBeGreaterThan(0);
    expect(first.aa).toBeGreaterThan(0);
    expect(first.oh).toBeGreaterThan(0);
    expect(first.ee + first.ih + first.ou).toBeGreaterThan(0);
    expect(later).not.toEqual(first);
  });

  it("returns every mouth shape smoothly to rest when audio stops", () => {
    expect(getSpeechMouthShapeWeights({
      audioActivity: 0,
      elapsed: 1,
      state: "speaking",
    })).toEqual({ aa: 0, ee: 0, ih: 0, oh: 0, ou: 0, jaw: 0 });
  });
});
