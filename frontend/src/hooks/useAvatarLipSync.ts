import { useFrame } from "@react-three/fiber";
import type { VRM } from "@pixiv/three-vrm";

import type { AvatarState } from "../types";


const MOUTH_EXPRESSIONS = ["aa", "ee", "ih", "oh", "ou"];
const MOUTH_OPEN_AUDIO_THRESHOLD = 0.06;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function getMouthOpenAmount({
  audioActivity,
  state,
}: {
  audioActivity: number;
  state: AvatarState;
}): number {
  const activity = clamp01(audioActivity);
  return state === "speaking" && activity >= MOUTH_OPEN_AUDIO_THRESHOLD ? activity : 0;
}

export function useAvatarLipSync({
  audioActivity,
  state,
  vrm,
}: {
  audioActivity: number;
  state: AvatarState;
  vrm: VRM | null;
}) {
  useFrame(() => {
    const expressionManager = vrm?.expressionManager;
    if (!expressionManager) {
      return;
    }

    const mouthOpen = getMouthOpenAmount({ audioActivity, state });
    MOUTH_EXPRESSIONS.forEach((expression) => expressionManager.setValue(expression, 0));
    expressionManager.setValue("aa", mouthOpen);
    expressionManager.setValue("oh", mouthOpen * 0.35);
  });
}
