# VitaKiosk Asia Flagship Site Plan

## Scope

The marketing website lives separately from the stable kiosk demo in `apps/site`.
It runs on `http://127.0.0.1:5176` and does not replace the kiosk frontend on
`5175` or the backend on `8001`.

## Creative Direction

- Cinematic dark AI lab, not a flat SaaS template.
- Desktop-first authored homepage with a hero prologue, orbit ribbon, sticky
  story stage, pinned device-morph showcase, clinic/pharmacy corridor, video
  film strip, commerce console, booking finale, and legal shelf.
- Original VitaKiosk Asia identity: graphite lab environment, cyan source paths,
  clinical green safety accents, controlled violet AI depth, and small amber
  campaign accents.
- Real VitaKiosk screenshots are copied into `apps/site/public/assets/demos`
  and referenced through `apps/site/src/content/demoAssets.ts`.
- VitaFlow ERP media is placeholder-only until safe demo captures exist.

## Homepage Structure

1. Hero scene with device depth, light paths, four business-line nodes, and CTAs.
2. Scroll story: queue problem, VitaKiosk education, VitaFlow source of truth,
   AI Website Studio, AI Academy, and pricing/order/booking CTA.
3. Pinned showcase stage that morphs abstract slab -> iPad -> large kiosk ->
   ERP board -> website/academy split.
4. Clinic/pharmacy partner corridor for where-to-buy guidance without
   endorsement claims.
5. Video film strip with hover/tap previews and modal preview.
6. Commerce console from one central pricing config.
7. Booking finale with premium forms for contact, orders, booking, project
   intake, and mock checkout.
8. Healthcare safety wording and legal route-ready pages.

## Product Media And Vision Readiness

- Product records may expose `imageUrl`, `thumbnailUrl`, and `images[]`.
- The kiosk frontend renders these backend/VitaFlow-driven product images when
  present and keeps the initials fallback only when authoritative media is
  missing.
- `/api/vision/scan-product` is a mock-first readiness endpoint for barcode,
  OCR, image-similarity candidate ranking, confirmation UI, and purchasing
  query fallback.
- Vision scan results never diagnose, prescribe, infer clinical suitability, or
  invent product facts. Product details still come from mock VitaFlow.

## Route-Ready Pages

The React app renders route-ready pages for:

`/`, `/showcase`, `/solutions`, `/vitaflow`, `/vitakiosk`,
`/clinic-pharmacy-partners`, `/ai-website-studio`, `/ai-academy`, `/pricing`,
`/order`, `/book`, `/contact`, `/about`, `/checkout/success`,
`/checkout/cancel`, `/legal/disclaimer`, `/legal/privacy`, and `/legal/terms`.

## Acceptance Mapping

- Creative: scroll-driven hero/story/showcase, pinned device morph, spatial
  scenes, motion-rich CSS, reduced-motion fallback.
- Business: four business lines are explicit and route-ready.
- Video/media: Video film strip, public asset manifest, capture docs,
  Higgsfield prompts, Remotion plan, and HyperFrames plan.
- Commerce: mock payment provider, central pricing config, site API endpoints.
- Safety: no diagnosis, prescription consultation, doctor endorsement, hospital
  recommendation, or pharmacist replacement positioning.
