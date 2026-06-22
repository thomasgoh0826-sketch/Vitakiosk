import { describe, expect, it } from "vitest";

import {
  getAvatarExpressionForState,
  getIdleMotionFrame,
} from "./useAvatarIdleMotion";


describe("avatar idle motion helpers", () => {
  it("maps avatar states to intentional facial expressions", () => {
    expect(getAvatarExpressionForState("idle")).toBe("relaxed");
    expect(getAvatarExpressionForState("listening")).toBe("attentive");
    expect(getAvatarExpressionForState("thinking")).toBe("focused");
    expect(getAvatarExpressionForState("speaking")).toBe("friendly");
    expect(getAvatarExpressionForState("error")).toBe("concerned");
    expect(getAvatarExpressionForState("pharmacist_escalation")).toBe("serious");
  });

  it("keeps reduced-motion idle frames stable", () => {
    expect(getIdleMotionFrame({ elapsed: 12, state: "thinking", reducedMotion: true })).toEqual({
      bodyY: 0,
      headYaw: 0,
      headPitch: 0,
      blink: 0,
      scan: 0,
    });
  });
});
