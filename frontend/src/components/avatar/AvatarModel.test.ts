import { describe, expect, it } from "vitest";

import {
  DEFAULT_AVATAR_MODEL_MODULE_KEY,
  DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY,
  getAvatarModelUrlFromModules,
  getVrmAvatarModelUrlFromModules,
} from "./AvatarModel";


describe("avatar model asset resolution", () => {
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
      getVrmAvatarModelUrlFromModules({
        [DEFAULT_VRM_AVATAR_MODEL_MODULE_KEY]: "/assets/vita.vrm",
      }),
    ).toBe("/assets/vita.vrm");
  });

  it("returns null when no VRM model is bundled", () => {
    expect(getVrmAvatarModelUrlFromModules({})).toBeNull();
  });
});
