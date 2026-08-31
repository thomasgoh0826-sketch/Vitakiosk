import type { ComponentType } from "react";

import type { AvatarPresentation, AvatarState } from "../../types";


export type AvatarRendererKind = "lottie" | "threejs" | "vrm";

export interface AvatarRendererProps {
  state: AvatarState;
  audioActivity: number;
  presentation?: AvatarPresentation;
}

export type AvatarRendererComponent = ComponentType<AvatarRendererProps>;

type AvatarRendererEnv = Partial<Record<string, string | undefined>> & {
  VITE_AVATAR_RENDERER?: string;
};

export function normalizeAvatarRenderer(value: string | undefined | null): AvatarRendererKind {
  const normalized = value?.trim().toLowerCase();
  return normalized === "threejs" || normalized === "vrm" ? normalized : "lottie";
}

export function getConfiguredAvatarRenderer(
  env: AvatarRendererEnv = import.meta.env as AvatarRendererEnv,
): AvatarRendererKind {
  return normalizeAvatarRenderer(env.VITE_AVATAR_RENDERER);
}
