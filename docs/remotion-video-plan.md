# Remotion Video Plan

## Goal

Use Remotion later for web-renderable motion graphics that can become hero loops,
section transitions, and product demo explainers without committing huge raw
videos.

## Proposed Composition IDs

- `HeroLabLoop`: light paths connect VitaFlow, VitaKiosk, AI Website Studio, and
  AI Academy around a device capture.
- `QueueToKioskStory`: six-scene explainer matching the homepage scroll story.
- `ProductDemoExplainer`: real kiosk captures in iPad and large kiosk frames.
- `PricingOrderFlow`: mock checkout, booking, deposit, and quote flow diagram.

## Asset Inputs

- Real VitaKiosk screenshots from `apps/site/public/assets/demos/vitakiosk/`.
- Replaceable ERP screenshots from a safe demo capture.
- Poster art from `apps/site/src/content/demoAssets.ts`.
- No raw videos committed; use `tmp/site-video-raw/` during local production.

## Homepage-Matched Motion Beats

- 0-4s: abstract slab wakes with cyan source path.
- 4-8s: slab resolves into iPad product education.
- 8-12s: iPad grows into large kiosk presence.
- 12-16s: kiosk surface pulls back into VitaFlow ERP board.
- 16-20s: board splits into AI Website Studio and AI Academy.

## Render Guidance

- 1920x1080, 30fps for website hero loops.
- 1080x1920 variants for social ads only after approval.
- Muted web loops by default.
- Use text large enough for video render: 60px+ headlines, 20px+ body.
- Respect healthcare wording in `docs/site-compliance-wording.md`.
