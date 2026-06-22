import { describe, expect, it } from "vitest";

import {
  getAvatarExpressionForState,
  getIdleMotionFrame,
  getRelaxedAvatarPose,
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
      rootY: -2.82,
      bodyY: 0,
      headYaw: 0,
      headPitch: 0,
      blink: 0,
      scan: 0,
    });
  });

  it("keeps arms out of T-pose with a relaxed assistant stance", () => {
    const pose = getRelaxedAvatarPose("idle");

    expect(pose.leftUpperArm.z).toBeGreaterThan(0.85);
    expect(pose.rightUpperArm.z).toBeLessThan(-0.85);
    expect(Math.abs(pose.leftUpperArm.x)).toBeGreaterThan(0.12);
    expect(Math.abs(pose.rightUpperArm.x)).toBeGreaterThan(0.12);
    expect(Math.abs(pose.leftLowerArm.y)).toBeGreaterThan(0.22);
    expect(Math.abs(pose.rightLowerArm.y)).toBeGreaterThan(0.22);
    expect(pose.head.y).toBe(0);
  });

  it("adds subtle attentive posture for listening without exaggeration", () => {
    const idle = getRelaxedAvatarPose("idle");
    const listening = getRelaxedAvatarPose("listening");

    expect(listening.chest.x).toBeLessThan(idle.chest.x);
    expect(Math.abs(listening.head.x)).toBeLessThan(0.12);
    expect(Math.abs(listening.head.y)).toBeLessThan(0.12);
  });
});
