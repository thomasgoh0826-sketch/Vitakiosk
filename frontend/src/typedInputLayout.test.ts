import { describe, expect, it } from "vitest";

import styles from "./styles.css?raw";

describe("typed input layout CSS contract", () => {
  it("keeps the normal typed input as a compact rail and protects shelf map height", () => {
    expect(styles).toContain("--typed-input-rail-height: clamp(52px, 7dvh, 72px)");
    expect(styles).toContain("minmax(160px, 0.88fr)");
    expect(styles).toContain("var(--typed-input-rail-height)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) auto");
  });

  it("keeps the focused typing screen as a viewport-level overlay", () => {
    expect(styles).toContain(".typing-modal-backdrop {\n  position: fixed;");
    expect(styles).toContain("z-index: 260");
    expect(styles).toContain("place-items: center");
    expect(styles).toContain(".virtual-keyboard {\n  position: relative;");
    expect(styles).toContain("width: min(1120px, calc(100dvw - clamp(24px, 4dvw, 60px)))");
    expect(styles).toContain("height: min(680px, calc(100dvh - clamp(24px, 4dvw, 60px)))");
  });

  it("reserves a real touch keyboard area inside the focused typing screen", () => {
    expect(styles).toContain("minmax(192px, 0.9fr)");
    expect(styles).toContain(".virtual-keyboard-layout {");
    expect(styles).toContain("align-content: end");
    expect(styles).toContain(".pinyin-panel {");
    expect(styles).toContain(".pinyin-candidates {");
    expect(styles).toContain(".keyboard-key-wide");
  });
});
