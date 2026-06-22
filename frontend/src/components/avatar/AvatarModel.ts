export const DEFAULT_AVATAR_MODEL_MODULE_KEY = "../../assets/avatar/vitakiosk-avatar.glb";
export const DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY = "../../assets/avatar/vita.vrm";
export const VITA_NEW_VRM_AVATAR_MODEL_MODULE_KEY = "../../assets/avatar/vita-new.vrm";

export type VrmAvatarModelKey = "vita" | "vita-new";

type AvatarModelModules = Record<string, string>;

const avatarModelModules = import.meta.glob("../../assets/avatar/*.glb", {
  eager: true,
  import: "default",
  query: "?url",
}) as AvatarModelModules;

const vrmAvatarModelModules = import.meta.glob("../../assets/avatar/*.vrm", {
  eager: true,
  import: "default",
  query: "?url",
}) as AvatarModelModules;

export function getAvatarModelUrlFromModules(modules: AvatarModelModules): string | null {
  if (modules[DEFAULT_AVATAR_MODEL_MODULE_KEY]) {
    return modules[DEFAULT_AVATAR_MODEL_MODULE_KEY];
  }

  const firstModelKey = Object.keys(modules)
    .sort()
    .find((key) => key.toLowerCase().endsWith(".glb"));

  return firstModelKey ? modules[firstModelKey] : null;
}

export function getDefaultAvatarModelUrl(): string | null {
  return getAvatarModelUrlFromModules(avatarModelModules);
}

export function getConfiguredVrmAvatarModelKey(
  configuredModel = import.meta.env.VITE_VRM_MODEL,
): VrmAvatarModelKey {
  return configuredModel === "vita-new" ? "vita-new" : "vita";
}

function getVrmModelModuleKey(modelKey: VrmAvatarModelKey): string {
  return modelKey === "vita-new"
    ? VITA_NEW_VRM_AVATAR_MODEL_MODULE_KEY
    : DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY;
}

export function getVrmAvatarModelUrlFromModules(
  modules: AvatarModelModules,
  configuredModel: string | undefined = getConfiguredVrmAvatarModelKey(),
): string | null {
  const selectedModelKey = getConfiguredVrmAvatarModelKey(configuredModel);
  const selectedModuleKey = getVrmModelModuleKey(selectedModelKey);

  if (modules[selectedModuleKey]) {
    return modules[selectedModuleKey];
  }

  if (selectedModelKey === "vita-new") {
    return null;
  }

  if (modules[DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY]) {
    return modules[DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY];
  }

  const firstModelKey = Object.keys(modules)
    .sort()
    .find((key) => key.toLowerCase().endsWith(".vrm"));

  return firstModelKey ? modules[firstModelKey] : null;
}

export function getDefaultVrmAvatarModelUrl(): string | null {
  return getVrmAvatarModelUrlFromModules(vrmAvatarModelModules);
}

export function getDefaultVrmAvatarModelKey(): VrmAvatarModelKey {
  return getConfiguredVrmAvatarModelKey();
}
