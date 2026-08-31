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

export interface MouthShapeWeights {
  aa: number;
  ee: number;
  ih: number;
  oh: number;
  ou: number;
  jaw: number;
}

export function getSpeechMouthShapeWeights({
  audioActivity,
  elapsed,
  state,
}: {
  audioActivity: number;
  elapsed: number;
  state: AvatarState;
}): MouthShapeWeights {
  const mouthOpen = getMouthOpenAmount({ audioActivity, state });
  if (mouthOpen <= 0) {
    return { aa: 0, ee: 0, ih: 0, oh: 0, ou: 0, jaw: 0 };
  }

  const pulseA = (Math.sin(elapsed * 13.7) + 1) / 2;
  const pulseB = (Math.sin(elapsed * 8.9 + 1.4) + 1) / 2;
  const pulseC = (Math.sin(elapsed * 17.3 + 0.35) + 1) / 2;
  const envelope = Math.min(1, mouthOpen * (0.72 + pulseA * 0.34));

  return {
    aa: envelope * (0.34 + pulseB * 0.48),
    ee: envelope * (0.06 + pulseC * 0.28),
    ih: envelope * (0.08 + pulseA * 0.22),
    oh: envelope * (0.12 + (1 - pulseB) * 0.34),
    ou: envelope * (0.05 + (1 - pulseC) * 0.22),
    jaw: envelope,
  };
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
  useFrame(({ clock }) => {
    const expressionManager = vrm?.expressionManager;
    if (!expressionManager) {
      return;
    }

    const weights = getSpeechMouthShapeWeights({
      audioActivity,
      elapsed: clock.getElapsedTime(),
      state,
    });
    MOUTH_EXPRESSIONS.forEach((expression) => expressionManager.setValue(expression, 0));
    expressionManager.setValue("aa", weights.aa);
    expressionManager.setValue("ee", weights.ee);
    expressionManager.setValue("ih", weights.ih);
    expressionManager.setValue("oh", weights.oh);
    expressionManager.setValue("ou", weights.ou);
  });
}
