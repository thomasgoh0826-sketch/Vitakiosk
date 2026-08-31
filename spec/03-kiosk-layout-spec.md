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
- Short landscape kiosk viewports up to 820 CSS pixels high must show the complete clinical deck in one view without an internally scrolling center column. The shelf map keeps its 5:3 surface in a compact left-hand pane while aisle/shelf/level and route facts occupy a right-hand pane; subtitle, authoritative product facts, Shelf Navigation, typed input, and the complete Scan Product control must all remain visible with positive spacing and no overlap.
- Typed input responsiveness must not shrink or transform-scale the whole kiosk layout; the approved main panel proportions should fill the available kiosk viewport normally.
- The avatar bay, VRM/Three.js canvas, shelf map, poster, and product cards resize with their containers using fluid sizing, aspect-ratio, CSS Grid/Flexbox, and `clamp()`-style text scales.
- The enlarged shelf route must keep its complete 5:3 map surface inside the viewer at short landscape heights, with hidden-scrollbar touch scrolling available for route metadata when needed.
- VRM mode uses a larger full-body holographic assistant chamber without customer-facing technical renderer labels; Lottie remains the default renderer unless the runtime selects VRM or Three.js.
- VRM orbit/halo decoration is a secondary background effect; it must frame the character without crossing the visible face, torso, arms, hands, or dress.
- The promotion region is a poster composition rather than a small dashboard card.
- The promotion region supports product leaflets, campaign leaflets, active branch-valid galleries, no-product-promotion choices, and enlarged swipeable leaflet gallery display.
- The promotion region shows leaflet artwork/cards directly. A visible `Enlarge Leaflet` button is not accepted; tapping/clicking the leaflet card itself opens the enlarged floating leaflet viewer.
- The normal/collapsed promotion region may show active branch-valid leaflet artwork side by side when the promotion panel is large enough. If there is not enough room, the layout reduces to fewer visible leaflet cards instead of cropping or shrinking artwork into unreadability.
- Every visible collapsed leaflet must preserve its artwork aspect ratio with contain behavior. The top, bottom, logo, title, and footer of each leaflet artwork must remain inside its own frame without distortion or important-content clipping.
- The normal/collapsed promotion region shows only the leaflet artwork itself: no title block, branch/source/validity metadata block, description text, or metadata overlay on top of the artwork. Branch/source/validity/description details belong only in the enlarged leaflet viewer.
- Product-linked active promotion leaflets still take priority when available. When the current product has no product-specific promotion or the product is not found, the first visible leaflet defaults to an active branch-valid campaign leaflet when one exists, while other active leaflets may appear beside it only if space allows.
- A small `Hold to Speak` fallback must not appear as the secondary assistant action in the kiosk layout.
- Shelf navigation is rendered as an indoor map with aisle and shelf blocks, not as a plain progress stepper.
- The map shows a labelled current position, target shelf marker, route line, Aisle, Shelf, Level, and a readable route summary.
- The route uses only VitaFlow-provided shelf location data; unavailable locations are never inferred.
- ERP map rendering must ignore regions marked hidden and constrain malformed region bounds to the map viewport. When the ERP image is an authored branch layout, VitaKiosk avoids duplicating its fixture labels and overlays only the selected product target/route. When the ERP image is the neutral reference shell, VitaKiosk renders every visible ERP region on the same 1200:720 coordinate surface as the reference image so the branch map is neither blank nor misaligned.
- The compact iPad map uses one concise region name per visible VitaFlow region, abbreviates only narrow regions, and uses the current-position marker as the sole entrance label. The enlarged map may restore region type detail, but the active target region suppresses its underlying text so the single target marker remains readable. These presentation rules must not alter VitaFlow coordinates, dimensions, layering, route facts, or region identity.
- Tapping/clicking anywhere on the Shelf Navigation card opens a larger top-level holographic map viewer for customers who need a clearer route. The enlarged viewer must sit above the kiosk UI, keep the active route fully readable, close on outside click or Escape, and keep inside clicks from closing it.
- The enlarged Shelf Navigation viewer must use the same VitaFlow/mock shelf location data as the normal map; it must not generate a new route, infer missing shelf data, or hide the normal pharmacist escalation/safety behavior.
- Short-landscape compact-map grid rules must remain scoped to the inline Shelf Navigation card and must not shrink or split the enlarged viewer. Route and position overlays must render above authoritative VitaFlow regions without changing the regions' own z-index values.
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
- The full typing surface uses normal vertical layout rows for header, textarea, helper text, EN keyboard, and action buttons; the helper row, keyboard rows, and Clear/Done/Send actions must never overlap or cover the textarea.
- Bahasa Melayu text is typed in EN mode because it uses the Latin keyboard.
- The kiosk must not provide a language toggle, Chinese virtual keyboard mode, fake Chinese phrase buttons, BM toggle, or pinyin candidate keyboard. Chinese text entry relies on the device native Chinese IME / pinyin keyboard or an external keyboard through the normal text field.
- The typed input rail and popup keyboard remain touch-friendly and must not create horizontal overflow or awkward document scrolling in the normal 1024x768 landscape kiosk view.
- Dev-only provider/runtime diagnostics must be placed in reserved header space or hidden; they must never use floating positioning that covers AI subtitles, promotion content, product cards, or customer-facing status labels.
- UI translation applies only to kiosk labels and controls. VitaFlow/mock facts such as product names, SKU, prices, shelf codes, branch codes, promotion titles, and `Mock VitaFlow` provenance values must remain unchanged.
- Product, poster, pharmacist, and leaflet icon/artwork containers must use stable square/icon-safe sizing with centered content, safe padding, non-shrinking containers, and `object-fit: contain` for image assets so logos and leaflet artwork are not clipped.
- Product artwork in the normal Product panel, enlarged Product detail sheet,
  enlarged Product summary sheet, and candidate cards must be rendered from
  backend/VitaFlow product image metadata through a reusable `ProductImage`
  component. If the backend provides no usable image, the UI falls back to the
  premium generated initials/icon without a broken-image glyph or layout shift.
- Product card fact rows and inner text must remain inside the Product panel bounds at the supported landscape QA viewports.
- The Product panel must grow or compact its own internals instead of clipping stock, branch, shelf, or source facts; at narrower landscape widths the fact row may wrap into a compact grid, but `scrollHeight`/`scrollWidth` clipping and whole-app transform/zoom fixes are not accepted.
- When the backend returns medium-confidence fuzzy product candidates, the
  center deck shows a compact futuristic `Do you mean this item?` panel before
  the Product card. Candidate cards must be touch-friendly, show product name,
  SKU/code, price, stock, shelf, branch, source, and a simple label such as
  `Best match`, and must not expose technical fuzzy-match terms to customers.
- Selecting a candidate updates the Product panel, Shelf Navigation target,
  Promotion leaflet priority, ERP provenance, and hides the candidate panel
  without inventing product facts.
- The Product panel may transform into a concise product summary state when the product section is tapped/clicked or activated by keyboard. This interaction must feel like a futuristic holographic shift/morph, not a cheap 180-degree flip, and must keep the Product header/source badge in normal safe layout.
- Product summary content must remain safe demo information and must not invent VitaFlow facts, medical advice, diagnosis, stock, price, promotion, or shelf data. The summary state may show localized labels and safe localized text for Ingredient, How to use, Best for, Size, and Description for the currently displayed mock product. Product name, SKU, price, branch, shelf, stock, and `Mock VitaFlow` provenance values remain source-backed and untranslated.
- Product summary mode must not show the visible wording `Back to product details`; tapping/clicking or keyboard activation on the Product panel toggles between source-backed details and summary without a normal web-card back button.
- Product summary cards must use responsive auto-fit wrapping so medium and smaller layouts form two or more readable rows instead of shrinking into tiny cards, overlapping, or clipping content.
- Double-tapping or double-clicking the Product details state opens an enlarged holographic product detail sheet, while double-tapping or double-clicking the Product summary state opens an enlarged holographic product summary sheet. The enlarged Product sheet must render as a top-level floating layer, close on outside click or Escape, keep inside clicks from closing it, avoid a visible X button, and respect reduced-motion users.
- While the enlarged Product sheet is open, a single click/tap inside the sheet
  toggles details and summary with a holographic morph/light-sweep treatment,
  not a normal 180-degree web flip. The same inside click must not close the
  sheet, and double-tap opening must not trigger messy duplicate toggles.
- Enlarged Product detail and summary sheets must not create document/body horizontal overflow or a native horizontal scrollbar flash during open, close, or animation. The overlay must stay within viewport bounds, lock page scrolling while open, use transform/opacity or background-position animation rather than width/left/right overflow, and wrap summary/fact cards safely without shrinking the whole kiosk UI.
- Enlarged leaflet previews must render as a top-level fixed overlay/portal above the entire kiosk UI, not as a big dark modal container, not as a modal box containing another carousel box, and not as a layer visually inserted into the avatar/product/shelf/background panels. The active leaflet image is the centered hero object and touch/mouse/trackpad swipe or drag on the whole floating stage changes the active leaflet.
- Enlarged leaflet previews must use a Moderately Cylindrical floating deck pattern. The active leaflet is centered, largest, facing the customer, fully readable, and fully visible; previous and next leaflets remain visible on the left/right when they exist, smaller, dimmer, pushed back with noticeable but controlled cylindrical depth, and angled outward away from the center card. Spherical, circular, orbit, wheel, coverflow spin, full 3D carousel, inward-pinched side-card orientation, and hidden single-card replacement carousel motion are not accepted.
- Moderate cylindrical deck corrections must not redesign, move, attach, remove, or restyle the enlarged-view metadata panel. Metadata remains separate from the leaflet deck and must not move with the cards.
- The enlarged moderate cylindrical deck must use distinct visual slots for previous, active, and next leaflets instead of a piled/overlapping stack. The active leaflet remains centered and readable, while real side leaflets remain clearly visible around 72% of the active leaflet scale and use moderate treatment around `translateZ(-90px)` and `rotateY(±22deg)` without becoming spherical, wheel-like, or buried behind the center card.
- Side leaflet orientation must follow the cylindrical carousel direction: the previous/left leaflet sits on the left side of the arc, and the next/right leaflet sits on the right side of the arc. In the current CSS perspective this is represented by approximately `rotateY(22deg)` for previous and `rotateY(-22deg)` for next.
- Previous and next leaflet slots must be physically separated from the active leaflet footprint. The side leaflet inner edges must sit outside the active leaflet edges with a visible gap, rather than relying on z-index to hide overlap under the center card. The active card may adapt its width to preserve separated side slots at 1024x768 and 1366x768.
- Leaflet deck swipe animation must move cards along one continuous cylindrical carousel path with controlled snap settling and gentle depth interpolation. The outgoing active leaflet and incoming leaflet must both interpolate through the same curved path during drag instead of one card staying pinned flat while the other slides underneath it. Bounce, overshoot, pop-forward, elastic spring, aggressive active-card scale-up, sudden translateZ jumps, or card bumping toward the user when it becomes active are not accepted.
- During drag and snap, no leaflet may scale above 1, pulse outward, or jump forward in depth. The current active leaflet may move away from the center while being dragged, but it must follow the same moderate cylindrical transform curve as the incoming card.
- Long horizontal drags or trackpad swipes must be distance-based, not forced one-card-at-a-time. If a customer drags far enough across multiple leaflet slots, the deck may jump directly from the third leaflet to the first, or the reverse, with the same controlled no-bounce snap.
- Visible previous/next leaflets must remain fully inside the top-level overlay viewport and must not be clipped by the swipe scene, overlay bounds, or page panels. Non-neighbor/offscreen leaflets should be hidden rather than partially visible and cut at the viewport edge.
- Opening a leaflet must feel like a futuristic holographic expansion from the promotion panel into the foreground overlay, with clean scale/elevation/glow motion. Closing by outside click or Escape must reverse into a smooth collapse/return motion. Reduced-motion mode may simplify the transition, but instant normal modal popups are not accepted.
- Enlarged leaflet previews must reflow metadata beside the leaflet only when width/height is sufficient. In squeezed or short viewports, metadata moves below the hero leaflet or otherwise stays outside the leaflet artwork so no description, validity, branch, or source text overlaps important leaflet content. The enlarged layout must never clip the active leaflet image or let metadata float on top of the leaflet artwork.
- Enlarged leaflet previews must keep the active leaflet clearly in front during swipe/drag. Neighboring leaflets stay within the overlay stage as moderate curved left/right panels and must never appear behind or inside the kiosk page background.
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
- `frontend/src/components/ProductCard.test.tsx`
- `frontend/src/components/avatar/VrmAvatarRenderer.test.tsx`
- Browser screenshot evidence recorded in `reports/test-evidence.md`, including the 1024x768, 1366x768, and 1920x1080 responsive dark neon compositions plus Product and Shelf Navigation clipping checks at 1024x768, a narrower landscape width, and 1366x768.
