import { useFrame } from "@react-three/fiber";
import type { VRM } from "@pixiv/three-vrm";
import { useRef, type RefObject } from "react";
import { Euler, Quaternion } from "three";
import type { Group } from "three";

import type { AvatarExpressionState, AvatarFocusTarget, AvatarPresentation, AvatarState } from "../types";


export type AvatarExpression =
  | "relaxed"
  | "attentive"
  | "focused"
  | "friendly"
  | "concerned"
  | "serious"
  | "happy_highlight"
  | "focused_guidance";

const CONTROLLED_FACE_EXPRESSIONS = [
  "relaxed",
  "happy",
  "sad",
  "angry",
  "surprised",
  "neutral",
  "blink",
] as const;

const EXPRESSION_BY_STATE: Record<AvatarState, AvatarExpression> = {
  idle: "relaxed",
  listening: "attentive",
  thinking: "focused",
  speaking: "friendly",
  error: "concerned",
  pharmacist_escalation: "serious",
};

const DEFAULT_PRESENTATION: AvatarPresentation = {
  expression: "neutral_idle",
  focusTarget: "center",
  gesture: "none",
};

const VRM_PORTRAIT_BASE_Y = -2.88;
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
  leftUpperArm: BoneRotation;
  rightUpperArm: BoneRotation;
}

export function getAvatarExpressionForState(state: AvatarState): AvatarExpression {
  return EXPRESSION_BY_STATE[state];
}

export function getAvatarExpressionForPresentation(
  state: AvatarState,
  presentation: AvatarPresentation = DEFAULT_PRESENTATION,
): AvatarExpression {
  if (state === "pharmacist_escalation" || presentation.expression === "safety_alert") {
    return "serious";
  }
  if (state === "error") {
    return "concerned";
  }
  if (state !== "thinking" && state !== "speaking") {
    return getAvatarExpressionForState(state);
  }
  switch (presentation.expression) {
    case "friendly_explaining":
      return "friendly";
    case "happy_highlight":
      return "happy_highlight";
    case "focused_guidance":
      return "focused_guidance";
    case "neutral_idle":
    default:
      return getAvatarExpressionForState(state);
  }
}

export type AvatarExpressionWeights = Record<(typeof CONTROLLED_FACE_EXPRESSIONS)[number], number>;

export function getAvatarExpressionWeights(
  state: AvatarState,
  blink: number,
  presentation: AvatarPresentation = DEFAULT_PRESENTATION,
): AvatarExpressionWeights {
  const weights: AvatarExpressionWeights = {
    relaxed: 0,
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0,
    neutral: 0,
    blink,
  };

  switch (getAvatarExpressionForPresentation(state, presentation)) {
    case "relaxed":
      weights.relaxed = 0.38;
      break;
    case "attentive":
      weights.relaxed = 0.1;
      weights.neutral = 0.18;
      break;
    case "focused":
      weights.neutral = 0.32;
      break;
    case "friendly":
      weights.neutral = 0.18;
      weights.relaxed = 0.18;
      break;
    case "happy_highlight":
      weights.neutral = 0.16;
      weights.relaxed = 0.2;
      break;
    case "focused_guidance":
      weights.neutral = 0.28;
      weights.relaxed = 0.08;
      break;
    case "concerned":
      weights.sad = 0.42;
      break;
    case "serious":
      weights.neutral = 0.4;
      weights.angry = 0.12;
      break;
  }

  return weights;
}

function focusYaw(target: AvatarFocusTarget): number {
  switch (target) {
    case "product":
      return -0.13;
    case "promotion":
      return -0.22;
    case "shelf":
      return -0.18;
    case "pharmacist":
      return -0.08;
    case "center":
    default:
      return 0;
  }
}

function rotation(x = 0, y = 0, z = 0): BoneRotation {
  return { x, y, z };
}

export function getRelaxedAvatarPose(state: AvatarState): RelaxedAvatarPose {
  const attentiveLean = state === "listening" ? -0.055 : 0;
  const seriousLean = state === "pharmacist_escalation" ? -0.025 : 0;

  return {
    hips: rotation(0.015, 0, 0),
    chest: rotation(-0.025 + attentiveLean + seriousLean, 0, 0),
    upperChest: rotation(-0.015 + attentiveLean * 0.7, 0, 0),
    neck: rotation(0.01 + attentiveLean * 0.4, 0, 0),
    head: rotation(0, 0, 0),
    leftUpperArm: rotation(0.04, 0.02, -1.18),
    rightUpperArm: rotation(0.04, -0.02, 1.18),
  };
}

export function getGesturePoseOffset(
  presentation: AvatarPresentation = DEFAULT_PRESENTATION,
): Pick<RelaxedAvatarPose, "chest" | "neck" | "head" | "leftUpperArm" | "rightUpperArm"> {
  const yaw = focusYaw(presentation.focusTarget);
  const base = {
    chest: rotation(0, yaw * 0.4, 0),
    neck: rotation(0, yaw * 0.45, 0),
    head: rotation(0, yaw, 0),
    leftUpperArm: rotation(0, 0, 0),
    rightUpperArm: rotation(0, 0, 0),
  };

  switch (presentation.gesture) {
    case "present_product":
      return {
        ...base,
        chest: rotation(-0.018, yaw * 0.55, -0.012),
        rightUpperArm: rotation(-0.05, -0.08, -0.08),
      };
    case "present_promotion":
      return {
        ...base,
        chest: rotation(-0.014, yaw * 0.55, 0.012),
        leftUpperArm: rotation(-0.05, 0.08, 0.08),
      };
    case "guide_shelf":
      return {
        ...base,
        neck: rotation(-0.015, yaw * 0.55, 0),
        rightUpperArm: rotation(-0.08, -0.04, -0.05),
      };
    case "safety_handoff":
      return {
        ...base,
        chest: rotation(-0.018, yaw * 0.3, 0),
      };
    case "none":
    default:
      return base;
  }
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

  const weights = getAvatarExpressionWeights(state, blink);
  CONTROLLED_FACE_EXPRESSIONS.forEach((expression) => {
    expressionManager.setValue(expression, weights[expression]);
  });
}

function toQuaternionTuple(pose: BoneRotation): [number, number, number, number] {
  const quaternion = new Quaternion().setFromEuler(new Euler(pose.x, pose.y, pose.z, "XYZ"));
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

export function useAvatarIdleMotion({
  reducedMotion,
  rootRef,
  state,
  vrm,
  presentation = DEFAULT_PRESENTATION,
}: {
  reducedMotion: boolean;
  rootRef: RefObject<Group>;
  state: AvatarState;
  vrm: VRM | null;
  presentation?: AvatarPresentation;
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
      const gesture = getGesturePoseOffset(presentation);
      const speakingNod = state === "speaking" && !reducedMotion ? Math.sin(elapsed * 3.2) * 0.012 : 0;
      vrm.humanoid.setNormalizedPose({
        hips: { rotation: toQuaternionTuple(pose.hips) },
        chest: {
          rotation: toQuaternionTuple({
            x: pose.chest.x + gesture.chest.x,
            y: pose.chest.y + gesture.chest.y,
            z: pose.chest.z + Math.sin(elapsed * 0.45) * 0.018,
          }),
        },
        upperChest: { rotation: toQuaternionTuple(pose.upperChest) },
        neck: {
          rotation: toQuaternionTuple({
            x: pose.neck.x + gesture.neck.x + frame.headPitch * 0.22 + speakingNod,
            y: pose.neck.y + gesture.neck.y + frame.headYaw * 0.24,
            z: pose.neck.z,
          }),
        },
        head: {
          rotation: toQuaternionTuple({
            x: pose.head.x + gesture.head.x + frame.headPitch + speakingNod,
            y: pose.head.y + gesture.head.y + frame.headYaw,
            z: pose.head.z,
          }),
        },
        leftUpperArm: {
          rotation: toQuaternionTuple({
            x: pose.leftUpperArm.x + gesture.leftUpperArm.x,
            y: pose.leftUpperArm.y + gesture.leftUpperArm.y,
            z: pose.leftUpperArm.z + gesture.leftUpperArm.z,
          }),
        },
        rightUpperArm: {
          rotation: toQuaternionTuple({
            x: pose.rightUpperArm.x + gesture.rightUpperArm.x,
            y: pose.rightUpperArm.y + gesture.rightUpperArm.y,
            z: pose.rightUpperArm.z + gesture.rightUpperArm.z,
          }),
        },
      });

      const weights = getAvatarExpressionWeights(state, blink, presentation);
      CONTROLLED_FACE_EXPRESSIONS.forEach((expression) => {
        vrm.expressionManager?.setValue(expression, weights[expression]);
      });
    }
  });
}

function useRefNumber(initialValue: number) {
  return useRef(initialValue);
}
