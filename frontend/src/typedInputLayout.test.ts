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
    expect(normalizedStyles).toContain('grid-template-areas:\n    "typing-header"\n    "typing-textarea"\n    "typing-guidance"\n    "typing-keyboard"\n    "typing-actions";');
    expect(normalizedStyles).toContain("grid-template-rows: auto minmax(160px, 1fr) auto minmax(192px, auto) auto;");
    expect(normalizedStyles).toContain(".virtual-keyboard-layout {");
    expect(normalizedStyles).toMatch(/\.virtual-keyboard-header\s*\{[\s\S]*grid-area: typing-header;/);
    expect(normalizedStyles).toMatch(/\.typing-modal-textarea\s*\{[\s\S]*grid-area: typing-textarea;/);
    expect(normalizedStyles).toMatch(/\.typing-modal-guidance\s*\{[\s\S]*grid-area: typing-guidance;/);
    expect(normalizedStyles).toMatch(/\.virtual-keyboard-layout\s*\{[\s\S]*grid-area: typing-keyboard;/);
    expect(normalizedStyles).toMatch(/\.keyboard-action-row\s*\{[\s\S]*grid-area: typing-actions;/);
    expect(normalizedStyles).toContain("align-content: center");
    expect(normalizedStyles).not.toContain(".language-switcher {");
    expect(normalizedStyles).not.toContain(".language-switcher-button");
    expect(normalizedStyles).not.toContain(".device-ime-panel {");
    expect(normalizedStyles).not.toContain(".pinyin-candidates {");
    expect(normalizedStyles).toContain(".keyboard-key-wide");
    expect(normalizedVirtualKeyboardSource).not.toContain("virtual-keyboard-note");
  });

  it("keeps typing modal helper, keyboard, and actions in normal flow without overlap hacks", () => {
    expect(normalizedStyles).not.toMatch(/\.typing-modal-guidance\s*\{[^}]*position:\s*absolute;/);
    expect(normalizedStyles).not.toMatch(/\.virtual-keyboard-layout\s*\{[^}]*position:\s*absolute;/);
    expect(normalizedStyles).not.toMatch(/\.keyboard-action-row\s*\{[^}]*position:\s*absolute;/);
    expect(normalizedStyles).not.toMatch(/\.typing-modal-guidance\s*\{[^}]*margin-top:\s*-/);
    expect(normalizedStyles).not.toMatch(/\.virtual-keyboard-layout\s*\{[^}]*margin-top:\s*-/);
    expect(normalizedStyles).not.toMatch(/\.keyboard-action-row\s*\{[^}]*margin-top:\s*-/);
    expect(normalizedStyles).toMatch(
      /@media \(max-width: 1100px\) and \(orientation: landscape\)\s*\{[\s\S]*\.virtual-keyboard\s*\{[\s\S]*grid-template-rows: auto minmax\(150px, 1fr\) auto minmax\(180px, auto\) auto;/,
    );
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

  it("adds subtle futuristic motion only through lightweight background and waveform CSS", () => {
    expect(normalizedStyles).toContain("@keyframes kiosk-background-drift");
    expect(normalizedStyles).toContain("@keyframes assistant-waveform-breathe");
    expect(normalizedStyles).toContain("@keyframes assistant-waveform-scan");
    expect(normalizedStyles).toContain("@keyframes assistant-state-sweep");
    expect(normalizedStyles).toContain(".assistant-waveform-listening");
    expect(normalizedStyles).toContain(".assistant-waveform-speaking");
    expect(normalizedStyles).toContain(".assistant-waveform-thinking");
    expect(normalizedStyles).toContain(".assistant-waveform-error");
    expect(normalizedStyles).toContain(".assistant-waveform-pharmacist_escalation");
    expect(normalizedStyles).toContain(".assistant-waveform-reduced-motion");
    expect(normalizedStyles).not.toContain("particle");
    expect(normalizedStyles).not.toContain("smoke");
    expect(normalizedStyles).not.toContain("fog");
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
    expect(normalizedStyles).toContain("--shelf-panel-min-height: clamp(292px, 36dvh, 420px);");
    expect(normalizedStyles).toContain("minmax(var(--shelf-panel-min-height), 0.88fr)");
    expect(normalizedStyles).toMatch(/\.shelf-map-panel\s*\{[^}]*display: grid;[^}]*grid-template-rows: auto minmax\(168px, 1fr\) auto auto;[^}]*overflow: visible;/);
    expect(normalizedStyles).toMatch(/\.shelf-map-canvas\s*\{[^}]*height: auto;[^}]*min-height: 168px;/);
    expect(normalizedStyles).toMatch(/\.map-route-summary\s*\{[^}]*min-height: 24px;[^}]*line-height: 1\.45;/);
    expect(normalizedStyles).toContain("@container (max-width: 380px) {\n  .typed-input-form");
  });

  it("keeps the enlarged leaflet viewer as a foreground overlay with metadata outside the hero card", () => {
    expect(normalizedStyles).toMatch(/\.leaflet-viewer-backdrop\s*\{[^}]*position: fixed;[^}]*z-index: 900;/);
    expect(normalizedStyles).toMatch(/\.leaflet-viewer-backdrop\s*\{[^}]*isolation: isolate;/);
    expect(normalizedStyles).toMatch(/\.leaflet-viewer-backdrop\[data-animation-state="opening"\] \.leaflet-floating-stage\s*\{[^}]*animation: leaflet-deck-expand-from-source/);
    expect(normalizedStyles).toMatch(/\.leaflet-viewer-backdrop\[data-animation-state="closing"\] \.leaflet-floating-stage\s*\{[^}]*animation: leaflet-deck-collapse-to-source/);
    expect(normalizedStyles).toContain("@keyframes leaflet-deck-expand-from-source");
    expect(normalizedStyles).toContain("@keyframes leaflet-deck-collapse-to-source");
    expect(normalizedStyles).toMatch(/\.leaflet-floating-stage\s*\{[^}]*display: grid;[^}]*grid-template-areas:\s*\n    "gallery copy";[^}]*overflow: visible;/);
    expect(normalizedStyles).toMatch(/\.leaflet-meta-panel\s*\{[^}]*grid-area: copy;[^}]*position: relative;/);
    expect(normalizedStyles).toMatch(/\.floating-leaflet-panel\s*\{[^}]*--leaflet-panel-padding: clamp\(8px, 1dvw, 14px\);[^}]*overflow: hidden;/);
    expect(normalizedStyles).toMatch(/\.floating-leaflet-panel img\s*\{[^}]*position: absolute;[^}]*inset: var\(--leaflet-panel-padding\);[^}]*object-fit: contain;/);
    expect(normalizedStyles).toMatch(/\.leaflet-stage-scene\s*\{[^}]*perspective: none;/);
    expect(normalizedStyles).toMatch(/\.leaflet-flat-deck-track\s*\{[^}]*position: absolute;[^}]*inset: 0;/);
    expect(normalizedStyles).not.toContain(".leaflet-depth-track");
    expect(normalizedStyles).toMatch(/\.floating-leaflet-panel\s*\{[^}]*width: min\(44%, 520px\);/);
    expect(normalizedStyles).not.toMatch(/\.floating-leaflet-panel\s*\{[^}]*perspective\(/);
    expect(normalizedStyles).not.toMatch(/\.floating-leaflet-panel\s*\{[^}]*translateZ/);
    expect(normalizedStyles).toMatch(/\.floating-leaflet-panel\s*\{[^}]*rotateY\(0deg\)/);
    expect(normalizedStyles).not.toMatch(/\.floating-leaflet-panel\.is-active\s*\{[^}]*perspective\(/);
    expect(normalizedStyles).not.toMatch(/\.floating-leaflet-panel\.is-active\s*\{[^}]*translateZ/);
    expect(normalizedStyles).not.toMatch(/\.floating-leaflet-panel\.is-active\s*\{[^}]*rotateY\((?!0deg)/);
    expect(normalizedStyles).toMatch(/\.floating-leaflet-panel\.is-neighbor\s*\{[^}]*opacity: var\(--leaflet-deck-opacity, 0\.72\);/);
    expect(normalizedStyles).toMatch(
      /@media \(max-width: 1120px\), \(max-height: 740px\)\s*\{[\s\S]*\.leaflet-floating-stage\s*\{[\s\S]*grid-template-areas:\s*\n      "gallery"\s*\n      "copy";/,
    );
    expect(normalizedStyles).toMatch(
      /@media \(max-width: 1120px\), \(max-height: 740px\)\s*\{[\s\S]*\.leaflet-stage-scene\s*\{[\s\S]*overflow: hidden;/,
    );
    expect(normalizedStyles).toMatch(
      /@media \(max-width: 1120px\), \(max-height: 740px\)\s*\{[\s\S]*\.leaflet-meta-panel\s*\{[\s\S]*align-self: stretch;[\s\S]*overflow: visible;/,
    );
  });

  it("uses top-level futuristic overlays and transform-only motion for shelf map enlargement", () => {
    expect(normalizedStyles).toMatch(/\.shelf-map-viewer-backdrop\s*\{[^}]*position: fixed;[^}]*z-index: 880;/);
    expect(normalizedStyles).toMatch(/\.shelf-map-viewer-backdrop\s*\{[^}]*place-items: center;/);
    expect(normalizedStyles).toMatch(/\.shelf-map-viewer-stage\s*\{[^}]*transform-origin: center;[^}]*animation: shelf-viewer-rise/);
    expect(normalizedStyles).toContain("@keyframes shelf-viewer-rise");
    expect(normalizedStyles).toMatch(/\.shelf-map-viewer-stage \.shelf-map-canvas\s*\{[^}]*min-height: clamp\(360px, 58dvh, 620px\);/);
    expect(normalizedStyles).not.toContain(".shelf-map-modal");
  });

  it("uses a holographic product transform instead of a cheap 180-degree flip", () => {
    expect(normalizedStyles).toMatch(/\.product-panel\s*\{[^}]*cursor: pointer;/);
    expect(normalizedStyles).toMatch(/\.product-transform-shell\s*\{[^}]*transform-style: preserve-3d;/);
    expect(normalizedStyles).toMatch(/\.product-panel\[data-product-mode="summary"\] \.product-transform-shell\s*\{[^}]*transform:/);
    expect(normalizedStyles).toContain(".product-summary-grid");
    expect(normalizedStyles).toContain(".product-summary-field");
    expect(normalizedStyles).not.toContain(".product-summary-back");
    expect(normalizedStyles).toMatch(/\.product-summary-grid\s*\{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 150px\), 1fr\)\);/);
    expect(normalizedStyles).toMatch(/\.product-summary-view\s*\{[^}]*overflow: visible;/);
    expect(normalizedStyles).toMatch(/\.product-viewer-backdrop\s*\{[^}]*position: fixed;[^}]*z-index: 890;/);
    expect(normalizedStyles).toMatch(/\.product-viewer-stage\s*\{[^}]*animation: product-viewer-lift/);
    expect(normalizedStyles).toContain("@keyframes product-viewer-lift");
    expect(normalizedStyles).toMatch(/\.product-viewer-summary-grid\s*\{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 180px\), 1fr\)\);/);
    expect(normalizedStyles).not.toContain("rotateY(180deg)");
  });

  it("keeps collapsed promotion leaflets fully contained while allowing side-by-side cards when there is room", () => {
    expect(normalizedStyles).toMatch(/\.promotion-panel\s*\{[\s\S]*container-type: size;/);
    expect(normalizedStyles).toMatch(/\.leaflet-display-grid\s*\{[\s\S]*display: grid;/);
    expect(normalizedStyles).toContain("grid-template-columns: minmax(0, 1fr);");
    expect(normalizedStyles).toMatch(/\.leaflet-display-grid \.leaflet-poster:nth-child\(n \+ 2\)\s*\{[\s\S]*display: none;/);
    expect(normalizedStyles).toMatch(/@container \(min-width: 400px\) and \(min-height: 310px\)\s*\{[\s\S]*\.leaflet-display-grid\s*\{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(normalizedStyles).toMatch(/@container \(min-width: 720px\) and \(min-height: 340px\)\s*\{[\s\S]*\.leaflet-display-grid\s*\{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
    expect(normalizedStyles).toMatch(/@container \(min-width: 400px\) and \(min-height: 310px\)\s*\{[\s\S]*\.leaflet-display-grid \.leaflet-poster:nth-child\(2\)\s*\{[\s\S]*display: grid;/);
    expect(normalizedStyles).toMatch(/@container \(min-width: 720px\) and \(min-height: 340px\)\s*\{[\s\S]*\.leaflet-display-grid \.leaflet-poster:nth-child\(3\)\s*\{[\s\S]*display: grid;/);
    expect(normalizedStyles).toMatch(/\.leaflet-display-grid \.leaflet-poster\s*\{[\s\S]*display: grid;/);
    expect(normalizedStyles).not.toMatch(/\.leaflet-display-grid \.leaflet-poster:nth-child\(4\)\s*\{[\s\S]*display: grid;/);
    expect(normalizedStyles).toMatch(/\.leaflet-display-grid \.leaflet-image-stage\s*\{[\s\S]*--leaflet-stage-padding: clamp\(8px, 1cqw, 14px\);[\s\S]*aspect-ratio: 3 \/ 4;[\s\S]*overflow: hidden;/);
    expect(normalizedStyles).toMatch(/\.leaflet-display-grid \.leaflet-image-stage img\s*\{[\s\S]*position: absolute;[\s\S]*inset: var\(--leaflet-stage-padding\);[\s\S]*object-fit: contain;/);
    expect(normalizedStyles).toMatch(/\.leaflet-poster\s*\{[\s\S]*grid-template-rows: minmax\(0, 1fr\);/);
    expect(normalizedStyles).toMatch(/\.leaflet-poster \.poster-copy,\s*\.leaflet-poster \.poster-meta,\s*\.leaflet-poster \.poster-topline\s*\{[\s\S]*display: none;/);
  });

  it("prevents product, poster, and leaflet artwork from clipping inner icons", () => {
    expect(normalizedStyles).toContain(".product-art {\n  position: relative;");
    expect(normalizedStyles).toContain("padding: 10px;");
    expect(normalizedStyles).toContain("overflow: visible;");
    expect(normalizedStyles).toContain("max-width: 70%;");
    expect(normalizedStyles).toContain("max-height: 70%;");
    expect(normalizedStyles).toContain("flex-shrink: 0;");
    expect(normalizedStyles).toContain(".poster-product-orb {\n  align-self: center;");
    expect(normalizedStyles).toContain(".leaflet-image-stage img,\n.leaflet-card img,\n.floating-leaflet-panel img {\n  max-width: 100%;");
    expect(normalizedStyles).toContain("object-fit: contain;");
    expect(normalizedStyles).toContain(".leaflet-floating-stage {\n  position: relative;");
    expect(normalizedStyles).toContain("background: transparent;");
    expect(normalizedStyles).toContain("box-shadow: none;");
    expect(normalizedStyles).not.toContain(".leaflet-modal {\n");
    expect(normalizedStyles).not.toContain(".leaflet-modal-header");
    expect(normalizedStyles).not.toContain(".leaflet-stage-header");
    expect(normalizedStyles).toContain(".leaflet-stage-scene {\n  position: relative;");
    expect(normalizedStyles).not.toContain(".leaflet-gallery-viewport {");
    expect(normalizedStyles).not.toContain(".leaflet-gallery-shell {");
    expect(normalizedStyles).not.toContain(".leaflet-modal-close {");
  });
});
