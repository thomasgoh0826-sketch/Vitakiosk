import { useFrame } from "@react-three/fiber";
import type { VRM } from "@pixiv/three-vrm";
import { useRef, type RefObject } from "react";
import type { Group } from "three";

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

export function getAvatarExpressionForState(state: AvatarState): AvatarExpression {
  return EXPRESSION_BY_STATE[state];
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
      rootRef.current.position.y = -0.62 + frame.bodyY;
      rootRef.current.rotation.y = frame.headYaw * 0.34;
      rootRef.current.rotation.x = frame.headPitch * 0.18;
    }

    if (vrm) {
      const head = vrm.humanoid.getNormalizedBoneNode("head");
      const neck = vrm.humanoid.getNormalizedBoneNode("neck");
      const chest = vrm.humanoid.getNormalizedBoneNode("chest");

      if (head) {
        head.rotation.y = frame.headYaw;
        head.rotation.x = frame.headPitch;
      }
      if (neck) {
        neck.rotation.y = frame.headYaw * 0.28;
      }
      if (chest) {
        chest.rotation.z = Math.sin(elapsed * 0.45) * 0.018;
      }

      applyExpressionWeights(vrm, state, blink);
    }
  });
}

function useRefNumber(initialValue: number) {
  return useRef(initialValue);
}
