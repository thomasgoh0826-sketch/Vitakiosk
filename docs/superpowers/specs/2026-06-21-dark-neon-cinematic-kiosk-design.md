# VitaKiosk Dark Neon Cinematic Kiosk Design

**Date:** 2026-06-21
**Status:** Approved
**Visual direction:** B — Cinematic AI Bay

## 1. Objective

Redesign the existing React kiosk frontend into a premium, dark futuristic AI healthcare interface while preserving all existing backend contracts, mock data, WebSocket behavior, safety rules, service adapters, and test files.

The target is a single-screen 1024 × 768 iPad landscape experience. It must feel like a cinematic AI pharmacy kiosk rather than a light SaaS dashboard.

## 2. Scope

### In scope

- Frontend layout and visual styling.
- Frontend presentation components needed for the approved composition.
- A new primary tap-to-speak control.
- Reuse and visual refinement of the existing avatar, product, promotion, shelf map, ERP, and pharmacist escalation components.
- Updates to:
  - `spec/03-kiosk-layout-spec.md`
  - `spec/04-ai-avatar-spec.md`
  - `spec/13-acceptance-standard.md`
- Browser screenshot evidence at the target viewport.

### Out of scope

- Backend or API changes.
- Mock-data schema or value changes.
- WebSocket protocol or state changes.
- Safety behavior changes.
- Service-adapter changes.
- Calls to OpenAI, ElevenLabs, VitaFlow ERP, or other live providers.
- Changes to existing test files.
- Rive or Three.js implementation.

## 3. Experience Architecture

The kiosk remains a single React application using the current voice interaction and WebSocket hooks. `App` continues to own orchestration and passes presentation-ready state to focused components.

The screen is divided into three visual zones:

1. **AI bay — left**
   - VitaKiosk Labs identity.
   - Large futuristic avatar stage.
   - State-reactive waveform and status label.
   - Primary Tap to Speak / Tap to Stop control.
   - Small secondary hold-to-speak fallback.

2. **Clinical information deck — center**
   - Customer question bubble.
   - AI answer bubble.
   - Product identity and image treatment.
   - Price, stock, branch, shelf location, and VitaFlow provenance.
   - Dark indoor pharmacy ShelfMap.

3. **Retail and safety rail — right**
   - Large promotion poster treatment.
   - Compact floating ERP system panel.
   - Pharmacist safety and escalation panel.

The page must fit the target landscape viewport without document scrolling. Narrower layouts may reflow responsively without horizontal overflow.

## 4. Visual System

The frontend stylesheet defines and consistently uses:

```css
--bg-main
--panel-glass
--neon-cyan
--neon-purple
--text-primary
--text-muted
--danger-red
--success-green
```

The base background uses dark navy and near-black layers, with a subtle grid or circuit pattern that does not reduce readability. Panels use translucent dark glass, restrained blur, luminous edge highlights, and cyan or purple shadows.

The visual hierarchy is cinematic but controlled:

- Cyan indicates interaction, connection, and route guidance.
- Purple indicates AI presence, promotion emphasis, and target location.
- Red is reserved for errors and pharmacist escalation.
- Green is reserved for connected or safe operational status.
- Body text maintains strong contrast against glass panels.
- Focus rings remain clearly visible for keyboard and accessibility use.
- Reduced-motion preferences disable or simplify nonessential animation.

No main content region may use a plain white or light-dashboard surface.

## 5. Component Design

### 5.1 App composition

`App.tsx` retains all existing data selection, voice orchestration, WebSocket integration, and escalation calls. Its markup is reorganized into the approved three-zone composition.

No data is duplicated or synthesized for visual convenience. Components receive the existing product, promotion, poster, voice, connection, and escalation values.

### 5.2 TapToSpeakButton

A new `TapToSpeakButton` becomes the primary interaction.

Its behavior is controlled by the existing assistant state:

| Current state | Visible label | Tap behavior |
| --- | --- | --- |
| `idle` | Tap to Speak | Start recording |
| `listening` | Tap to Stop | Stop recording |
| `thinking` | Thinking… | Disabled |
| `speaking` | Speaking… | Disabled |
| `error` | Try Again | Start a new recording attempt |
| `pharmacist_escalation` | Pharmacist Requested | Disabled |

The button supports pointer activation and keyboard activation through native button semantics. `aria-pressed` reflects listening state, and state changes remain available through an `aria-live` status.

Silence detection, transcription, response, and playback transitions remain owned by the existing voice hook. The component does not introduce a second state machine.

The existing `HoldToSpeakButton` remains intact as a visually secondary fallback. This preserves the current accessibility path and existing test expectations while removing “Hold to Speak” from the main interaction wording.

### 5.3 AvatarAssistant

The avatar becomes an abstract holographic assistant rather than a childish face. The Lottie-first renderer contract remains unchanged so Rive or Three.js can replace the renderer later.

Visual state treatments:

- `idle`: slow cyan/purple breathing glow.
- `listening`: energized listening ring and responsive waveform.
- `thinking`: orbiting or scanning treatment.
- `speaking`: audio-reactive waveform and basic mouth/core movement.
- `error`: restrained red alert treatment.
- `pharmacist_escalation`: safety alert state with clear pharmacist handoff copy.

Every state keeps visible accessible text and respects reduced motion.

### 5.4 Conversation and product presentation

The center deck shows a customer question bubble and AI answer bubble using existing frontend state only. Empty states use neutral instructional copy and do not imply that a conversation occurred.

The product card presents only existing VitaFlow/mock adapter fields:

- Product name and identifier.
- Current price.
- Stock.
- Branch.
- Shelf location.
- Source label.

Unavailable values remain unavailable and are never inferred. Mock provenance is always visible.

### 5.5 PromotionPoster

The promotion region becomes a tall poster-style composition with product imagery or an abstract product visual, campaign title, branch, validity, and source.

Only the current active, branch-aware promotion supplied by the application may render. The poster must not invent:

- A discount amount.
- A promotional price.
- A product image that suggests a different product.
- A branch or validity period.

If the current data does not contain a dedicated promotional price, the poster may display the existing product price only when clearly labelled as the current VitaFlow product price. Otherwise, price is omitted.

The empty state remains poster-shaped and states that no active branch promotion is available.

### 5.6 ShelfMap

The existing map-style navigation remains. It receives darker glass, brighter route contrast, and stronger spatial depth without becoming a progress stepper.

It continues to show:

- “You are here” marker.
- Target shelf marker.
- Glowing cyan route line.
- Aisle and shelf blocks.
- Aisle 03.
- Shelf A-03.
- Level 02.
- Route summary.

Locations come only from VitaFlow/mock source data. Missing locations produce an unavailable state rather than a guessed route.

### 5.7 ERP data panel

The ERP region becomes a compact floating system panel. It shows:

- Source: Mock VitaFlow.
- Branch: SG-001.
- Mode: Mock mode.
- Connection/local-state status.
- No customer data.

It must not expose customer, sales, database, credential, or operational log data.

### 5.8 Pharmacist escalation panel

The panel is styled as a safety control rather than generic customer service. It includes:

- Pharmacist iconography.
- Clear “AI does not diagnose or replace a pharmacist” messaging.
- Warning treatment during escalation.
- Request assistance action.
- Existing escalation identifier when available.

The current API call and escalation logic remain unchanged.

## 6. State and Data Flow

1. The WebSocket and voice hook provide the current assistant state.
2. `App` maps that state to the avatar, status label, waveform, and tap control.
3. A ready-state tap calls the existing `startRecording`.
4. A listening-state tap calls the existing `stopRecording`.
5. Existing orchestration advances through thinking and speaking.
6. Playback completion returns the existing state to idle.
7. Manual or safety escalation overrides the visible state with `pharmacist_escalation`.
8. Product, promotion, poster, ERP, and shelf components render only values already selected by `App`.

No component performs its own backend request unless it already does so in the current application.

## 7. Error and Safety Handling

- Media permission or recording errors produce the existing error message and an accessible retry state.
- Socket disconnection keeps the established local-state mode visible.
- Missing product information remains unavailable; unknown-product behavior remains owned by the existing purchasing-query flow.
- Missing promotion data renders a safe empty poster.
- Missing shelf information renders navigation unavailable without guessing.
- Red-flag and manual escalation continue to invoke the existing pharmacist handoff path.
- The interface never describes the AI as a clinician and never presents generated diagnosis.

## 8. Accessibility

- All major zones retain accessible names.
- The primary control is a semantic button with at least a 44 × 44 pixel target.
- Listening state is represented through text and `aria-pressed`, not color alone.
- Assistant state and error changes are announced through live regions.
- Focus indicators remain visible over neon surfaces.
- Text contrast remains readable at the target viewport.
- Decorative effects are hidden from assistive technology.
- Motion is reduced when `prefers-reduced-motion` is enabled.

## 9. Testing and Evidence

Existing test files are not modified. Implementation must preserve their contracts while adding the new primary control.

Required verification:

- Existing frontend unit and integration tests.
- TypeScript check.
- Production build.
- Spec validation.
- Browser inspection at 1024 × 768.
- Browser console check.
- Screenshot showing the complete dark neon kiosk.
- Screenshot evidence must visibly demonstrate:
  - No white/light dashboard background.
  - Tap to Speak as the primary control.
  - Futuristic avatar bay.
  - Poster-style promotion.
  - Map-style shelf route.
  - ERP provenance.
  - Pharmacist safety panel.
- `node scripts/check-staged-files.mjs` before each commit.

Test evidence is recorded in `reports/test-evidence.md` with command, date, actual result, and status.

## 10. Acceptance Criteria

The redesign is accepted when:

- The 1024 × 768 landscape view is a coherent single-screen composition without document scrolling.
- The screen uses a dark navy/black foundation, cyan and purple neon accents, glass panels, and subtle technical texture.
- The primary control reads “Tap to Speak” when ready and “Tap to Stop” while listening.
- Thinking, speaking, error, and pharmacist escalation states are visibly distinct and accessible.
- The avatar reads as a premium holographic AI assistant rather than a simple cartoon face.
- Product, price, stock, branch, shelf, promotion, and source displays use only existing VitaFlow/mock values.
- The promotion is presented as a poster and only renders active branch-aware promotion data.
- Shelf navigation remains a real indoor map with current marker, target marker, route, aisle blocks, shelf, and level.
- The ERP panel clearly says Mock VitaFlow, SG-001, Mock mode, and no customer data.
- The pharmacist panel clearly communicates the AI safety boundary and offers assistance.
- Existing backend, API, WebSocket, mock data, safety logic, service adapters, and test files are unchanged.
- Automated checks, build, browser inspection, screenshot evidence, and staged-file safety check pass.
