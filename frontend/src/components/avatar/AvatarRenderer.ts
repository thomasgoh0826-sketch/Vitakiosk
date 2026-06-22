import type { ComponentType } from "react";

import type { AvatarState } from "../../types";


export type AvatarRendererKind = "lottie" | "threejs";

export interface AvatarRendererProps {
  state: AvatarState;
  audioActivity: number;
}

export type AvatarRendererComponent = ComponentType<AvatarRendererProps>;

type AvatarRendererEnv = Partial<Record<"AVATAR_RENDERER" | "VITE_AVATAR_RENDERER", string>>;

export function normalizeAvatarRenderer(value: string | undefined | null): AvatarRendererKind {
  return value?.trim().toLowerCase() === "threejs" ? "threejs" : "lottie";
}

export function getConfiguredAvatarRenderer(
  env: AvatarRendererEnv = import.meta.env as AvatarRendererEnv,
): AvatarRendererKind {
  return normalizeAvatarRenderer(env.AVATAR_RENDERER ?? env.VITE_AVATAR_RENDERER);
}
