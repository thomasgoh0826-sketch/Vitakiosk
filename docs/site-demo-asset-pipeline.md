# Site Demo Asset Pipeline

## Manifest

All marketing-site demo media is controlled in:

```text
apps/site/src/content/demoAssets.ts
```

It controls:

- VitaKiosk iPad screenshots
- VitaKiosk iPad videos
- VitaKiosk large kiosk screenshots
- VitaKiosk large kiosk videos
- VitaFlow ERP screenshots
- VitaFlow ERP videos
- showcase posters
- video hub assets

Do not hardcode media paths inside components.

## Public Asset Folders

The site bundle reads browser-safe files from:

```text
apps/site/public/assets/demos/vitakiosk/ipad/
apps/site/public/assets/demos/vitakiosk/kiosk/
apps/site/public/assets/demos/vitaflow/
apps/site/public/assets/videos/
apps/site/public/assets/posters/
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

- Real kiosk screenshots must come from the current mock demo or a reviewed safe
  capture.
- ERP assets must use safe demo data only. This repository must not access the
  protected VitaFlow release path.
- If real captures are unavailable, keep assets labelled as `Placeholder`,
  `Prototype`, or `Internal Lab Build`.
- No real customer, sales, payment, patient, or protected ERP release data.

## Product Images

The kiosk app product image square is backend-driven:

- Preferred fields: `thumbnailUrl`, `imageUrl`, `images[0]`.
- Legacy tolerated fields: `thumbnail_url`, `image_url`.
- If no authoritative image is present, the UI displays the existing initials
  fallback instead of inventing a product image.

Mock product SVGs live in `frontend/public/assets/products/` and are fictional.
