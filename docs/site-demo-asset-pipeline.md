# Site Demo Asset Pipeline

## Manifest

All marketing-site demo media is controlled in:

```text
apps/site/src/content/demoAssets.ts
```

It controls:

- the approved VitaKiosk screenshot reference
- the interactive VitaKiosk demo replacement point
- VitaFlow ERP screenshots
- VitaFlow ERP videos
- spherical video carousel posters and preview loops
- showcase scene metadata

Do not hardcode media paths inside components.

## Public Asset Folders

The site bundle reads browser-safe files from:

```text
apps/site/public/assets/reference/
apps/site/public/assets/demos/vitaflow/
apps/site/public/assets/videos/higgsfield/
apps/site/public/assets/posters/higgsfield/
apps/site/public/assets/loops/hero/
```

Every manifest entry includes a `replacementPath` so future captures can be
swapped without searching through components.

## Raw Capture Location

Use ignored local folders:

```text
tmp/site-captures/
tmp/site-video-raw/
```

Do not commit huge raw videos.

## VitaKiosk Capture Targets

- home/default screen
- product panel
- promotion leaflet enlarged
- "Do you mean Relief Balm?" fuzzy match
- enlarged product detail
- enlarged product summary
- shelf navigation
- pharmacist assistance state
- voice flow if possible

## Replacement Rules

- The current site uses only `apps/site/public/assets/reference/vitakiosk-demo-approved.png`
  as the local VitaKiosk UI reference.
- The public VitaKiosk demo uses that approved screenshot as a visual base
  surface plus interactive React layers. Do not replace the demo with a single
  static `<img>`.
- If the approved screenshot changes, replace only
  `apps/site/public/assets/reference/vitakiosk-demo-approved.png` and keep the
  hotspot/state layer active.
- ERP assets must use safe demo data only. This repository must not access the
  protected VitaFlow release path.
- The committed carousel clips are lightweight generated web preview loops.
  Replace them with approved Higgsfield exports under the same manifest paths
  when campaign clips are ready.
- If real captures are unavailable, keep assets labelled as `Placeholder`,
  `Prototype`, or `Internal Lab Build`.
- No real customer, sales, payment, patient, or protected ERP release data.

## Current Generated Web Assets

Generated preview loops live in:

```text
apps/site/public/assets/videos/higgsfield/
```

Generated posters live in:

```text
apps/site/public/assets/posters/higgsfield/
```

Current items:

- Clinic Queue Problem
- Pharmacy Partner Discovery
- Retail Pharmacy Promotion
- VitaKiosk Interactive Demo
- VitaFlow Source of Truth
- AI Website Studio
- AI Academy

Keep raw or oversized generated videos in ignored folders such as
`tmp/site-video-raw/`; do not commit raw source exports.

## Product Images

The kiosk app product image square is backend-driven:

- Preferred fields: `thumbnailUrl`, `imageUrl`, `images[0]`.
- Legacy tolerated fields: `thumbnail_url`, `image_url`.
- If no authoritative image is present, the UI displays the existing initials
  fallback instead of inventing a product image.

Mock product SVGs live in `frontend/public/assets/products/` and are fictional.
