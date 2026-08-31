import { afterEach, describe, expect, it, vi } from "vitest";
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_AVATAR_MODEL_MODULE_KEY,
  DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY,
  getAvatarModelUrlFromModules,
  getConfiguredVrmAvatarModelKey,
  getVrmAvatarModelUrlFromModules,
} from "./AvatarModel";


describe("avatar model asset resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when no GLB model is bundled", () => {
    expect(getAvatarModelUrlFromModules({})).toBeNull();
  });

  it("resolves the preferred VitaKiosk GLB avatar path when it exists", () => {
    expect(
      getAvatarModelUrlFromModules({
        [DEFAULT_AVATAR_MODEL_MODULE_KEY]: "/assets/vitakiosk-avatar.glb",
      }),
    ).toBe("/assets/vitakiosk-avatar.glb");
  });

  it("falls back to the first bundled GLB when the preferred model is absent", () => {
    expect(
      getAvatarModelUrlFromModules({
        "../../assets/avatar/alternate-avatar.glb": "/assets/alternate-avatar.glb",
      }),
    ).toBe("/assets/alternate-avatar.glb");
  });

  it("resolves the preferred VitaKiosk VRM avatar path when it exists", () => {
    expect(
      getVrmAvatarModelUrlFromModules(
        {
          [DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY]: "/assets/vita.vrm",
        },
        "vita",
      ),
    ).toBe("/assets/vita.vrm");
  });

  it("returns null when no VRM model is bundled", () => {
    expect(getVrmAvatarModelUrlFromModules({})).toBeNull();
  });

  it("resolves the selected vita-new VRM model when VITE_VRM_MODEL is vita-new", () => {
    expect(
      getVrmAvatarModelUrlFromModules(
        {
          [DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY]: "/assets/vita.vrm",
          "../../assets/avatar/vita-new.vrm": "/assets/vita-new.vrm",
        },
        "vita-new",
      ),
    ).toBe("/assets/vita-new.vrm");
  });

  it("keeps vita as the selected VRM model when VITE_VRM_MODEL is vita", () => {
    expect(
      getVrmAvatarModelUrlFromModules(
        {
          [DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY]: "/assets/vita.vrm",
          "../../assets/avatar/vita-new.vrm": "/assets/vita-new.vrm",
        },
        "vita",
      ),
    ).toBe("/assets/vita.vrm");
  });

  it("normalizes unsupported VRM model config back to vita", () => {
    expect(getConfiguredVrmAvatarModelKey("external-avatar-service")).toBe("vita");
  });

  it("reads the Vite-exposed VITE_VRM_MODEL runtime config", () => {
    vi.stubEnv("VITE_VRM_MODEL", "vita-new");

    expect(getConfiguredVrmAvatarModelKey()).toBe("vita-new");
  });

  it("does not silently load the old VRM when vita-new is selected but missing", () => {
    expect(
      getVrmAvatarModelUrlFromModules(
        {
          [DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY]: "/assets/vita.vrm",
        },
        "vita-new",
      ),
    ).toBeNull();
  });

  it("keeps the tablet demo VRM below the reviewed 10 MB transfer budget", () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const modelPath = resolve(currentDir, "../../assets/avatar/vita-new.vrm");

    expect(statSync(modelPath).size).toBeLessThanOrEqual(10 * 1024 * 1024);
  });
});
