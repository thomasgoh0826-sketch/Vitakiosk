import { useFrame } from "@react-three/fiber";
import type { VRM } from "@pixiv/three-vrm";
import { useRef, type RefObject } from "react";
import type { Group, Object3D } from "three";

import type { AvatarState } from "../types";


export type AvatarExpression =
  | "relaxed"
  | "attentive"
  | "focused"
  | "friendly"
  | "concerned"
  | "serious";

const CONTROLLED_FACE_EXPRESSIONS = [
  "relaxed",
  "happy",
  "sad",
  "angry",
  "surprised",
  "neutral",
  "blink",
];

const EXPRESSION_BY_STATE: Record<AvatarState, AvatarExpression> = {
  idle: "relaxed",
  listening: "attentive",
  thinking: "focused",
  speaking: "friendly",
  error: "concerned",
  pharmacist_escalation: "serious",
};

const VRM_PORTRAIT_BASE_Y = -2.82;
const VRM_PORTRAIT_BASE_YAW = 0;

export interface BoneRotation {
  x: number;
  y: number;
  z: number;
}

export interface RelaxedAvatarPose {
  hips: BoneRotation;
  chest: BoneRotation;
  upperChest: BoneRotation;
  neck: BoneRotation;
  head: BoneRotation;
  leftShoulder: BoneRotation;
  rightShoulder: BoneRotation;
  leftUpperArm: BoneRotation;
  rightUpperArm: BoneRotation;
  leftLowerArm: BoneRotation;
  rightLowerArm: BoneRotation;
  leftHand: BoneRotation;
  rightHand: BoneRotation;
}

export function getAvatarExpressionForState(state: AvatarState): AvatarExpression {
  return EXPRESSION_BY_STATE[state];
}

function rotation(x = 0, y = 0, z = 0): BoneRotation {
  return { x, y, z };
}

export function getRelaxedAvatarPose(state: AvatarState): RelaxedAvatarPose {
  const attentiveLean = state === "listening" ? -0.055 : 0;
  const seriousLean = state === "pharmacist_escalation" ? -0.025 : 0;
  const alertTension = state === "error" || state === "pharmacist_escalation" ? 0.08 : 0;

  return {
    hips: rotation(0.015, 0, 0),
    chest: rotation(-0.025 + attentiveLean + seriousLean, 0, 0),
    upperChest: rotation(-0.015 + attentiveLean * 0.7, 0, 0),
    neck: rotation(0.01 + attentiveLean * 0.4, 0, 0),
    head: rotation(0, 0, 0),
    leftShoulder: rotation(0.02, 0.02, 0.1),
    rightShoulder: rotation(0.02, -0.02, -0.1),
    leftUpperArm: rotation(-0.24 - alertTension, 0.06, 1.18),
    rightUpperArm: rotation(-0.24 - alertTension, -0.06, -1.18),
    leftLowerArm: rotation(-0.06, 0.48, 0.12),
    rightLowerArm: rotation(-0.06, -0.48, -0.12),
    leftHand: rotation(0.02, 0.06, 0.04),
    rightHand: rotation(0.02, -0.06, -0.04),
  };
}

export function getIdleMotionFrame({
  elapsed,
  state,
  reducedMotion,
}: {
  elapsed: number;
  state: AvatarState;
  reducedMotion: boolean;
}) {
  if (reducedMotion) {
    return {
      rootY: VRM_PORTRAIT_BASE_Y,
      bodyY: 0,
      headYaw: 0,
      headPitch: 0,
      blink: 0,
      scan: 0,
    };
  }

  const stateIntensity = state === "listening" || state === "speaking" ? 1.22 : 1;
  const scan = state === "thinking" ? (Math.sin(elapsed * 2.1) + 1) / 2 : 0;

  return {
    rootY: VRM_PORTRAIT_BASE_Y + Math.sin(elapsed * 1.18) * 0.026 * stateIntensity,
    bodyY: Math.sin(elapsed * 1.18) * 0.026 * stateIntensity,
    headYaw: Math.sin(elapsed * 0.54) * 0.07,
    headPitch: Math.sin(elapsed * 0.72 + 0.8) * 0.035 - scan * 0.018,
    blink: 0,
    scan,
  };
}

function applyExpressionWeights(vrm: VRM, state: AvatarState, blink: number) {
  const expressionManager = vrm.expressionManager;
  if (!expressionManager) {
    return;
  }

  CONTROLLED_FACE_EXPRESSIONS.forEach((expression) => expressionManager.setValue(expression, 0));
  expressionManager.setValue("blink", blink);

  switch (getAvatarExpressionForState(state)) {
    case "relaxed":
      expressionManager.setValue("relaxed", 0.38);
      break;
    case "attentive":
      expressionManager.setValue("surprised", 0.14);
      expressionManager.setValue("neutral", 0.16);
      break;
    case "focused":
      expressionManager.setValue("neutral", 0.32);
      break;
    case "friendly":
      expressionManager.setValue("happy", 0.3);
      expressionManager.setValue("relaxed", 0.12);
      break;
    case "concerned":
      expressionManager.setValue("sad", 0.42);
      break;
    case "serious":
      expressionManager.setValue("neutral", 0.4);
      expressionManager.setValue("angry", 0.12);
      break;
  }
}

function applyBoneRotation(bone: Object3D | null, pose: BoneRotation, weight = 1) {
  if (!bone) {
    return;
  }

  bone.rotation.x = pose.x * weight;
  bone.rotation.y = pose.y * weight;
  bone.rotation.z = pose.z * weight;
}

export function useAvatarIdleMotion({
  reducedMotion,
  rootRef,
  state,
  vrm,
}: {
  reducedMotion: boolean;
  rootRef: RefObject<Group>;
  state: AvatarState;
  vrm: VRM | null;
}) {
  const nextBlinkAt = useRefNumber(1.8);
  const blinkUntil = useRefNumber(0);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const frame = getIdleMotionFrame({ elapsed, state, reducedMotion });
    let blink = frame.blink;

    if (!reducedMotion) {
      if (elapsed >= nextBlinkAt.current) {
        blinkUntil.current = elapsed + 0.14;
        nextBlinkAt.current = elapsed + 2.2 + Math.random() * 3.2;
      }
      blink = elapsed < blinkUntil.current ? 1 : 0;
    }

    if (rootRef.current) {
      rootRef.current.position.y = frame.rootY;
      rootRef.current.rotation.y = VRM_PORTRAIT_BASE_YAW + frame.headYaw * 0.34;
      rootRef.current.rotation.x = frame.headPitch * 0.18;
    }

    if (vrm) {
      const pose = getRelaxedAvatarPose(state);
      const hips = vrm.humanoid.getNormalizedBoneNode("hips");
      const head = vrm.humanoid.getNormalizedBoneNode("head");
      const neck = vrm.humanoid.getNormalizedBoneNode("neck");
      const chest = vrm.humanoid.getNormalizedBoneNode("chest");
      const upperChest = vrm.humanoid.getNormalizedBoneNode("upperChest");
      const leftShoulder = vrm.humanoid.getNormalizedBoneNode("leftShoulder");
      const rightShoulder = vrm.humanoid.getNormalizedBoneNode("rightShoulder");
      const leftUpperArm = vrm.humanoid.getNormalizedBoneNode("leftUpperArm");
      const rightUpperArm = vrm.humanoid.getNormalizedBoneNode("rightUpperArm");
      const leftLowerArm = vrm.humanoid.getNormalizedBoneNode("leftLowerArm");
      const rightLowerArm = vrm.humanoid.getNormalizedBoneNode("rightLowerArm");
      const leftHand = vrm.humanoid.getNormalizedBoneNode("leftHand");
      const rightHand = vrm.humanoid.getNormalizedBoneNode("rightHand");

      applyBoneRotation(hips, pose.hips);
      applyBoneRotation(chest, {
        x: pose.chest.x,
        y: pose.chest.y,
        z: pose.chest.z + Math.sin(elapsed * 0.45) * 0.018,
      });
      applyBoneRotation(upperChest, pose.upperChest);
      applyBoneRotation(neck, {
        x: pose.neck.x + frame.headPitch * 0.22,
        y: pose.neck.y + frame.headYaw * 0.24,
        z: pose.neck.z,
      });
      applyBoneRotation(leftShoulder, pose.leftShoulder);
      applyBoneRotation(rightShoulder, pose.rightShoulder);
      applyBoneRotation(leftUpperArm, pose.leftUpperArm);
      applyBoneRotation(rightUpperArm, pose.rightUpperArm);
      applyBoneRotation(leftLowerArm, pose.leftLowerArm);
      applyBoneRotation(rightLowerArm, pose.rightLowerArm);
      applyBoneRotation(leftHand, pose.leftHand);
      applyBoneRotation(rightHand, pose.rightHand);
      if (head) {
        head.rotation.y = pose.head.y + frame.headYaw;
        head.rotation.x = pose.head.x + frame.headPitch;
        head.rotation.z = pose.head.z;
      }

      applyExpressionWeights(vrm, state, blink);
    }
  });
}

function useRefNumber(initialValue: number) {
  return useRef(initialValue);
}
