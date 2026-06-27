# Design QA

source visual truth path: `apps/site/public/assets/reference/vitakiosk-demo-approved.png`

implementation screenshot path: `tmp/site-qa/interactive-demo-section.png`

viewport: 1440x900 desktop, plus 390x844 mobile

state: VitaKiosk route interactive demo, homepage video orbit, homepage scroll journey, VitaFlow route

full-view comparison evidence:

- Approved reference inspected with `view_image`.
- Rendered interactive demo screenshot inspected with `view_image`.
- Rendered video orbit, homepage, and mobile screenshots inspected with `view_image`.

focused region comparison evidence:

- Kiosk demo visual: approved screenshot base is visible as `.demo-reference-surface`, with interactive React hotspots and state overlays above it.
- Video orbit: center card is large, side cards curve backward, no native scrollbar.
- Route hero: `/vitaflow` uses a custom route hero and no placeholder copy.
- Mobile: no horizontal overflow at 390x844.

findings:

- No actionable P0/P1/P2 issues remain.
- A route-level scene width issue initially clipped the demo-stage copy; it was fixed by constraining direct route scene children to `min(1540px, calc(100% - 36px))`.
- Video click after drag initially failed because drag state started on pointer-down; it was fixed by enabling drag state only after movement crosses the threshold.
- Homepage `#interactive-demo` anchor into a pinned inactive scene was avoided by routing the showcase CTA to `/vitakiosk#interactive-demo`.

patches made since previous QA:

- Added pointer-reactive `InteractiveFluidBackdrop`.
- Replaced the journey hook with `ScrollSceneController` and bounded pinned duration.
- Rebuilt `SphericalVideoCarousel` with continuous drag progress, damped velocity, hover preview, and post-drag click reliability.
- Reworked `InteractiveVitaKioskDemo` around the approved screenshot reference layer plus accessible interactive surfaces.
- Replaced route placeholders with authored route hero scenes and route bodies.
- Added route scene width constraints.

final result: passed
