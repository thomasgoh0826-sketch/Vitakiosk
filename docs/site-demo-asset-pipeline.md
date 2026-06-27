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
- ERP assets must use safe demo data only.
- If real captures are unavailable, keep assets labelled as `Placeholder`,
  `Prototype`, or `Internal Lab Build`.
- No real customer, sales, payment, patient, or protected ERP release data.
