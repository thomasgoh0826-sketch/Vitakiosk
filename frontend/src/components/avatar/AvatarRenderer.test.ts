import { describe, expect, it } from "vitest";

import { getConfiguredAvatarRenderer, normalizeAvatarRenderer } from "./AvatarRenderer";


describe("avatar renderer config", () => {
  it("keeps Lottie as the default renderer", () => {
    expect(getConfiguredAvatarRenderer({})).toBe("lottie");
    expect(normalizeAvatarRenderer(undefined)).toBe("lottie");
    expect(normalizeAvatarRenderer("")).toBe("lottie");
  });

  it("enables Three.js only when the renderer config explicitly requests it", () => {
    expect(getConfiguredAvatarRenderer({ VITE_AVATAR_RENDERER: "threejs" })).toBe("threejs");
    expect(
      getConfiguredAvatarRenderer({
        AVATAR_RENDERER: "vrm",
        VITE_AVATAR_RENDERER: "threejs",
      }),
    ).toBe("threejs");
    expect(getConfiguredAvatarRenderer({ VITE_AVATAR_RENDERER: "lottie" })).toBe("lottie");
    expect(getConfiguredAvatarRenderer({ VITE_AVATAR_RENDERER: "unknown-live-avatar" })).toBe("lottie");
  });

  it("ignores the non-Vite AVATAR_RENDERER variable for browser runtime selection", () => {
    expect(getConfiguredAvatarRenderer({ AVATAR_RENDERER: "threejs" })).toBe("lottie");
    expect(getConfiguredAvatarRenderer({ AVATAR_RENDERER: "vrm" })).toBe("lottie");
  });

  it("enables the VRM renderer only when explicitly requested by VITE_AVATAR_RENDERER", () => {
    expect(normalizeAvatarRenderer("vrm")).toBe("vrm");
    expect(normalizeAvatarRenderer("VRM")).toBe("vrm");
    expect(getConfiguredAvatarRenderer({ VITE_AVATAR_RENDERER: "vrm" })).toBe("vrm");
  });
});
