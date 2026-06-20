import type { ComponentType } from "react";

import type { AvatarState } from "../../types";


export interface AvatarRendererProps {
  state: AvatarState;
  audioActivity: number;
}

export type AvatarRendererComponent = ComponentType<AvatarRendererProps>;
