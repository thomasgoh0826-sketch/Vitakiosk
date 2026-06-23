import { describe, expect, it } from "vitest";

import virtualKeyboardSource from "./components/VirtualKeyboard.tsx?raw";
import styles from "./styles.css?raw";

const normalizedStyles = styles.replace(/\r\n/g, "\n");
const normalizedVirtualKeyboardSource = virtualKeyboardSource.replace(/\r\n/g, "\n");

describe("typed input layout CSS contract", () => {
  it("does not shrink the whole kiosk behind a fixed canvas wrapper", () => {
    expect(normalizedStyles).not.toContain(".kiosk-viewport {");
    expect(normalizedStyles).not.toContain("width: min(100dvw, calc(100dvh");
    expect(normalizedStyles).not.toContain("height: min(100dvh, calc(100dvw");
    expect(normalizedStyles).not.toContain("aspect-ratio: 4 / 3");
  });

  it("keeps the normal typed input as a compact rail and protects shelf map height", () => {
    expect(normalizedStyles).toContain("--typed-input-rail-height: clamp(48px, 6dvh, 64px)");
    expect(normalizedStyles).toContain("minmax(160px, 0.88fr)");
    expect(normalizedStyles).toContain("var(--typed-input-rail-height)");
    expect(normalizedStyles).toContain(".typed-input-form {\n  display: flex;");
    expect(normalizedStyles).toContain("text-overflow: ellipsis");
    expect(normalizedStyles).toContain("flex: 0 0 52px");
    expect(normalizedStyles).toContain("min-width: 52px");
    expect(normalizedStyles).toContain("flex: 0 0 72px");
    expect(normalizedStyles).toContain("min-width: 72px");
  });

  it("keeps the focused typing screen as a viewport-level overlay", () => {
    expect(normalizedStyles).toContain(".typing-modal-backdrop {\n  position: fixed;");
    expect(normalizedStyles).toContain("z-index: 260");
    expect(normalizedStyles).toContain("place-items: center");
    expect(normalizedStyles).toContain(".virtual-keyboard {\n  position: relative;");
    expect(normalizedStyles).toContain("width: min(1120px, calc(100dvw - clamp(24px, 4dvw, 60px)))");
    expect(normalizedStyles).toContain("height: min(680px, calc(100dvh - clamp(24px, 4dvw, 60px)))");
  });

  it("reserves a real touch keyboard area inside the focused typing screen", () => {
    expect(normalizedStyles).toContain("minmax(192px, 0.9fr)");
    expect(normalizedStyles).toContain(".virtual-keyboard-layout {");
    expect(normalizedStyles).toContain("align-content: end");
    expect(normalizedStyles).toContain(".device-ime-panel {");
    expect(normalizedStyles).not.toContain(".pinyin-candidates {");
    expect(normalizedStyles).toContain(".keyboard-key-wide");
  });

  it("does not ship a custom Chinese pharmacy phrase dictionary in the keyboard", () => {
    expect(normalizedVirtualKeyboardSource).not.toContain("COMMON_ZH_CANDIDATES");
    expect(normalizedVirtualKeyboardSource).not.toContain("DEFAULT_ZH_CANDIDATES");
    expect(normalizedVirtualKeyboardSource).not.toContain("Insert candidate");
    expect(normalizedVirtualKeyboardSource).not.toContain("Demo Chinese candidates");
    expect(normalizedVirtualKeyboardSource).toContain("Use device Chinese keyboard / pinyin IME");
  });
});
