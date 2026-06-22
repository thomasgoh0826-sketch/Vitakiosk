import type { ComponentType } from "react";

import type { AvatarState } from "../../types";


export type AvatarRendererKind = "lottie" | "threejs" | "vrm";

export interface AvatarRendererProps {
  state: AvatarState;
  audioActivity: number;
}

export type AvatarRendererComponent = ComponentType<AvatarRendererProps>;

type AvatarRendererEnv = Partial<Record<"AVATAR_RENDERER" | "VITE_AVATAR_RENDERER", string>>;

export function normalizeAvatarRenderer(value: string | undefined | null): AvatarRendererKind {
  const normalized = value?.trim().toLowerCase();
  return normalized === "threejs" || normalized === "vrm" ? normalized : "lottie";
}

export function getConfiguredAvatarRenderer(
  env: AvatarRendererEnv = import.meta.env as AvatarRendererEnv,
): AvatarRendererKind {
  const viteRenderer = normalizeAvatarRenderer(env.VITE_AVATAR_RENDERER);
  if (viteRenderer !== "lottie") {
    return viteRenderer;
  }
  return normalizeAvatarRenderer(env.AVATAR_RENDERER);
}
