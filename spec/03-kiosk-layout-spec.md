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
- The primary landscape view uses a dark navy/black cinematic foundation, glass panels, cyan and purple neon accents, and no plain white dashboard background.
- The primary voice interaction reads `Tap to Speak` when ready and `Tap to Stop` while listening.
- The secondary assistant action reads `Start` or `Start New Customer` and resets the kiosk for a fresh customer session without a browser refresh.
- The top center conversation area is a cinematic AI subtitle panel; the customer transcript is hidden from the normal customer-facing kiosk UI and may appear only behind an explicit debug/dev flag.
- AI subtitle copy appears as the current phrase or sentence, with a maximum 1-2 visible lines, large readable type, and no raw JSON, provider names, technical debug wording, or chat-style `YOU` bubble.
- During thinking or audio preparation, the AI subtitle area shows safe customer-facing progress text such as `Preparing answer…`.
- Idle, listening, error, and pharmacist escalation states use short subtitle/status copy rather than replaying a full previous AI paragraph.
- At 1024x768 landscape, the assistant bay, conversation/product deck, promotion poster, shelf map, ERP panel, and pharmacist safety panel fit in one view without document scrolling.
- The kiosk layout uses responsive grid/flex sizing rather than fixed pixel-only placement; target QA viewports include 1024x768, 1280x720, 1366x768, 1440x900, 1920x1080, and iPad portrait/narrow tablet fallback.
- Landscape kiosk viewports must not create horizontal overflow and should fit the full assistant/product/promotion/shelf/ERP/safety surface in one viewport without document scrolling.
- Portrait and narrow tablet viewports may scroll vertically, but product, shelf map, promotion poster, ERP data, pharmacist assistance, and the primary voice button must remain readable and non-overlapping.
- The avatar bay, VRM/Three.js canvas, shelf map, poster, and product cards resize with their containers using fluid sizing, aspect-ratio, CSS Grid/Flexbox, and `clamp()`-style text scales.
- VRM mode uses a larger full-body holographic assistant chamber without customer-facing technical renderer labels; Lottie remains the default renderer unless the runtime selects VRM or Three.js.
- VRM orbit/halo decoration is a secondary background effect; it must frame the character without crossing the visible face, torso, arms, hands, or dress.
- The promotion region is a poster composition rather than a small dashboard card.
- The promotion region supports product leaflets, campaign leaflets, active branch-valid galleries, no-product-promotion choices, and enlarged leaflet modal display.
- A small `Hold to Speak` fallback must not appear as the secondary assistant action in the kiosk layout.
- Shelf navigation is rendered as an indoor map with aisle and shelf blocks, not as a plain progress stepper.
- The map shows a labelled current position, target shelf marker, route line, Aisle, Shelf, Level, and a readable route summary.
- The route uses only VitaFlow-provided shelf location data; unavailable locations are never inferred.
- A typed accessibility input panel appears below Shelf navigation for customers who cannot or prefer not to speak.
- The typed input panel has a clear `Type your question` label, visible placeholder, send action, clear action, and no raw debug/customer data.
- In popup keyboard mode, the typed input can open a dark neon touch keyboard with English, Chinese, and Bahasa Melayu modes; in native mode, the custom keyboard is not forced.
- The typed input and popup keyboard remain touch-friendly and must not create horizontal overflow or awkward document scrolling in the normal 1024x768 landscape kiosk view.

## Test evidence

- `frontend/src/App.test.tsx`
- `frontend/src/App.integration.test.tsx`
- `frontend/src/components/TypedInputPanel.tsx`
- `frontend/src/components/VirtualKeyboard.tsx`
- `frontend/src/components/AiSubtitle.test.tsx`
- `frontend/src/hooks/useSubtitlePlayback.test.ts`
- `frontend/src/components/ShelfMap.test.tsx`
- `frontend/src/components/avatar/VrmAvatarRenderer.test.tsx`
- Browser screenshot evidence recorded in `reports/test-evidence.md`, including the 1024x768, 1366x768, and 1920x1080 responsive dark neon compositions.
