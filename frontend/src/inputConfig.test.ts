import { describe, expect, it } from "vitest";

import { getTypedInputConfig } from "./inputConfig";

describe("typed input config", () => {
  it("uses native device keyboard mode by default", () => {
    expect(getTypedInputConfig({}).mode).toBe("native");
  });

  it("keeps popup mode as an explicit opt-in", () => {
    expect(getTypedInputConfig({ VITE_TEXT_INPUT_MODE: "popup" }).mode).toBe("popup");
  });

  it("keeps the virtual keyboard backup in English QWERTY mode only", () => {
    expect(getTypedInputConfig({ VITE_KEYBOARD_DEFAULT_LANGUAGE: "zh" }).defaultLanguage).toBe(
      "en",
    );
    expect(getTypedInputConfig({ VITE_KEYBOARD_DEFAULT_LANGUAGE: "bm" }).defaultLanguage).toBe(
      "en",
    );
  });
});
