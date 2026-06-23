# Acceptance Standard

## Purpose

Define repository-wide completion requirements for every VitaKiosk feature.

## Acceptance criteria

A feature is accepted only when:

- Its spec states observable behavior and safety constraints.
- A test was observed failing before implementation for new behavior.
- Relevant automated tests pass with no warnings treated as acceptable noise.
- Frontend behavior also passes TypeScript and production build.
- Visible work is inspected in a browser at its target viewport.
- Test evidence names the command, date, actual result, and status.
- Staged paths pass `node scripts/check-staged-files.mjs`.
- No secret or real business data is tracked.
- Mock/live provider mode and VitaFlow provenance are explicit.
- Default provider selectors remain mock unless a task explicitly enables one layer.
- Credentials alone never activate OpenAI, ElevenLabs, Ollama, VitaFlow, or OCR providers.
- Live-provider work must be one layer at a time, with tests proving mock-default behavior remains unchanged.
- VitaFlow live integration must start as read-only only and must not use `C:\Users\Admin\Documents\Playground\release`.
- Red-flag, unknown-product, and non-invention rules remain covered.
- AI-controlled UI behavior is accepted only when the backend returns structured
  `ui_actions` from the approved action set and the frontend ignores unknown or
  arbitrary action types.
- Subtitle acceptance requires cinematic AI subtitle mode: the main kiosk UI
  hides the customer transcript and any `YOU` bubble, shows only the current AI
  phrase or sentence with at most 1-2 lines, uses `aria-live`, supports
  reduced-motion users without relying only on animation, and keeps raw JSON,
  provider/debug labels, arbitrary action text, and full-paragraph AI dumps out
  of the customer-facing display.
- Leaflet acceptance requires active, date-valid, branch-aware promotion and
  campaign leaflets, product/category linking from adapter data, touch-friendly
  galleries, enlarged modal view with close/previous/next, and pharmacist
  escalation priority over promotion browsing.
- Red-flag safety acceptance requires no promotion/campaign leaflet or modal to
  appear before pharmacist escalation.
- Voice-flow acceptance requires `Tap to Speak` as the main control, manual
  `Tap to Stop` fallback, browser-side silence auto-stop, and a secondary
  `Start` / `Start New Customer` reset action instead of a small `Hold to
  Speak` fallback.
- Typed-input acceptance requires a compact accessibility input rail
  below Shelf navigation, a clearly labelled text field, visible current draft,
  small keyboard icon, conditional Clear, and Send actions, native
  device-keyboard behavior by default, and no large normal-layout title block,
  `Native keyboard mode` badge, or `Type / Keyboard` card button.
- The compact typed rail may wrap into two rows when width is constrained:
  row 1 is the full-width input field, and row 2 contains keyboard, Clear when
  visible, and Send. The rail must expand its own height in normal layout flow
  and must not be positioned as an absolute/fixed overlay, pulled with negative
  margins, clipped by a fixed max height, or hidden behind another panel.
- Native typed input must not force a custom popup on focus, must not use
  `readonly`, and must support normal browser/device input, copy-paste,
  backspace, external keyboards, iPad keyboard, Windows touch keyboard, Chinese
  IME, and Bahasa Melayu text typed in EN mode.
- Popup typed input must open intentionally from the compact keyboard icon, show
  a large textarea with the current draft, offer EN and
  中文 only, preserve the draft when closed, send from the popup, and clear/close
  on reset.
- Popup typed input must render as a viewport-level overlay outside the compact
  input rail and Shelf Navigation map, with the textarea focused on open; it is
  not accepted as a small nested popup clipped or contained by the normal kiosk
  grid row.
- Popup typed input must include visible, touch-friendly input support.
  EN mode must show QWERTY keys with Space and Backspace. 中文 mode must not
  include hardcoded word, product, promotion, medicine, or pharmacy phrase
  candidates; it must guide customers to use the device Chinese keyboard /
  pinyin IME, touch keyboard, or external keyboard. A modal that shows only a
  large textarea without either the EN keyboard or the Chinese device-IME
  guidance is not accepted.
- Typed submissions must reuse the same AI/business/safety workflow as voice
  instead of a separate product logic path.
- Typed-input screenshot evidence must include the compact typed panel, native
  keyboard mode, and popup typing screen at the target iPad landscape viewport.
- Shelf-map priority acceptance requires the compact typed input rail to stay
  below Shelf Navigation in normal flow, expand naturally when it wraps, and not
  overlap, intersect, cover, clip, or make Shelf Navigation incomplete at
  1024x768, 1366x768, or 1920x1080.
- STT provider acceptance requires mock STT by default, explicit
  `STT_PROVIDER=openai_whisper` or `STT_PROVIDER=faster_whisper` selection for
  non-mock STT, credentials/model settings read from local environment only, no
  live STT network calls or faster-whisper model downloads in tests or CI,
  transcript language metadata for English/Chinese/Malay/mixed speech,
  confidence/correction metadata when available, local pharmacy dictionary
  correction without inventing product facts, and an unclear/low-confidence
  speech path that asks for clarification instead of calling AI, TTS, product,
  promotion, or recommendation workflows.
- Ollama AI provider acceptance requires mock AI by default, explicit
  `AI_PROVIDER=ollama` selection for local Ollama, no real Ollama calls in tests
  or CI, structured JSON validation, safety checks before and after model
  output, deterministic fallback when Ollama is offline or unsafe,
  VitaFlow/mock-only product facts, whitelisted UI actions only, matching
  language context for English/Chinese/Malay/mixed transcripts, and proof that
  red-flag and pregnancy flows escalate before any Ollama product wording.
- Local Ollama + VRM demo acceptance requires example-only backend and frontend
  env files, backend provider summary through `/health`, dev-only runtime
  diagnostics showing AI/STT provider and avatar renderer/model, proof that
  backend `AI_PROVIDER=ollama` does not reset frontend `VITE_AVATAR_RENDERER=vrm`,
  proof that frontend renderer config does not change backend provider mode, and
  a clear VRM fallback console reason for missing model, load failure, or WebGL
  unavailability. It must include a strict-port local VRM startup helper that
  injects the documented Vite variables before startup and fails clearly if an
  old 5175 dev server is still running.
- Local runtime status acceptance requires `/api/runtime/status` to return only
  safe provider diagnostics without secrets, cache paths, logs, customer data,
  sales data, database URLs, or private VitaFlow URLs. The frontend diagnostics
  badge must show `Provider status unavailable` instead of `UNKNOWN` when the
  endpoint cannot be fetched.
- Local development CORS acceptance requires explicit support for
  `http://127.0.0.1:5175`, `http://localhost:5175`,
  `http://127.0.0.1:5173`, and `http://localhost:5173` without wildcard
  origins.
- Local frontend dev server acceptance requires Vite to bind
  `127.0.0.1:5175` with `strictPort: true`; if the port is occupied, the
  command must fail clearly instead of switching to 5176, 5177, 5178, or any
  other port.
- Pharmacist escalation acceptance requires a visible confirmation with the
  escalation ID when available, a `Start New Customer` / reset action, no browser
  refresh requirement, an idle ready state after reset, and proof that the
  original escalation ticket is not canceled by resetting the kiosk UI.
- Shelf navigation acceptance evidence includes a screenshot of the map route panel at the target iPad landscape viewport; a plain progress stepper is not accepted.
- Dark neon kiosk acceptance evidence includes a 1024x768 screenshot showing the full single-screen composition.
- The screenshot must show `Tap to Speak` as the primary interaction, a futuristic avatar bay, a poster-style promotion, the map-style shelf route, Mock VitaFlow provenance, and pharmacist safety messaging.
- A white/light SaaS dashboard treatment or a small secondary `Hold to Speak` fallback is not accepted.
- Responsive kiosk acceptance evidence must include screenshot or browser-measured evidence for at least 1024x768, 1366x768, and 1920x1080.
- The responsive layout is not accepted if any required landscape viewport has horizontal overflow, document scrolling in the normal kiosk path, overlapping product/promotion/shelf/ERP/safety panels, or a hidden/unusable primary `Tap to Speak` control.
- Typed-input responsiveness work is not accepted if it globally scales, fixed-canvas shrinks, or transform-scales the whole kiosk UI instead of constraining the typed rail internally.
- The compact typed rail is not accepted if its keyboard icon or Send button collapses, disappears, or lets input text push controls out of view.
- The compact typed rail is not accepted if its two-row state floats over the
  branch-aware/system display, Shelf Navigation, product, promotion, ERP, or any
  other kiosk panel.
- Narrow tablet or portrait fallback may scroll vertically, but it must not create horizontal overflow and must keep the avatar, shelf map, promotion poster, ERP panel, and pharmacist safety panel readable.
- VRM/Three.js avatar canvases must resize with their assistant stage; VRM mode must not expose customer-facing technical renderer labels.
- Optional avatar renderer work must keep Lottie as the default, gate Three.js behind `VITE_AVATAR_RENDERER=threejs`, and prove all avatar states remain accessible.
- Three.js avatar acceptance requires lazy loading, GLB humanoid support, abstract hologram fallback, WebGL fallback, reduced-motion support, and tests proving Lottie remains the default.
- VRM avatar acceptance requires lazy loading, local self-hosted VRM support, Lottie/GLB/abstract fallback safety, accessible state labels, reduced-motion support, a relaxed non-T-pose assistant stance, no visible raised hands or improvised hand/lower-arm gesture overrides, vertical full-body chamber rendering without circular hologram masking when the VRM is loaded, full-body or near-full-body framing with the head never cropped, visible face lighting, and screenshot evidence at 1024x768.
- Alternate VRM model acceptance requires `VITE_VRM_MODEL=vita-new` to load `frontend/src/assets/avatar/vita-new.vrm` without deleting `frontend/src/assets/avatar/vita.vrm`, expose runtime evidence such as `data-avatar-model-key="vita-new"`, and fall back safely if the selected alternate model is unavailable or invalid.
- VRM hologram orbit acceptance requires the orbit/halo to render as a background effect that does not visibly cross the avatar's face, torso, arms, hands, or dress, with screenshot evidence at 1024x768 and 1366x768.
- Heavy 3D models are not accepted for the iPad landscape kiosk path.

## Test evidence

- `reports/test-evidence.md`
- `scripts/check-specs.mjs`
- Full commands listed in README Test and build section.
