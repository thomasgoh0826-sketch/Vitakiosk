# Dark Neon Cinematic Kiosk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing VitaKiosk React frontend into the approved 1024 × 768 Cinematic AI Bay design with a primary tap-to-speak interaction while preserving all backend, API, mock-data, WebSocket, safety, adapter, and existing test contracts.

**Architecture:** Keep `App.tsx` as the orchestration boundary and keep the current `useVoiceInteraction` and `useKioskSocket` hooks unchanged. Add one presentation-only tap control, reshape the existing focused panel components, and implement the visual system in `styles.css`; all displayed business values continue to come from the existing product, promotion, poster, and escalation objects.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, Lottie light player, CSS Grid, CSS custom properties.

---

## File Structure

### Create

- `frontend/src/components/TapToSpeakButton.tsx` — primary click/tap voice control driven by the existing `AvatarState`.
- `reports/evidence/dark-neon-kiosk-ipad-landscape.png` — target viewport acceptance screenshot.

### Modify

- `frontend/src/App.tsx` — approved three-zone layout and state-to-presentation wiring.
- `frontend/src/components/AvatarAssistant.tsx` — cinematic assistant stage, status, and waveform semantics.
- `frontend/src/components/avatar/LottieAvatarRenderer.tsx` — abstract holographic renderer shell while preserving the renderer contract.
- `frontend/src/components/ProductCard.tsx` — premium product presentation using only current VitaFlow/mock fields.
- `frontend/src/components/PromotionPoster.tsx` — poster-format active branch promotion display.
- `frontend/src/components/ErpDataPanel.tsx` — compact floating provenance panel.
- `frontend/src/components/PharmacistEscalationPanel.tsx` — explicit AI safety boundary and assistance control.
- `frontend/src/styles.css` — dark neon visual system, glass panels, responsive single-screen layout, and component styling.
- `spec/03-kiosk-layout-spec.md` — dark cinematic layout and tap interaction acceptance.
- `spec/04-ai-avatar-spec.md` — holographic avatar visual and state requirements.
- `spec/13-acceptance-standard.md` — screenshot and target viewport requirements.
- `reports/test-evidence.md` — commands and actual browser evidence.

### Preserve unchanged

- `backend/**`
- `services/**`
- `frontend/src/api/**`
- `frontend/src/hooks/**`
- `frontend/src/types.ts`
- `frontend/src/components/HoldToSpeakButton.tsx`
- `frontend/src/**/*.test.ts`
- `frontend/src/**/*.test.tsx`
- Existing mock values and all live-provider adapter boundaries.

The current voice hook does not expose audio-level silence detection. Because this approved task forbids hook and behavior changes, the implemented stop path is the explicit second tap. Browser evidence must not claim automatic silence detection; that behavior requires a separate, explicitly approved voice-orchestration task.

---

### Task 1: Add the Primary Tap-to-Speak Control

**Files:**
- Create: `frontend/src/components/TapToSpeakButton.tsx`
- Modify: `frontend/src/App.tsx`
- Preserve: `frontend/src/components/HoldToSpeakButton.tsx`
- Regression tests: `frontend/src/App.test.tsx`
- Regression tests: `frontend/src/App.integration.test.tsx`
- Regression tests: `frontend/src/components/HoldToSpeakButton.test.tsx`

- [ ] **Step 1: Record the existing test baseline**

Run:

```powershell
npm.cmd run test:run --prefix frontend -- src/App.test.tsx src/App.integration.test.tsx src/components/HoldToSpeakButton.test.tsx
```

Expected: all selected existing tests pass before the change.

- [ ] **Step 2: Create the state-driven primary control**

Create `frontend/src/components/TapToSpeakButton.tsx` with this implementation:

```tsx
import type { AvatarState } from "../types";

interface TapToSpeakButtonProps {
  state: AvatarState;
  onStart: () => void;
  onStop: () => void;
}

const LABELS: Record<AvatarState, string> = {
  idle: "Tap to Speak",
  listening: "Tap to Stop",
  thinking: "Thinking…",
  speaking: "Speaking…",
  error: "Try Again",
  pharmacist_escalation: "Pharmacist Requested",
};

function TapToSpeakButton({
  state,
  onStart,
  onStop,
}: TapToSpeakButtonProps) {
  const listening = state === "listening";
  const disabled = ["thinking", "speaking", "pharmacist_escalation"].includes(state);

  return (
    <button
      className={`tap-speak-button tap-speak-${state}`}
      type="button"
      aria-label={LABELS[state]}
      aria-pressed={listening}
      disabled={disabled}
      onClick={listening ? onStop : onStart}
    >
      <span className="tap-speak-orbit" aria-hidden="true">
        <span className="tap-speak-mic" />
      </span>
      <span>
        <strong>{LABELS[state]}</strong>
        <small>{listening ? "Listening securely on this kiosk" : "Voice assistance"}</small>
      </span>
    </button>
  );
}

export default TapToSpeakButton;
```

- [ ] **Step 3: Wire the tap control without changing voice orchestration**

In `frontend/src/App.tsx`:

```tsx
import TapToSpeakButton from "./components/TapToSpeakButton";
```

Replace the main voice control area with:

```tsx
<section className="speak-region" aria-label="Voice assistant controls">
  <TapToSpeakButton
    state={avatarState}
    onStart={() => void voice.startRecording()}
    onStop={() => void voice.stopRecording()}
  />
  <small className="voice-feedback" aria-live="polite">
    {voice.error ?? voice.responseText ?? "Tap once to begin"}
  </small>
  <div className="hold-fallback" aria-label="Hold to Speak fallback">
    <span>Press-and-hold fallback</span>
    <HoldToSpeakButton
      onStart={() => void voice.startRecording()}
      onStop={() => void voice.stopRecording()}
      disabled={holdDisabled}
    />
  </div>
</section>
```

Do not add state to the component and do not edit `useVoiceInteraction.ts`.

- [ ] **Step 4: Run focused regressions and the TypeScript build**

Run:

```powershell
npm.cmd run test:run --prefix frontend -- src/App.test.tsx src/App.integration.test.tsx src/components/HoldToSpeakButton.test.tsx
npm.cmd run build --prefix frontend
```

Expected: all selected tests pass; TypeScript and Vite production build complete successfully.

- [ ] **Step 5: Stage only Task 1 files and run safety checks**

Run:

```powershell
git add -- frontend/src/components/TapToSpeakButton.tsx frontend/src/App.tsx
node scripts/check-staged-files.mjs
git diff --cached --check
git diff --cached --name-only
```

Expected: staged safety passes; no whitespace errors; only the two Task 1 files are staged.

- [ ] **Step 6: Commit Task 1**

Run:

```powershell
git commit -m "feat: add tap-to-speak kiosk control"
```

Expected: commit succeeds.

---

### Task 2: Rebuild the Assistant as a Cinematic AI Bay

**Files:**
- Modify: `frontend/src/components/AvatarAssistant.tsx`
- Modify: `frontend/src/components/avatar/LottieAvatarRenderer.tsx`
- Regression tests: `frontend/src/components/AvatarAssistant.test.tsx`
- Regression tests: `frontend/src/hooks/useAudioActivity.test.ts`

- [ ] **Step 1: Run the avatar contract tests before editing**

Run:

```powershell
npm.cmd run test:run --prefix frontend -- src/components/AvatarAssistant.test.tsx src/hooks/useAudioActivity.test.ts
```

Expected: avatar states and audio activity tests pass.

- [ ] **Step 2: Replace the simple facial overlay with a holographic core**

Keep the existing Lottie setup and renderer props in `LottieAvatarRenderer.tsx`, but replace its returned markup with:

```tsx
return (
  <div
    className={`lottie-avatar avatar-render-${state}`}
    style={style}
    data-state={state}
  >
    <div className="avatar-lottie-layer" ref={animationContainer} aria-hidden="true" />
    <div className="avatar-holo-rings" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
    <div className="avatar-holo-core" aria-hidden="true">
      <span className="avatar-visor" />
      <span className="avatar-voice-aperture" />
    </div>
    <div className="avatar-scan-line" aria-hidden="true" />
  </div>
);
```

Retain:

```tsx
const activity = Math.min(1, Math.max(0, audioActivity));
const mouthScale = state === "speaking" ? 0.35 + activity * 1.65 : 0.35;
const style = { "--mouth-scale": mouthScale } as CSSProperties;
```

This keeps speaking movement clamped and renderer-adapter compatibility intact.

- [ ] **Step 3: Reshape the assistant stage while preserving accessible labels**

Replace the `AvatarAssistant` markup with:

```tsx
return (
  <section className={`assistant-stage assistant-${state}`} aria-label="AI assistant">
    <div className="assistant-stage-header">
      <div>
        <span className="eyebrow">VitaKiosk Labs</span>
        <h1>AI Pharmacy Assistant</h1>
      </div>
      <span className={`assistant-link-state${connected ? " is-connected" : ""}`}>
        {connected ? "Realtime connected" : "Local state mode"}
      </span>
    </div>

    <div className="avatar-bay">
      <span className="avatar-bay-label avatar-bay-label-left" aria-hidden="true">
        SAFE AI
      </span>
      <LottieAvatarRenderer state={state} audioActivity={audioActivity} />
      <span className="avatar-bay-label avatar-bay-label-right" aria-hidden="true">
        MOCK 01
      </span>
    </div>

    <div className="assistant-waveform" aria-hidden="true">
      {Array.from({ length: 25 }, (_, index) => {
        const base = 8 + (index % 7) * 4;
        const energized = ["listening", "speaking"].includes(state);
        const height = energized ? base + audioActivity * 30 : base;
        return <span key={index} style={{ height: `${height}px` }} />;
      })}
    </div>

    <p
      className="avatar-state-label"
      role={state === "pharmacist_escalation" ? "alert" : "status"}
    >
      <span aria-hidden="true" />
      {stateLabel}
    </p>
    <small className="assistant-safety-copy">
      Information support only · A pharmacist remains available
    </small>
  </section>
);
```

Keep `STATE_LABELS` unchanged so all existing state tests retain their exact text.

- [ ] **Step 4: Run focused avatar tests and build**

Run:

```powershell
npm.cmd run test:run --prefix frontend -- src/components/AvatarAssistant.test.tsx src/hooks/useAudioActivity.test.ts
npm.cmd run build --prefix frontend
```

Expected: selected tests pass and production build succeeds.

- [ ] **Step 5: Stage, inspect, and safety-check Task 2**

Run:

```powershell
git add -- frontend/src/components/AvatarAssistant.tsx frontend/src/components/avatar/LottieAvatarRenderer.tsx
node scripts/check-staged-files.mjs
git diff --cached --check
git diff --cached --name-only
```

Expected: safety passes and exactly the two avatar files are staged.

- [ ] **Step 6: Commit Task 2**

Run:

```powershell
git commit -m "style: create cinematic AI assistant bay"
```

Expected: commit succeeds.

---

### Task 3: Reshape Product, Promotion, ERP, and Safety Panels

**Files:**
- Modify: `frontend/src/components/ProductCard.tsx`
- Modify: `frontend/src/components/PromotionPoster.tsx`
- Modify: `frontend/src/components/ErpDataPanel.tsx`
- Modify: `frontend/src/components/PharmacistEscalationPanel.tsx`
- Regression tests: `frontend/src/App.test.tsx`
- Regression tests: `frontend/src/App.integration.test.tsx`

- [ ] **Step 1: Run current panel integration tests**

Run:

```powershell
npm.cmd run test:run --prefix frontend -- src/App.test.tsx src/App.integration.test.tsx
```

Expected: required regions, mock provenance, product values, purchasing query, and escalation tests pass.

- [ ] **Step 2: Recompose ProductCard using only existing fields**

Keep the existing props and `displayValue` helper. Use this product branch:

```tsx
{product ? (
  <>
    <div className="product-hero">
      <div className="product-art" aria-hidden="true">
        <span>{product.name.slice(0, 2).toUpperCase()}</span>
      </div>
      <div className="product-identity">
        <span className="eyebrow">Product verified</span>
        <h3>{product.name}</h3>
        <p>{product.id}</p>
        <strong>{product.price === null ? "Unavailable" : `$${product.price.toFixed(2)}`}</strong>
        <small>Current VitaFlow product price</small>
      </div>
    </div>
    <dl className="product-facts">
      <div><dt>Stock</dt><dd>{displayValue(product.stock, product.unavailable_reason)}</dd></div>
      <div><dt>Branch</dt><dd>{product.branch_id}</dd></div>
      <div><dt>Shelf</dt><dd>{displayValue(product.shelf_location, product.unavailable_reason)}</dd></div>
      <div><dt>Source</dt><dd>Mock VitaFlow</dd></div>
    </dl>
  </>
) : (
  <div className="empty-product" role="status">
    <span className="empty-product-orbit" aria-hidden="true" />
    <h3>{purchasingQueryId ? "Product not found" : "Ready for product search"}</h3>
    <p>
      {purchasingQueryId
        ? `Purchasing query ${purchasingQueryId} created. No product details were guessed.`
        : "Tap to Speak and ask for a product."}
    </p>
  </div>
)}
```

Keep the region label `Product` and the visible `Mock VitaFlow` source badge.

- [ ] **Step 3: Render promotions as a real branch-aware poster**

In `PromotionPoster.tsx`, derive:

```tsx
const title = promotion?.title ?? poster?.title ?? "No active promotion";
const validity = promotion
  ? `${new Date(promotion.valid_from).toLocaleDateString("en-SG")} — ${new Date(
      promotion.valid_to,
    ).toLocaleDateString("en-SG")}`
  : null;
```

Use:

```tsx
<section className="panel promotion-panel" aria-label="Promotion">
  <div className="poster-frame">
    <div className="poster-grid" aria-hidden="true" />
    <div className="poster-topline">
      <span>VitaFlow active offer</span>
      <strong>{promotion?.active ? "LIVE" : "IDLE"}</strong>
    </div>
    <div className="poster-product-orb" aria-hidden="true">
      <span>VK</span>
    </div>
    <div className="poster-copy">
      <span className="eyebrow">Branch-aware promotion</span>
      <h2>{title}</h2>
      <p>
        {promotion
          ? `Active for ${promotion.branch_id}`
          : "No active branch promotion is available."}
      </p>
    </div>
    <dl className="poster-meta">
      <div><dt>Branch</dt><dd>{promotion?.branch_id ?? poster?.branch_id ?? "Unavailable"}</dd></div>
      <div><dt>Validity</dt><dd>{validity ?? "No active period"}</dd></div>
    </dl>
    <small>Fictional mock promotion · No medical claim</small>
  </div>
</section>
```

Do not calculate or display a discount or promotional price because the current promotion type does not supply one.

- [ ] **Step 4: Make ERP provenance compact and explicit**

Use this content inside the existing `ERP data` region:

```tsx
<div className="erp-heading">
  <div>
    <span className="eyebrow">System provenance</span>
    <h2>VitaFlow ERP</h2>
  </div>
  <span className={`erp-connection${connected ? " is-connected" : ""}`}>
    {connected ? "Online" : "Local"}
  </span>
</div>
<dl>
  <div><dt>Source</dt><dd>Mock VitaFlow</dd></div>
  <div><dt>Branch</dt><dd>{product?.branch_id ?? "SG-001"}</dd></div>
  <div><dt>Mode</dt><dd>Mock mode</dd></div>
  <div><dt>Data</dt><dd>Fictional demo data</dd></div>
</dl>
<p>No customer data</p>
```

- [ ] **Step 5: Turn pharmacist assistance into a safety panel**

Use this content while retaining the current props and `onRequest` handler:

```tsx
<div className="pharmacist-icon" aria-hidden="true">
  <span />
</div>
<div className="pharmacist-copy">
  <span className="eyebrow">{active ? "Safety escalation active" : "Clinical safety"}</span>
  <h2>{active ? "Safety handoff active" : "Pharmacist assistance"}</h2>
  <p role={active ? "alert" : undefined}>
    {active
      ? `A pharmacist has been requested${escalationId ? ` · ${escalationId}` : ""}.`
      : "AI does not diagnose or replace a pharmacist. Request in-store help at any time."}
  </p>
</div>
<button type="button" onClick={onRequest}>
  <span aria-hidden="true">+</span>
  Request assistance
</button>
<span className="pharmacist-availability">{active ? "Escalated" : "Available"}</span>
```

Keep the section accessible name `Pharmacist assistance`.

- [ ] **Step 6: Run panel regressions and build**

Run:

```powershell
npm.cmd run test:run --prefix frontend -- src/App.test.tsx src/App.integration.test.tsx
npm.cmd run build --prefix frontend
```

Expected: all panel integration tests pass and the build succeeds.

- [ ] **Step 7: Stage, inspect, and safety-check Task 3**

Run:

```powershell
git add -- frontend/src/components/ProductCard.tsx frontend/src/components/PromotionPoster.tsx frontend/src/components/ErpDataPanel.tsx frontend/src/components/PharmacistEscalationPanel.tsx
node scripts/check-staged-files.mjs
git diff --cached --check
git diff --cached --name-only
```

Expected: safety passes and only the four panel components are staged.

- [ ] **Step 8: Commit Task 3**

Run:

```powershell
git commit -m "style: reshape kiosk retail and safety panels"
```

Expected: commit succeeds.

---

### Task 4: Build the Three-Zone Dark Neon Single-Screen Layout

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`
- Visual regression surface: `frontend/src/components/ShelfMap.tsx` remains unchanged
- Regression tests: all `frontend/src/**/*.test.ts` and `frontend/src/**/*.test.tsx`

- [ ] **Step 1: Run the complete frontend suite before layout changes**

Run:

```powershell
npm.cmd run test:run --prefix frontend
```

Expected: all existing tests pass.

- [ ] **Step 2: Reorganize App into the approved zones**

Retain all state, data selection, `requestAssistance`, and API calls at the top of `App`. Replace the returned structure with:

```tsx
return (
  <div className={`kiosk-shell kiosk-state-${avatarState}`}>
    <div className="kiosk-ambient-grid" aria-hidden="true" />
    <header className="kiosk-header">
      <div className="wordmark" aria-label="VitaKiosk Labs">
        <span className="wordmark-mark" aria-hidden="true">V</span>
        <span>VitaKiosk <strong>Labs</strong></span>
      </div>
      <div className="connection-line" aria-label="Kiosk connection status">
        <span className="status-dot" aria-hidden="true" />
        {connectionCopy} · Mock mode · No customer data
      </div>
    </header>

    <main className="kiosk-layout">
      <aside className="assistant-column">
        <AvatarAssistant
          state={avatarState}
          audioActivity={voice.audioActivity}
          connected={socket.connected}
        />
        <section className="speak-region" aria-label="Voice assistant controls">
          <TapToSpeakButton
            state={avatarState}
            onStart={() => void voice.startRecording()}
            onStop={() => void voice.stopRecording()}
          />
          <small className="voice-feedback" aria-live="polite">
            {voice.error ?? voice.responseText ?? "Tap once to begin"}
          </small>
          <div className="hold-fallback" aria-label="Hold to Speak fallback">
            <span>Press-and-hold fallback</span>
            <HoldToSpeakButton
              onStart={() => void voice.startRecording()}
              onStop={() => void voice.stopRecording()}
              disabled={holdDisabled}
            />
          </div>
        </section>
      </aside>

      <section className="clinical-deck" aria-label="AI conversation and product">
        <div className="conversation-panel panel">
          <div className="conversation-bubble customer-question">
            <span>You</span>
            <p>{voice.hasResult ? "Voice request received" : "What can I help you find today?"}</p>
          </div>
          <div className="conversation-bubble ai-answer">
            <span>VitaKiosk AI</span>
            <p>{voice.responseText || "Tap to Speak to ask about a product, price, stock, promotion, or shelf location."}</p>
          </div>
        </div>
        <ProductCard product={product} purchasingQueryId={voice.purchasingQueryId} />
        <ShelfMap product={product} />
      </section>

      <aside className="retail-safety-rail">
        <PromotionPoster promotion={promotions[0] ?? null} poster={voice.poster} />
        <ErpDataPanel product={product} connected={socket.connected} />
        <PharmacistEscalationPanel
          active={avatarState === "pharmacist_escalation"}
          escalationId={manualEscalationId ?? voice.escalationId}
          onRequest={requestAssistance}
        />
      </aside>
    </main>

    <footer className="kiosk-footer">
      <span><i className="status-dot" aria-hidden="true" /> {connectionCopy}</span>
      <span>VitaFlow ERP is the source of truth · Mock-first demo</span>
    </footer>
  </div>
);
```

This markup retains all seven region names required by the current tests. The fallback region continues to match `/Hold to Speak/i`.

- [ ] **Step 3: Replace the light stylesheet with the dark neon token system**

At the top of `frontend/src/styles.css`, define:

```css
:root {
  color: #f5fbff;
  background: #02050d;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --bg-main: #02050d;
  --panel-glass: rgba(9, 18, 36, 0.78);
  --neon-cyan: #42f5ff;
  --neon-purple: #9b6cff;
  --text-primary: #f5fbff;
  --text-muted: #8fa5bd;
  --danger-red: #ff536d;
  --success-green: #54e38e;
  --panel-line: rgba(96, 225, 255, 0.24);
  --deep-panel: rgba(5, 11, 24, 0.94);
}
```

The complete stylesheet must implement:

- Near-black layered body background with cyan/purple radial glow.
- Fixed 100dvh `.kiosk-shell` at landscape widths.
- Subtle non-interactive `.kiosk-ambient-grid`.
- Three-column `.kiosk-layout` sized approximately `29% 46% 25%`.
- Glass panels using `backdrop-filter`, luminous borders, and dark translucent fills.
- Large avatar bay with holographic rings and scan line.
- Audio-reactive waveform and state-specific colors.
- Primary tap button with cyan/purple circular microphone orbit.
- Secondary fallback reduced to a small, low-emphasis control.
- Center conversation bubbles, product hero, and compact product facts.
- Tall neon-framed poster with abstract product orb.
- Existing ShelfMap selectors retained and darkened consistently.
- Floating ERP panel and red/cyan pharmacist safety panel.
- Visible keyboard focus.
- At least 44px primary interactive targets.

Do not use a plain white background anywhere in the main layout.

Use these structural rules as the base, then tune only numeric spacing and sizing during viewport inspection:

```css
* { box-sizing: border-box; }

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  color: var(--text-primary);
  background:
    radial-gradient(circle at 12% 22%, rgba(48, 225, 255, 0.12), transparent 28%),
    radial-gradient(circle at 86% 18%, rgba(139, 87, 255, 0.16), transparent 31%),
    linear-gradient(145deg, #02050d 0%, #050916 52%, #030611 100%);
}

button {
  min-height: 44px;
  font: inherit;
}

button:focus-visible {
  outline: 2px solid var(--neon-cyan);
  outline-offset: 3px;
  box-shadow: 0 0 20px rgba(66, 245, 255, 0.42);
}

.kiosk-shell {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
  padding: 12px 14px 10px;
  overflow: hidden;
}

.kiosk-ambient-grid {
  position: fixed;
  z-index: -1;
  inset: 0;
  opacity: 0.14;
  background-image:
    linear-gradient(rgba(66, 245, 255, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(66, 245, 255, 0.12) 1px, transparent 1px);
  background-size: 44px 44px;
  pointer-events: none;
}

.kiosk-layout {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(250px, 29fr) minmax(390px, 46fr) minmax(220px, 25fr);
  gap: 10px;
}

.assistant-column,
.clinical-deck,
.retail-safety-rail {
  min-height: 0;
  display: grid;
  gap: 10px;
}

.assistant-column { grid-template-rows: minmax(0, 1fr) auto; }
.clinical-deck { grid-template-rows: auto minmax(0, 0.9fr) minmax(0, 1.1fr); }
.retail-safety-rail { grid-template-rows: minmax(0, 1.35fr) auto minmax(0, 0.68fr); }

.panel,
.assistant-stage,
.speak-region {
  min-width: 0;
  border: 1px solid var(--panel-line);
  border-radius: 18px;
  background: var(--panel-glass);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 16px 36px rgba(0, 0, 0, 0.28),
    0 0 24px rgba(58, 222, 255, 0.05);
  backdrop-filter: blur(18px);
}

.assistant-stage {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto auto;
  align-items: center;
  padding: 14px;
  overflow: hidden;
}

.avatar-bay {
  position: relative;
  min-height: 0;
  display: grid;
  place-items: center;
}

.lottie-avatar {
  position: relative;
  width: min(88%, 260px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid rgba(66, 245, 255, 0.42);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(87, 107, 255, 0.2), rgba(5, 11, 26, 0.96) 68%);
  box-shadow:
    inset 0 0 42px rgba(66, 245, 255, 0.12),
    0 0 34px rgba(155, 108, 255, 0.25);
}

.avatar-holo-core {
  position: absolute;
  width: 42%;
  aspect-ratio: 0.82;
  border: 1px solid rgba(112, 247, 255, 0.74);
  border-radius: 48% 48% 40% 40%;
  background: linear-gradient(180deg, rgba(79, 244, 255, 0.18), rgba(145, 86, 255, 0.28));
  box-shadow: 0 0 26px rgba(66, 245, 255, 0.32);
}

.avatar-voice-aperture {
  position: absolute;
  left: 36%;
  bottom: 22%;
  width: 28%;
  height: 4px;
  border-radius: 999px;
  background: var(--neon-cyan);
  transform: scaleY(var(--mouth-scale));
  box-shadow: 0 0 12px var(--neon-cyan);
}

.tap-speak-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(66, 245, 255, 0.72);
  border-radius: 16px;
  color: var(--text-primary);
  background: linear-gradient(135deg, rgba(17, 43, 72, 0.92), rgba(30, 17, 70, 0.9));
  box-shadow: 0 0 24px rgba(66, 245, 255, 0.15);
  cursor: pointer;
}

.tap-speak-button strong,
.tap-speak-button small { display: block; }

.tap-speak-orbit {
  width: 46px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid var(--neon-purple);
  border-radius: 50%;
  box-shadow: 0 0 18px rgba(155, 108, 255, 0.46);
}

.hold-fallback {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 0.62rem;
}

.hold-fallback .hold-button {
  width: auto;
  min-height: 32px;
  padding: 5px 9px;
  border: 1px solid rgba(143, 165, 189, 0.28);
  border-radius: 8px;
  color: var(--text-muted);
  background: rgba(6, 13, 27, 0.72);
  font-size: 0.58rem;
}

.poster-frame {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px;
  overflow: hidden;
  border: 1px solid rgba(155, 108, 255, 0.64);
  border-radius: 15px;
  background:
    radial-gradient(circle at 50% 36%, rgba(155, 108, 255, 0.28), transparent 34%),
    linear-gradient(160deg, rgba(12, 26, 51, 0.98), rgba(26, 10, 53, 0.96));
  box-shadow:
    inset 0 0 34px rgba(155, 108, 255, 0.1),
    0 0 22px rgba(155, 108, 255, 0.15);
}

.pharmacist-panel-active {
  border-color: rgba(255, 83, 109, 0.72);
  box-shadow:
    inset 0 0 24px rgba(255, 83, 109, 0.08),
    0 0 22px rgba(255, 83, 109, 0.16);
}
```

- [ ] **Step 4: Add exact single-screen and responsive constraints**

Include:

```css
@media (min-width: 851px) and (orientation: landscape) {
  html,
  body,
  #root {
    height: 100%;
    overflow: hidden;
  }

  .kiosk-shell {
    height: 100dvh;
    min-height: 0;
  }
}

@media (max-width: 850px), (orientation: portrait) {
  body {
    overflow-x: hidden;
  }

  .kiosk-shell {
    min-height: 100dvh;
  }

  .kiosk-layout {
    grid-template-columns: 1fr;
  }

  .clinical-deck,
  .retail-safety-rail {
    grid-template-rows: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

At 1024 × 768, tune paddings, gaps, font sizes, and map height until the document has no vertical or horizontal overflow.

- [ ] **Step 5: Run the full frontend verification**

Run:

```powershell
npm.cmd run test:run --prefix frontend
npm.cmd run build --prefix frontend
npm.cmd audit --prefix frontend --audit-level=moderate
```

Expected: all existing tests pass, build succeeds, and audit reports zero moderate-or-higher vulnerabilities.

- [ ] **Step 6: Stage, inspect, and safety-check Task 4**

Run:

```powershell
git add -- frontend/src/App.tsx frontend/src/styles.css
node scripts/check-staged-files.mjs
git diff --cached --check
git diff --cached --name-only
```

Expected: safety passes and only `App.tsx` and `styles.css` are staged.

- [ ] **Step 7: Commit Task 4**

Run:

```powershell
git commit -m "style: deliver dark neon kiosk layout"
```

Expected: commit succeeds.

---

### Task 5: Update Kiosk, Avatar, and Acceptance Specifications

**Files:**
- Modify: `spec/03-kiosk-layout-spec.md`
- Modify: `spec/04-ai-avatar-spec.md`
- Modify: `spec/13-acceptance-standard.md`

- [ ] **Step 1: Extend the kiosk layout acceptance criteria**

Add criteria to `spec/03-kiosk-layout-spec.md` requiring:

```markdown
- The primary landscape view uses a dark navy/black cinematic foundation, glass panels, cyan and purple neon accents, and no plain white dashboard background.
- The primary voice interaction reads `Tap to Speak` when ready and `Tap to Stop` while listening.
- At 1024 × 768 landscape, the assistant bay, conversation/product deck, promotion poster, shelf map, ERP panel, and pharmacist safety panel fit in one view without document scrolling.
- The promotion region is a poster composition rather than a small dashboard card.
- The existing hold-to-speak control may remain only as a visually secondary fallback.
```

Change the required-region wording from “Hold to Speak” to “primary voice control plus hold fallback” while retaining the explicit accessible fallback requirement.

- [ ] **Step 2: Extend avatar acceptance criteria**

Add to `spec/04-ai-avatar-spec.md`:

```markdown
- The Lottie-first visual reads as an abstract holographic AI assistant and does not use a childish cartoon face.
- The assistant stage uses visible text and distinct cyan, purple, or safety-red treatments for idle, listening, thinking, speaking, error, and pharmacist escalation.
- Listening and speaking activity visibly energizes the waveform without changing the renderer adapter contract.
- The primary interaction state maps to `Tap to Speak`, `Tap to Stop`, `Thinking…`, `Speaking…`, `Try Again`, or `Pharmacist Requested`.
```

- [ ] **Step 3: Extend repository acceptance evidence**

Add to `spec/13-acceptance-standard.md`:

```markdown
- Dark neon kiosk acceptance evidence includes a 1024 × 768 screenshot showing the full single-screen composition.
- The screenshot must show `Tap to Speak` as the primary interaction, a futuristic avatar bay, a poster-style promotion, the map-style shelf route, Mock VitaFlow provenance, and pharmacist safety messaging.
- A white/light SaaS dashboard treatment or a primary `Hold to Speak` label is not accepted.
```

- [ ] **Step 4: Run spec and repository checks**

Run:

```powershell
node scripts/check-specs.mjs
node scripts/check-repository.mjs
git diff --check
```

Expected: 13 specs pass coverage, repository structure passes, and no whitespace errors are reported.

- [ ] **Step 5: Stage only specs and run safety checks**

Run:

```powershell
git add -- spec/03-kiosk-layout-spec.md spec/04-ai-avatar-spec.md spec/13-acceptance-standard.md
node scripts/check-staged-files.mjs
git diff --cached --check
git diff --cached --name-only
```

Expected: safety passes and only the three specified files are staged.

- [ ] **Step 6: Commit Task 5**

Run:

```powershell
git commit -m "docs: specify cinematic kiosk acceptance"
```

Expected: commit succeeds.

---

### Task 6: Perform Browser Acceptance and Record Evidence

**Files:**
- Create: `reports/evidence/dark-neon-kiosk-ipad-landscape.png`
- Modify: `reports/test-evidence.md`

- [ ] **Step 1: Start the existing frontend and backend demo**

Run the backend in one PowerShell terminal:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Run the frontend in another PowerShell terminal:

```powershell
npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5173
```

Do not add credentials and do not enable live adapters.

Expected: frontend loads from the local Vite URL and `/health` remains available from the existing backend.

- [ ] **Step 2: Inspect the kiosk at exactly 1024 × 768**

Use the in-app browser to set the viewport to 1024 × 768 and verify:

```text
document.documentElement.scrollWidth === 1024
document.documentElement.scrollHeight <= 768
```

Also verify:

- Computed body background is dark, not white.
- Primary button accessible name is `Tap to Speak`.
- `Hold to Speak` appears only in the secondary fallback.
- AI assistant, Product, Promotion, Shelf navigation map, ERP data, and Pharmacist assistance regions exist.
- Poster shows the active SG-001 mock promotion and its source-backed validity.
- ShelfMap shows Entrance, Aisle 03, Shelf A-03, Level 02, cyan route, and purple target.
- ERP panel shows Mock VitaFlow, SG-001, Mock mode, and no customer data.
- Browser console contains no errors or warnings.

- [ ] **Step 3: Verify the tap state transition without changing the hook**

With browser media permission handling visible:

1. Confirm ready label is `Tap to Speak`.
2. Tap once.
3. If microphone permission is available, confirm `Tap to Stop` and Listening state.
4. Tap again and confirm the existing hook advances to Thinking.
5. If permission is denied, confirm the accessible error state and `Try Again` label.
6. Confirm the page does not navigate, overflow, or expose live-provider data.

Automatic silence detection is not part of this task because the existing voice hook has no silence detector and is explicitly protected from modification.

Record the actual result; do not claim a microphone transition passed if browser permission was unavailable.

- [ ] **Step 4: Verify pharmacist escalation**

Click `Request assistance` and verify:

- Avatar state reads `Pharmacist requested`.
- Safety panel changes to the active escalation treatment.
- Existing escalation ID appears.
- Primary voice button becomes disabled with `Pharmacist Requested`.

- [ ] **Step 5: Capture acceptance screenshot**

Save the visible 1024 × 768 viewport as:

```text
reports/evidence/dark-neon-kiosk-ipad-landscape.png
```

The screenshot must show the complete approved composition and must not contain browser permission dialogs, debug overlays, customer data, secrets, or real business records.

- [ ] **Step 6: Update the evidence ledger with actual results**

In `reports/test-evidence.md`, update the visual fidelity ledger from the old light palette to the dark cinematic palette and add rows for:

```markdown
| Dark neon iPad landscape QA | In-app Browser at 1024×768 | [actual document dimensions, region count, console result] | Pass |
| Tap voice control QA | Click primary voice control | [actual ready/listening or permission-error result] | Pass or Not manually verified |
| Cinematic kiosk screenshot | In-app Browser viewport screenshot | Dark AI bay, poster, shelf map, ERP provenance, and safety panel visible | Pass |
```

Reference the committed screenshot:

```markdown
Dark neon kiosk acceptance screenshot: [1024 × 768 Cinematic AI Bay](evidence/dark-neon-kiosk-ipad-landscape.png).
```

- [ ] **Step 7: Run final automated verification**

Run:

```powershell
npm.cmd run test:run --prefix frontend
npm.cmd run build --prefix frontend
node scripts/check-specs.mjs
node scripts/check-repository.mjs
node scripts/check-staged-files.mjs --tracked
git diff --check
```

Expected: frontend tests and build pass; spec and repository checks pass; tracked-file safety reports no prohibited paths; no whitespace errors.

- [ ] **Step 8: Stage evidence and run the final staged safety check**

Run:

```powershell
git add -- reports/test-evidence.md reports/evidence/dark-neon-kiosk-ipad-landscape.png
node scripts/check-staged-files.mjs
git diff --cached --check
git diff --cached --name-only
```

Expected: safety passes and only the evidence ledger and screenshot are staged.

- [ ] **Step 9: Commit Task 6**

Run:

```powershell
git commit -m "test: record cinematic kiosk acceptance evidence"
```

Expected: commit succeeds and `git status --short` is empty.
