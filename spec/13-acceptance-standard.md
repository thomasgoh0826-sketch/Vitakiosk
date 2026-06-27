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
- Customer-facing screens must hide raw provider/runtime/avatar diagnostics by default. `Renderer`, `Model`, `Avatar`, `AI`, and `STT` labels are accepted only behind an explicit local development flag such as `VITE_SHOW_DEBUG_STATUS=true`.
- Language UI acceptance requires a compact footer language selector for EN, 中文, and BM; default display language is EN, manual selection persists in localStorage, and Start/New Customer does not reset the selected language.
- Language preference acceptance requires typed and voice workflows to pass a safe `preferred_language` value when available, while safety guardrails, red-flag escalation, unknown-product purchasing queries, and VitaFlow/mock source-of-truth facts remain unchanged.
- Frontend i18n must translate kiosk labels only; product names, SKU, prices, stock, shelf codes, branch codes, promotion/campaign titles, and `Mock VitaFlow` provenance values must remain unchanged.
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
  galleries, an enlarged swipeable holographic modal gallery, and pharmacist
  escalation priority over promotion browsing. The enlarged modal must not rely
  on `Previous`/`Next` as the primary interaction; it must support touch swipe,
  mouse drag, trackpad horizontal swipe, keyboard left/right fallback, Escape to
  close, click-outside-to-close, click-inside-stays-open behavior,
  active-leaflet metadata, screen-reader active position text,
  reduced-motion operation, and a single-leaflet centered mode without fake
  carousel behavior.
- Promotion panel leaflet acceptance requires the leaflet artwork/card to be
  the primary touch target. A visible normal-panel `Enlarge Leaflet` button is
  not accepted. Product-linked active promotions appear first when available;
  product-without-promotion and product-not-found flows default to an active
  branch-valid campaign leaflet when one exists.
- Promotion panel responsive acceptance requires browser-measured evidence that
  the normal promotion region uses its available container space without a tiny
  fixed-size leaflet stranded in a large panel. The normal/collapsed promotion
  panel may show multiple active branch-valid leaflet artworks side by side
  when its container is wide and tall enough, but it must reduce to fewer cards
  when space is insufficient. Fully visible leaflet artwork is preferred over
  showing more cards.
- Promotion panel collapsed-content acceptance requires the normal right-rail
  leaflet cards to show artwork only. Title blocks, descriptions, branch/source/
  validity metadata blocks, metadata overlays, and extra details are accepted
  only in the enlarged leaflet viewer.
- Promotion panel responsive acceptance is not met if the normal panel clips
  leaflet artwork, distorts leaflet artwork, hides the top/bottom/title/logo/
  footer of a visible leaflet, overlays collapsed metadata on the artwork, or
  keeps too many visible cards when the panel cannot contain them.
- Red-flag safety acceptance requires no promotion/campaign leaflet or modal to
  appear before pharmacist escalation.
- Voice-flow acceptance requires `Tap to Speak` as the main control, manual
  `Tap to Stop` fallback, browser-side silence auto-stop, and a secondary
  `Start` / `Start New Customer` reset action instead of a small `Hold to
  Speak` fallback.
- Voice playback acceptance requires successful backend TTS audio to enter
  `speaking`, activate playback/VRM speaking behavior, return to `idle` after
  audio end, and avoid `Try Again`. Browser autoplay blocking after successful
  TTS must show a controlled `Tap to play voice` path while keeping the answer
  visible.
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
  a large textarea with the current draft, offer an EN QWERTY-only backup keyboard,
  preserve the draft when closed, send from the popup, and clear/close
  on reset.
- Popup typed input must render as a viewport-level overlay outside the compact
  input rail and Shelf Navigation map, with the textarea focused on open; it is
  not accepted as a small nested popup clipped or contained by the normal kiosk
  grid row.
- Popup typed input must use a normal vertical layout with reserved rows for
  header, textarea, helper text, EN keyboard, and Clear/Done/Send actions. The
  helper row, keyboard, and action row must remain below the textarea and must
  not use overlap hacks such as absolute positioning, negative margins, or
  floating over the textarea.
- Popup typed input must include visible, touch-friendly input support.
  EN QWERTY must show keys with Space and Backspace. It must not include a
  language toggle, BM toggle, Chinese virtual keyboard mode, hardcoded Chinese
  word/product/promotion/medicine/pharmacy phrase buttons, or pinyin candidate
  keyboard. Chinese text input must remain possible through the normal textarea
  using the device native Chinese IME / pinyin keyboard or external keyboard.
  A modal that shows only a large textarea without the EN keyboard backup is not
  accepted.
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
  correction without inventing product facts, common mock-product STT variants
  such as `Relief Bomb` -> `Relief Balm`, and an unclear/low-confidence
  speech path that asks for clarification instead of calling AI, TTS, product,
  promotion, or recommendation workflows.
- STT API acceptance requires empty, unsupported, malformed, or provider
  decode-failed audio to return controlled 400/422-style client feedback
  (`invalid_audio`) instead of a backend 500, stack trace, raw audio log, or
  bad-audio persistence.
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
- Enlarged Shelf Navigation viewer acceptance requires a top-level holographic
  overlay opened by tapping/clicking or keyboard-activating the Shelf card,
  the same source-backed route data as the normal map, no inferred missing shelf
  data, a fully readable route/facts/map, click-outside and Escape close, and
  click-inside retention behavior.
- Dark neon kiosk acceptance evidence includes a 1024x768 screenshot showing the full single-screen composition.
- The screenshot must show `Tap to Speak` as the primary interaction, a futuristic avatar bay, a poster-style promotion, the map-style shelf route, Mock VitaFlow provenance, and pharmacist safety messaging.
- A white/light SaaS dashboard treatment or a small secondary `Hold to Speak` fallback is not accepted.
- Responsive kiosk acceptance evidence must include screenshot or browser-measured evidence for at least 1024x768, 1366x768, and 1920x1080.
- The responsive layout is not accepted if any required landscape viewport has horizontal overflow, document scrolling in the normal kiosk path, overlapping product/promotion/shelf/ERP/safety panels, or a hidden/unusable primary `Tap to Speak` control.
- AI subtitle/Product layout acceptance requires browser bounding-box evidence that
  `productPanel.top >= subtitlePanel.bottom + 12px` at 1024x768, 1366x768,
  and 1920x1080. Product source badges must be measured fully inside the Product
  panel and Product header row, and product icons/fact rows must have positive
  visible area inside their containers.
- Product panel responsive acceptance requires browser bounding-box evidence that
  each stock, branch, shelf, and source fact card plus its visible text remains
  fully inside the Product panel at 1024x768, a narrower landscape width, and
  1366x768. The Product panel is not accepted if `scrollHeight` or `scrollWidth`
  exceeds the panel client size because of hidden clipped content or decorative
  overflow.
- Fuzzy ERP product search acceptance requires the VitaFlow adapter to expose a
  read-only candidate-search method that supports exact, partial, alias,
  SKU/code, and near spelling/STT variants with branch-aware confidence and
  match reason. Candidate facts must come only from the adapter, and a no-candidate
  result is the only product-search path that may create a purchasing query.
- Fuzzy product UI acceptance requires medium or ambiguous matches such as
  `Relief Bomb` -> `Relief Balm` to show a customer-facing `Do you mean this
  item?` panel with touch-friendly candidate cards, simple labels such as
  `Best match`, source/provenance, and no technical scoring vocabulary.
- Candidate selection acceptance requires the selected adapter-backed item to
  update Product, Shelf Navigation, Promotion leaflet priority, and ERP
  provenance while preserving safety, non-invention, and red-flag priority.
- Product summary transform acceptance requires a source-backed Product panel to
  switch between details and a concise summary state through click/tap and
  keyboard activation, use a futuristic shift/morph style rather than a
  180-degree flip, avoid visible `Back to product details` wording, and avoid
  invented VitaFlow facts, diagnosis, product recommendations, stock, price,
  promotion, or shelf information.
- Product summary language acceptance requires localized EN/中文/BM summary
  labels and safe localized summary text when available, with field-level
  fallback to English when a localized field is missing. Product name, SKU,
  price, branch, shelf, stock, and `Mock VitaFlow` provenance must remain
  unchanged except for label translation.
- Product summary responsive acceptance requires the summary field cards to wrap
  with an auto-fit grid into two or more readable rows when space is constrained,
  with no clipped, overlapping, or unreadably tiny summary cards.
- Enlarged Product sheet acceptance requires double-click/double-tap on details
  to open an enlarged product detail sheet and double-click/double-tap on
  summary to open an enlarged product summary sheet. The sheet must appear as a
  top-level holographic floating layer, close on outside click or Escape, keep
  inside clicks from closing it, avoid a visible X button, remain responsive, and
  respect reduced-motion users. It is not accepted if opening, closing, or
  animating either Product sheet creates document/body horizontal overflow,
  flashes a native horizontal scrollbar/white bottom line, or forces summary or
  fact cards outside the viewport instead of wrapping safely.
- Enlarged Product interaction acceptance requires a single click/tap inside
  the enlarged sheet to toggle details and summary with a holographic morph,
  light sweep, layered-glass shift, or reduced-motion fade. A standard 180-degree
  card flip, instant swap, inside-click close, or double-tap open causing
  duplicate toggles is not accepted.
- Shelf Navigation responsive acceptance requires browser bounding-box evidence
  that the route summary, Aisle/Shelf/Level facts, current-position marker, and
  target marker remain fully inside the Shelf Navigation panel at 1024x768, a
  narrower landscape width, and 1366x768. The route row is not accepted if it
  intersects the typed input rail or if `scrollHeight` exceeds the Shelf panel
  client height because important content is clipped.
- Typed-input responsiveness work is not accepted if it globally scales, fixed-canvas shrinks, or transform-scales the whole kiosk UI instead of constraining the typed rail internally.
- The compact typed rail is not accepted if its keyboard icon or Send button collapses, disappears, or lets input text push controls out of view.
- The compact typed rail is not accepted if its two-row state floats over the
  branch-aware/system display, Shelf Navigation, product, promotion, ERP, or any
  other kiosk panel.
- UI badge/icon polish is not accepted if dev/runtime provider diagnostics use
  fixed floating placement over customer-facing panels, overlap AI subtitle text,
  or cover product, promotion, ERP, or status content.
- Product, promotion, leaflet, and safety icons are not accepted if inner
  artwork, logos, glyphs, or leaflet images are clipped; image artwork must use
  safe padding and `object-fit: contain`.
- Backend-driven product image acceptance requires normal Product panel,
  enlarged Product detail, enlarged Product summary, and candidate cards to use
  adapter-provided `imageUrl`/`thumbnailUrl`/`images[]` data through the shared
  `ProductImage` component. The frontend must not hardcode product-specific
  image paths, and missing, unsafe, or failed images must fall back to the
  generated premium initials/icon without changing VitaFlow source-of-truth
  product facts.
- Leaflet modal acceptance requires a floating holographic leaflet card over the
  existing kiosk UI, not a big dark modal container and not a modal box
  containing a nested carousel box. The whole floating stage must be
  draggable/swipeable, the active leaflet image must be the centered hero, and the
  metadata panel must remain small, secondary, and readable. The viewer must
  render as a top-level fixed overlay/portal above the kiosk UI so the active
  leaflet never appears inserted into, behind, or mixed with the avatar,
  product, shelf, ERP, promotion, or pharmacist panels.
- Leaflet modal deck acceptance requires the Moderately Cylindrical floating
  deck pattern: active card centered and facing the user,
  previous/next leaflets visible on the left and right when real leaflets
  exist, side cards clearly angled backward with moderate `translateZ(-90px)`
  style depth and about `rotateY(±22deg)`, and no spherical, circular, orbit,
  wheel, full 3D carousel, coverflow spin, or hidden single-card replacement carousel
  behavior.
- Leaflet modal deck sizing acceptance requires the active leaflet to read as
  the hero object, remain fully visible with contained artwork, and keep side
  leaflets clearly visible at roughly 72% of active scale when neighboring
  leaflets exist. The deck must use distinct left/center/right visual slots,
  reserve enough safe horizontal stage space for visible neighbors, and avoid
  letting the center card cover, bury, or visually stack over the side cards.
- Leaflet modal side-slot acceptance requires the visible side-card inner edges
  to sit outside the active-card footprint with a measurable gap at 1024x768
  and 1366x768. The implementation must physically separate the card slots
  instead of relying on active-card z-index to hide overlap.
- Leaflet modal side-orientation acceptance requires side cards to sit on a
  moderate cylindrical carousel arc rather than a flat stack. The previous/left
  leaflet uses the left arc orientation, the next/right leaflet uses the right
  arc orientation, and browser evidence must verify that the rendered side
  cards no longer pinch into or slide underneath the center card.
- Leaflet modal swipe-animation acceptance requires a smooth cylindrical
  carousel path with gentle depth interpolation and no bounce, overshoot, pop-forward,
  elastic spring, aggressive active-card scale-up, sudden translateZ jump, or
  card bumping toward the user as it becomes active. A controlled tween/ease or
  zero-bounce spring is acceptable.
- Leaflet modal swipe distance acceptance requires long mouse, touch, or
  trackpad drags to resolve by measured drag distance instead of forcing
  one-card-at-a-time navigation. A drag far enough to cross multiple card slots
  may move directly from the third leaflet to the first, or the reverse, while
  preserving the same controlled no-bounce snap.
- Leaflet modal side-card acceptance requires every visible previous/next
  leaflet to remain fully inside the overlay viewport and above the kiosk UI.
  Offscreen non-neighbor cards must not remain partially visible at low opacity
  if they would be clipped at the overlay edge; hide them instead.
- Leaflet modal drag acceptance requires the outgoing active card and incoming
  card to interpolate along the same cylindrical transform path during drag.
  The outgoing card must not remain pinned at `scale(1)`, `translateZ(0)`, and
  `rotateY(0deg)` while another card slides underneath it. No card may pulse
  outward, scale above one, or visually jump depth during horizontal swipe.
- Leaflet modal deck-only corrections are accepted only if the existing
  metadata panel remains separate from the deck and is not redesigned, moved,
  attached to a card, removed, or animated with the leaflet cards.
- Leaflet modal animation acceptance requires a futuristic holographic
  expansion from the clicked leaflet into the foreground overlay and a smooth
  reverse collapse on outside click or Escape. Reduced-motion mode may simplify
  the transition, but a basic instant/fade-only web modal open is not accepted.
- Leaflet modal responsive acceptance requires metadata to stay outside the
  leaflet artwork at 1024x768 and squeezed/narrow/short viewports. When side
  space is insufficient, branch/source/validity/description metadata must move
  below the hero leaflet or otherwise reflow without covering the leaflet image.
  Neighbor previews must remain inside the overlay stage as moderate curved
  left/right cards and must not visually pass behind or merge with the kiosk
  page panels.
- Leaflet modal acceptance requires no visible X close button, no Previous/Next
  buttons, no visible dots, no visible `1 / 3` style page indicator, no top
  title/header above the leaflet, no `Holographic Leaflet Gallery`/stage wording,
  no visible `Swipe to browse` copy, and no particles, fog, smoke, dust,
  light-trail elements, noisy atmosphere, or heavy blur/dim overlay. Clicking
  outside closes, clicking inside the leaflet stage or metadata does not close,
  Escape closes, keyboard arrows remain an accessibility fallback, and all
  leaflet/metadata text must display only existing
  adapter-supplied leaflet data without invented discount, claim, branch,
  validity, or source details.
- Narrow tablet or portrait fallback may scroll vertically, but it must not create horizontal overflow and must keep the avatar, shelf map, promotion poster, ERP panel, and pharmacist safety panel readable.
- VRM/Three.js avatar canvases must resize with their assistant stage; VRM mode must not expose customer-facing technical renderer labels.
- Optional avatar renderer work must keep Lottie as the default, gate Three.js behind `VITE_AVATAR_RENDERER=threejs`, and prove all avatar states remain accessible.
- Three.js avatar acceptance requires lazy loading, GLB humanoid support, abstract hologram fallback, WebGL fallback, reduced-motion support, and tests proving Lottie remains the default.
- VRM avatar acceptance requires lazy loading, local self-hosted VRM support, Lottie/GLB/abstract fallback safety, accessible state labels, reduced-motion support, a relaxed non-T-pose assistant stance, no visible raised hands or improvised hand/lower-arm gesture overrides, vertical full-body chamber rendering without circular hologram masking when the VRM is loaded, full-body or near-full-body framing with the head never cropped, visible face lighting, and screenshot evidence at 1024x768.
- Alternate VRM model acceptance requires `VITE_VRM_MODEL=vita-new` to load `frontend/src/assets/avatar/vita-new.vrm` without deleting `frontend/src/assets/avatar/vita.vrm`, expose runtime evidence such as `data-avatar-model-key="vita-new"`, and fall back safely if the selected alternate model is unavailable or invalid.
- VRM hologram orbit acceptance requires the orbit/halo to render as a background effect that does not visibly cross the avatar's face, torso, arms, hands, or dress, with screenshot evidence at 1024x768 and 1366x768.
- Assistant waveform acceptance requires state-specific idle/listening/thinking/speaking/error/pharmacist-escalation styling, microphone RMS activity during listening, playback analyser or subtle visual fallback during speaking, reduced-motion support, and no customer-facing debug labels.
- Futuristic background animation acceptance requires lightweight CSS-only grid drift, scanlines, and glow sweeps that preserve readability and avoid particles, smoke, fog, noisy atmosphere, global zoom, or layout movement.
- Heavy 3D models are not accepted for the iPad landscape kiosk path.
- Local product scan acceptance requires an explicit `VISION_PROVIDER=local_product_scan`
  selector, browser camera access only after the customer taps `Scan Product`,
  stream cleanup after capture/cancel/close, no raw image persistence by default,
  barcode exact matches through VitaFlow/mock barcode lookup, OCR/image-similarity
  matches through the existing product candidate confirmation panel, customer-safe
  match labels, controlled camera/invalid-image errors, and tests proving CI
  remains mock-safe without camera hardware or cloud OCR.

## Test evidence

- `reports/test-evidence.md`
- `scripts/check-specs.mjs`
- Full commands listed in README Test and build section.
