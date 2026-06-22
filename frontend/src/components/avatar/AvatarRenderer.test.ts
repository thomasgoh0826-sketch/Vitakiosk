import { describe, expect, it } from "vitest";

import { getConfiguredAvatarRenderer, normalizeAvatarRenderer } from "./AvatarRenderer";


describe("avatar renderer config", () => {
  it("keeps Lottie as the default renderer", () => {
    expect(getConfiguredAvatarRenderer({})).toBe("lottie");
    expect(normalizeAvatarRenderer(undefined)).toBe("lottie");
    expect(normalizeAvatarRenderer("")).toBe("lottie");
  });

  it("enables Three.js only when the renderer config explicitly requests it", () => {
    expect(getConfiguredAvatarRenderer({ AVATAR_RENDERER: "threejs" })).toBe("threejs");
    expect(getConfiguredAvatarRenderer({ AVATAR_RENDERER: "THREEJS" })).toBe("threejs");
    expect(getConfiguredAvatarRenderer({ VITE_AVATAR_RENDERER: "threejs" })).toBe("threejs");
    expect(
      getConfiguredAvatarRenderer({
        AVATAR_RENDERER: "",
        VITE_AVATAR_RENDERER: "threejs",
      }),
    ).toBe("threejs");
    expect(getConfiguredAvatarRenderer({ AVATAR_RENDERER: "lottie" })).toBe("lottie");
    expect(getConfiguredAvatarRenderer({ AVATAR_RENDERER: "unknown-live-avatar" })).toBe("lottie");
  });

  it("enables the VRM renderer only when explicitly requested by Vite runtime config", () => {
    expect(normalizeAvatarRenderer("vrm")).toBe("vrm");
    expect(normalizeAvatarRenderer("VRM")).toBe("vrm");
    expect(getConfiguredAvatarRenderer({ VITE_AVATAR_RENDERER: "vrm" })).toBe("vrm");
    expect(getConfiguredAvatarRenderer({ AVATAR_RENDERER: "vrm" })).toBe("vrm");
  });
});
