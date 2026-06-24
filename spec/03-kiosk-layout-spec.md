# Kiosk Layout Specification

## Purpose

Provide a readable iPad landscape pharmacy kiosk surface.

## Required regions

AI assistant, primary Tap to Speak voice control plus Start/New Customer reset, Product, Promotion, Shelf navigation, typed accessibility input, ERP data, and Pharmacist assistance.

## Acceptance criteria

- All seven regions have accessible names and render in the primary view.
- Landscape layout uses a persistent assistant column and a structured information area.
- Controls have at least 44px interactive height and visible focus treatment.
- Portrait and narrow layouts stack without horizontal overflow.
- Mock provenance and connection state remain visible.
- Bottom-left connection status includes a compact language selector (`EN`, `中文`, `BM`) in the same normal footer flow; the active language is highlighted and persisted across refreshes.
- Customer-facing UI must not show renderer/model/provider diagnostics such as `Renderer`, `Model`, `Avatar`, `AI`, or `STT` unless `VITE_SHOW_DEBUG_STATUS=true` is set for local development.
- When debug diagnostics are enabled, they remain in reserved header space and must not overlap subtitles, product details, promotion content, or safety labels.
- The primary landscape view uses a dark navy/black cinematic foundation, glass panels, cyan and purple neon accents, and no plain white dashboard background.
- The kiosk background may include lightweight CSS-only grid drift, scanlines, circuit-line motion, and slow cyan/purple glow sweeps so the screen feels alive. These effects must remain behind content, preserve readability, avoid particles/fog/smoke/dust/noisy game-like effects, and respect `prefers-reduced-motion`.
- The primary voice interaction reads `Tap to Speak` when ready and `Tap to Stop` while listening.
- The secondary assistant action reads `Start` or `Start New Customer` and resets the kiosk for a fresh customer session without a browser refresh.
- The top center conversation area is a cinematic AI subtitle panel; the customer transcript is hidden from the normal customer-facing kiosk UI and may appear only behind an explicit debug/dev flag.
- AI subtitle copy appears as the current phrase or sentence, with a maximum 1-2 visible lines, large readable type, and no raw JSON, provider names, technical debug wording, or chat-style `YOU` bubble.
- During thinking or audio preparation, the AI subtitle area shows safe customer-facing progress text such as `Preparing answer…`.
- Idle, listening, error, and pharmacist escalation states use short subtitle/status copy rather than replaying a full previous AI paragraph.
- The AI subtitle panel and Product panel must have a browser-measured visible gap of at least 12px at 1024x768, 1366x768, and 1920x1080; the Product panel must not be pulled upward with negative margins or z-index masking.
- The Product source badge belongs inside the Product header row in normal layout flow and must remain fully inside the Product panel safe area.
- At 1024x768 landscape, the assistant bay, conversation/product deck, promotion poster, shelf map, ERP panel, and pharmacist safety panel fit in one view without document scrolling.
- The kiosk layout uses responsive grid/flex sizing rather than fixed pixel-only placement; target QA viewports include 1024x768, 1280x720, 1366x768, 1440x900, 1920x1080, and iPad portrait/narrow tablet fallback.
- Landscape kiosk viewports must not create horizontal overflow and should fit the full assistant/product/promotion/shelf/ERP/safety surface in one viewport without document scrolling.
- Portrait and narrow tablet viewports may scroll vertically, but product, shelf map, promotion poster, ERP data, pharmacist assistance, and the primary voice button must remain readable and non-overlapping.
- Typed input responsiveness must not shrink or transform-scale the whole kiosk layout; the approved main panel proportions should fill the available kiosk viewport normally.
- The avatar bay, VRM/Three.js canvas, shelf map, poster, and product cards resize with their containers using fluid sizing, aspect-ratio, CSS Grid/Flexbox, and `clamp()`-style text scales.
- VRM mode uses a larger full-body holographic assistant chamber without customer-facing technical renderer labels; Lottie remains the default renderer unless the runtime selects VRM or Three.js.
- VRM orbit/halo decoration is a secondary background effect; it must frame the character without crossing the visible face, torso, arms, hands, or dress.
- The promotion region is a poster composition rather than a small dashboard card.
- The promotion region supports product leaflets, campaign leaflets, active branch-valid galleries, no-product-promotion choices, and enlarged swipeable leaflet gallery display.
- The promotion region shows leaflet artwork/cards directly. A visible `Enlarge Leaflet` button is not accepted; tapping/clicking the leaflet card itself opens the enlarged floating leaflet viewer.
- When the current product has no product-specific promotion or the product is not found, the primary visible leaflet defaults to an active branch-valid campaign leaflet when one exists. Product-linked active promotion leaflets still take priority when available.
- A small `Hold to Speak` fallback must not appear as the secondary assistant action in the kiosk layout.
- Shelf navigation is rendered as an indoor map with aisle and shelf blocks, not as a plain progress stepper.
- The map shows a labelled current position, target shelf marker, route line, Aisle, Shelf, Level, and a readable route summary.
- The route uses only VitaFlow-provided shelf location data; unavailable locations are never inferred.
- Shelf navigation reserves normal-flow rows for header, map, Aisle/Shelf/Level facts, and the `Route` summary. The route summary, fact cards, current-position marker, and target marker must remain fully visible at supported landscape widths; fixed-height clipping, negative margins, and whole-app transform/zoom fixes are not accepted.
- Shelf navigation has a protected visual minimum size for its map viewport and route row; the typed input rail must not steal the map height or compress the route into an unreadable miniature panel.
- A compact typed accessibility input rail appears below Shelf navigation for customers who cannot or prefer not to speak.
- Shelf navigation has layout priority: the typed input rail must stay in normal document flow below the map and must not overlap, intersect, cover, or make the map incomplete at 1024x768 landscape.
- The typed input rail has a clear accessible `Type your question` label, visible placeholder, small keyboard icon action, conditional clear action, send action, and no raw debug/customer data.
- The compact typed input rail constrains only its own children: the text field flexes and ellipsizes, while the keyboard icon and Send button keep fixed touch-safe minimum widths.
- The normal typed input rail is slim and uses one row on wide containers. When width is constrained, it may wrap into two rows with the input on the first row and keyboard/Clear/Send actions on the second row.
- If the compact rail wraps, its container height must expand naturally and push following content down; it must not use absolute/fixed positioning, negative margins, fixed max-height clipping, or overflow rules that hide controls.
- The normal typed input rail does not show a large `Accessible input` title block, large `Native keyboard mode` badge, or large `Type / Keyboard` button.
- The default typed input mode is native device keyboard mode; focusing the compact text field must not force a custom popup.
- The small keyboard icon opens an intentional full-screen or near full-screen typing surface when a larger typing area is needed; it preserves the current draft when closed, can send from the popup, and may cover the screen intentionally.
- The full typing surface is a viewport-level overlay rendered outside the compact input rail and Shelf Navigation map, so the normal shelf map row cannot clip, compress, or contain the popup.
- Opening the typing surface focuses the large textarea for native keyboard/IME entry; Close/Done preserves the draft, Clear clears both compact and popup drafts, and Send uses the same safe typed workflow as the compact rail.
- The full typing surface includes a real touch keyboard area for EN QWERTY only, with Space and Backspace as an explicit backup.
- Bahasa Melayu text is typed in EN mode because it uses the Latin keyboard.
- The kiosk must not provide a language toggle, Chinese virtual keyboard mode, fake Chinese phrase buttons, BM toggle, or pinyin candidate keyboard. Chinese text entry relies on the device native Chinese IME / pinyin keyboard or an external keyboard through the normal text field.
- The typed input rail and popup keyboard remain touch-friendly and must not create horizontal overflow or awkward document scrolling in the normal 1024x768 landscape kiosk view.
- Dev-only provider/runtime diagnostics must be placed in reserved header space or hidden; they must never use floating positioning that covers AI subtitles, promotion content, product cards, or customer-facing status labels.
- UI translation applies only to kiosk labels and controls. VitaFlow/mock facts such as product names, SKU, prices, shelf codes, branch codes, promotion titles, and `Mock VitaFlow` provenance values must remain unchanged.
- Product, poster, pharmacist, and leaflet icon/artwork containers must use stable square/icon-safe sizing with centered content, safe padding, non-shrinking containers, and `object-fit: contain` for image assets so logos and leaflet artwork are not clipped.
- Product card fact rows and inner text must remain inside the Product panel bounds at the supported landscape QA viewports.
- The Product panel must grow or compact its own internals instead of clipping stock, branch, shelf, or source facts; at narrower landscape widths the fact row may wrap into a compact grid, but `scrollHeight`/`scrollWidth` clipping and whole-app transform/zoom fixes are not accepted.
- Enlarged leaflet previews must render as a floating holographic card over the existing kiosk UI, not as a big dark modal container or a modal box containing another carousel box. The leaflet image is the hero object, neighboring leaflets are subtle depth previews when multiple leaflets exist, and touch/mouse/trackpad swipe or drag on the whole floating stage changes the active leaflet.
- Enlarged leaflet previews must reflow metadata beside the leaflet only when width/height is sufficient. In squeezed or short viewports, metadata moves below the hero leaflet or otherwise stays outside the leaflet artwork so no description, validity, branch, or source text overlaps important leaflet content.
- Enlarged leaflet previews must keep keyboard arrows as an accessibility fallback, Escape closes the viewer, clicking outside the floating leaflet/card area closes it, clicking inside the leaflet stage or metadata does not close it, and `Previous`/`Next` buttons are not shown as the customer interaction.
- Enlarged leaflet previews must not show a visible top header/title, `Holographic Leaflet Gallery`/stage wording, visible `Swipe to browse` copy, visible X close button, visible dots, visible `1 / 3` style page indicators, particles, fog, smoke, dust, light-trail elements, noisy atmosphere, or heavy blur/dim overlays. Minimal branch/source/validity metadata may appear only in a small floating glass panel and must display existing adapter-supplied leaflet data.

## Test evidence

- `frontend/src/App.test.tsx`
- `frontend/src/App.integration.test.tsx`
- `frontend/src/typedInputLayout.test.ts`
- `frontend/src/components/TypedInputPanel.tsx`
- `frontend/src/components/VirtualKeyboard.tsx`
- `frontend/src/components/LanguageSelector.tsx`
- `frontend/src/hooks/useKioskLanguage.ts`
- `frontend/src/components/AiSubtitle.test.tsx`
- `frontend/src/hooks/useSubtitlePlayback.test.ts`
- `frontend/src/components/ShelfMap.test.tsx`
- `frontend/src/components/avatar/VrmAvatarRenderer.test.tsx`
- Browser screenshot evidence recorded in `reports/test-evidence.md`, including the 1024x768, 1366x768, and 1920x1080 responsive dark neon compositions plus Product and Shelf Navigation clipping checks at 1024x768, a narrower landscape width, and 1366x768.
