export type VrmAvatarModelKey = "vita" | "vita-new";

export function getConfiguredVrmAvatarModelKey(
  configuredModel = import.meta.env.VITE_VRM_MODEL,
): VrmAvatarModelKey {
  return configuredModel === "vita-new" ? "vita-new" : "vita";
}

export function getDefaultVrmAvatarModelKey(): VrmAvatarModelKey {
  return getConfiguredVrmAvatarModelKey();
}
