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
    expect(normalizedStyles).toContain("--typed-input-rail-min-height: clamp(48px, 6dvh, 64px)");
    expect(normalizedStyles).toContain("minmax(160px, 0.88fr)");
    expect(normalizedStyles).toContain("minmax(var(--typed-input-rail-min-height), auto)");
    expect(normalizedStyles).toContain(".typed-input-panel {\n  position: relative;");
    expect(normalizedStyles).toContain("height: auto;");
    expect(normalizedStyles).toContain("overflow: visible;");
    expect(normalizedStyles).not.toContain("height: var(--typed-input-rail-height)");
    expect(normalizedStyles).not.toContain("max-height: var(--typed-input-rail-height)");
    expect(normalizedStyles).not.toContain("max-height: 64px");
    expect(normalizedStyles).toContain(".typed-input-form {\n  width: 100%;\n  display: grid;");
    expect(normalizedStyles).toContain("grid-template-areas: \"input keyboard clear send\"");
    expect(normalizedStyles).toContain("grid-area: input;");
    expect(normalizedStyles).toContain("grid-area: keyboard;");
    expect(normalizedStyles).toContain("grid-area: clear;");
    expect(normalizedStyles).toContain("grid-area: send;");
    expect(normalizedStyles).toContain("\"input input input\"");
    expect(normalizedStyles).toContain("\"keyboard clear send\"");
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
    expect(normalizedStyles).not.toContain(".language-switcher {");
    expect(normalizedStyles).not.toContain(".language-switcher-button");
    expect(normalizedStyles).not.toContain(".device-ime-panel {");
    expect(normalizedStyles).not.toContain(".pinyin-candidates {");
    expect(normalizedStyles).toContain(".keyboard-key-wide");
  });

  it("does not ship a custom Chinese pharmacy phrase dictionary in the keyboard", () => {
    expect(normalizedVirtualKeyboardSource).not.toContain("COMMON_ZH_CANDIDATES");
    expect(normalizedVirtualKeyboardSource).not.toContain("DEFAULT_ZH_CANDIDATES");
    expect(normalizedVirtualKeyboardSource).not.toContain("LanguageSwitcher");
    expect(normalizedVirtualKeyboardSource).not.toContain("Input language preference");
    expect(normalizedVirtualKeyboardSource).not.toContain("Insert candidate");
    expect(normalizedVirtualKeyboardSource).not.toContain("Demo Chinese candidates");
    expect(normalizedVirtualKeyboardSource).not.toContain("Chinese keyboard");
    expect(normalizedVirtualKeyboardSource).not.toContain("Chinese device keyboard guidance");
    expect(normalizedVirtualKeyboardSource).not.toContain("Chinese pinyin virtual keyboard");
    expect(normalizedVirtualKeyboardSource).not.toContain("Use device Chinese keyboard");
  });

  it("keeps dev diagnostics in reserved header flow instead of floating over subtitles", () => {
    expect(normalizedStyles).toMatch(/\.runtime-diagnostics\s*\{[\s\S]*position: relative;/);
    expect(normalizedStyles).not.toContain(".runtime-diagnostics {\n  position: fixed;");
    expect(normalizedStyles).toContain("grid-area: diagnostics;");
    expect(normalizedStyles).toMatch(/\.kiosk-header\s*\{[\s\S]*display: grid;/);
    expect(normalizedStyles).toContain("grid-template-areas: \"brand connection diagnostics\"");
  });

  it("protects measured subtitle-to-product spacing in landscape kiosk mode", () => {
    expect(normalizedStyles).toContain("--deck-card-gap: clamp(16px, 1.2dvw, 22px);");
    expect(normalizedStyles).toContain("minmax(clamp(108px, 14dvh, 158px), 0.34fr)");
    expect(normalizedStyles).toMatch(/\.clinical-deck\s*\{[\s\S]*gap: var\(--deck-card-gap\);/);
    expect(normalizedStyles).toMatch(
      /@media \(max-width: 1100px\) and \(orientation: landscape\)\s*\{[\s\S]*\.clinical-deck\s*\{[\s\S]*gap: var\(--deck-card-gap\);/,
    );
    expect(normalizedStyles).not.toMatch(/\.clinical-deck\s*\{[\s\S]*margin-top:\s*-/);
    expect(normalizedStyles).not.toMatch(/\.product-panel\s*\{[\s\S]*margin-top:\s*-/);
  });

  it("keeps the product source badge inside a normal product header row", () => {
    expect(normalizedStyles).toMatch(/\.product-panel \.panel-title-row\s*\{[\s\S]*display: flex;/);
    expect(normalizedStyles).toMatch(/\.product-panel \.panel-title-row\s*\{[\s\S]*justify-content: space-between;/);
    expect(normalizedStyles).toMatch(/\.product-panel \.source-label\s*\{[\s\S]*position: static;/);
    expect(normalizedStyles).toMatch(/\.product-panel \.source-label\s*\{[\s\S]*flex: 0 0 auto;/);
  });

  it("lets the Product panel grow instead of clipping fact cards", () => {
    expect(normalizedStyles).toContain("--product-panel-min-height: clamp(220px, 28dvh, 300px);");
    expect(normalizedStyles).toContain("minmax(var(--product-panel-min-height), 0.66fr)");
    expect(normalizedStyles).toMatch(/\.product-panel\s*\{[^}]*height: auto;[^}]*overflow: visible;/);
    expect(normalizedStyles).not.toMatch(/\.product-panel\s*\{[^}]*overflow: hidden;/);
    expect(normalizedStyles).toMatch(/\.product-panel::after\s*\{[^}]*bottom: auto;[^}]*width: min\(24%, 160px\);/);
    expect(normalizedStyles).toMatch(/\.product-facts\s*\{[^}]*grid-template-columns: repeat\(auto-fit,/);
    expect(normalizedStyles).toContain("@container (max-width: 380px)");
  });

  it("lets the Shelf Navigation panel reserve route-row space instead of clipping it", () => {
    expect(normalizedStyles).toContain("--shelf-panel-min-height: clamp(244px, 31dvh, 340px);");
    expect(normalizedStyles).toContain("minmax(var(--shelf-panel-min-height), 0.88fr)");
    expect(normalizedStyles).toMatch(/\.shelf-map-panel\s*\{[^}]*display: grid;[^}]*grid-template-rows: auto minmax\(112px, 1fr\) auto auto;[^}]*overflow: visible;/);
    expect(normalizedStyles).toMatch(/\.shelf-map-canvas\s*\{[^}]*height: auto;[^}]*min-height: 112px;/);
    expect(normalizedStyles).toMatch(/\.map-route-summary\s*\{[^}]*min-height: 18px;[^}]*line-height: 1\.35;/);
    expect(normalizedStyles).toContain("@container (max-width: 380px) {\n  .typed-input-form");
  });

  it("prevents product, poster, and leaflet artwork from clipping inner icons", () => {
    expect(normalizedStyles).toContain(".product-art {\n  position: relative;");
    expect(normalizedStyles).toContain("padding: 10px;");
    expect(normalizedStyles).toContain("overflow: visible;");
    expect(normalizedStyles).toContain("max-width: 70%;");
    expect(normalizedStyles).toContain("max-height: 70%;");
    expect(normalizedStyles).toContain("flex-shrink: 0;");
    expect(normalizedStyles).toContain(".poster-product-orb {\n  align-self: center;");
    expect(normalizedStyles).toContain(".leaflet-image-stage img,\n.leaflet-card img,\n.leaflet-modal-art img {\n  max-width: 100%;");
    expect(normalizedStyles).toContain("object-fit: contain;");
    expect(normalizedStyles).toContain(".leaflet-modal {\n  position: relative;");
    expect(normalizedStyles).toContain("padding: clamp(22px, 2.2dvw, 34px);");
    expect(normalizedStyles).toMatch(/\.leaflet-modal-close\s*\{[\s\S]*position: static;/);
  });
});
