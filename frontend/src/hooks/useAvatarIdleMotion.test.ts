import { describe, expect, it } from "vitest";

import {
  getAvatarExpressionWeights,
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
      rootY: -2.88,
      bodyY: 0,
      headYaw: 0,
      headPitch: 0,
      blink: 0,
      scan: 0,
    });
  });

  it("keeps professional bust portraits free of risky hand and gesture overrides", () => {
    const pose = getRelaxedAvatarPose("idle");

    expect(Math.abs(pose.leftUpperArm.z)).toBeLessThan(1.3);
    expect(Math.abs(pose.rightUpperArm.z)).toBeLessThan(1.3);
    expect(pose.leftUpperArm.z).toBeLessThan(0);
    expect(pose.rightUpperArm.z).toBeGreaterThan(0);
    expect("leftShoulder" in pose).toBe(false);
    expect("rightShoulder" in pose).toBe(false);
    expect("leftLowerArm" in pose).toBe(false);
    expect("rightLowerArm" in pose).toBe(false);
    expect("leftHand" in pose).toBe(false);
    expect("rightHand" in pose).toBe(false);
    expect(pose.head.y).toBe(0);
  });

  it("adds subtle attentive posture for listening without exaggeration", () => {
    const idle = getRelaxedAvatarPose("idle");
    const listening = getRelaxedAvatarPose("listening");

    expect(listening.chest.x).toBeLessThan(idle.chest.x);
    expect(Math.abs(listening.head.x)).toBeLessThan(0.12);
    expect(Math.abs(listening.head.y)).toBeLessThan(0.12);
  });

  it("keeps pharmacist escalation serious instead of friendly or smiling", () => {
    const speaking = getAvatarExpressionWeights("speaking", 0);
    const escalation = getAvatarExpressionWeights("pharmacist_escalation", 0);

    expect(speaking.happy).toBeGreaterThan(0);
    expect(escalation.happy).toBe(0);
    expect(escalation.relaxed).toBe(0);
    expect(escalation.neutral).toBeGreaterThan(0);
    expect(escalation.angry).toBeGreaterThan(0);
    expect(escalation.blink).toBe(0);
  });
});
