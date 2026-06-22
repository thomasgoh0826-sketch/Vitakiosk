export const DEFAULT_AVATAR_MODEL_MODULE_KEY = "../../assets/avatar/vitakiosk-avatar.glb";
export const DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY = "../../assets/avatar/vita.vrm";

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

export function getVrmAvatarModelUrlFromModules(modules: AvatarModelModules): string | null {
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
