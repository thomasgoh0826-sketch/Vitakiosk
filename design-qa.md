# Design QA

source visual truth path: `apps/site/public/assets/reference/vitakiosk-demo-approved.png`

implementation screenshot paths: `tmp/site-qa/interactive-demo-screenshot-base.png`, `tmp/site-qa/video-orbit-autonomous.png`, `tmp/site-qa/mobile-vitakiosk-global-ripple.png`

viewport: 1440x900 desktop, plus 390x844 mobile

state: VitaKiosk route interactive demo, homepage video orbit, homepage scroll journey, VitaFlow route

full-view comparison evidence:

- Approved reference inspected with `view_image`.
- Rendered screenshot-first interactive demo inspected with `view_image`.
- Rendered video orbit, route hero, listening state, and mobile screenshots inspected with `view_image`.

focused region comparison evidence:

- Kiosk demo visual: approved screenshot base is visible as `.demo-reference-surface`, full opacity, `object-fit: contain`, no fake avatar/center/right rail panels rendered.
- Kiosk demo interactions: Tap to Speak, product sheet, shelf route overlay, scan, fuzzy match, and staff handoff run as lightweight overlays above the approved screenshot.
- Global backdrop: `.global-liquid-backdrop` is mounted once, fixed, pointer-events none, and pointer variables update from movement outside the demo section.
- Video orbit: center card is large, side cards curve backward, no native scrollbar, no visible previous/next arrow buttons.
- Video orbit motion: idle auto-rotation advances active video, hover pauses it, leaving resumes after idle delay, drag/swipe selection still changes active video.
- Route hero: `/vitaflow` uses a custom route hero and no placeholder copy.
- Mobile: no horizontal overflow at 390x844.

findings:

- No actionable P0/P1/P2 issues remain.
- A route-level scene width issue initially clipped the demo-stage copy; it was fixed by constraining direct route scene children to `min(1540px, calc(100% - 36px))`.
- Video click after drag initially failed because drag state started on pointer-down; it was fixed by enabling drag state only after movement crosses the threshold.
- Homepage `#interactive-demo` anchor into a pinned inactive scene was avoided by routing the showcase CTA to `/vitakiosk#interactive-demo`.
- Orbit resume initially stayed paused because hovered video state could remain set after leaving the shell; shell pointer-leave now clears `hoveredIndex`.
- Listening-state action rail initially inherited the old full-width Tap-to-Speak flex behavior; the rail is now compact and does not cover the screenshot.

patches made since previous QA:

- Replaced pointer-reactive `InteractiveFluidBackdrop` with global `GlobalLiquidBackdrop`.
- Replaced the journey hook with `ScrollSceneController` and bounded pinned duration.
- Rebuilt `SphericalVideoCarousel` around continuous `orbitRotation`, autonomous idle rotation, pause/resume rules, damped drag snapping, hover preview, and no arrows.
- Reworked `InteractiveVitaKioskDemo` around the approved screenshot as the visible base, with transparent hotspots and small state callouts instead of redrawn fake panels.
- Replaced route placeholders with authored route hero scenes and route bodies.
- Added route scene width constraints.

final result: passed
