# VitaKiosk Asia Flagship Site Plan

## Scope

The marketing website lives separately from the stable kiosk demo in `apps/site`.
It runs on `http://127.0.0.1:5176` and does not replace the kiosk frontend on
`5175` or the backend on `8001`.

## Creative Direction

- Cinematic dark AI lab, not a flat SaaS template.
- Scroll-driven homepage with a hero lab, sticky story stage, spatial showcase,
  video hub, pricing framework, and order/booking console.
- Original VitaKiosk Asia identity: graphite lab environment, cyan source paths,
  clinical green safety accents, controlled violet AI depth, and small amber
  campaign accents.
- Real VitaKiosk screenshots are used through `apps/site/src/content/demoAssets.ts`.
- VitaFlow ERP media is placeholder-only until safe demo captures exist.

## Homepage Structure

1. Hero scene with device depth, light paths, four business-line nodes, and CTAs.
2. Scroll story: queue problem, VitaKiosk education, VitaFlow source of truth,
   AI Website Studio, AI Academy, and pricing/order/booking CTA.
3. Spatial showcase for iPad kiosk, large kiosk, ERP, partner flow, website
   studio, and academy.
4. Video hub with animated preview tiles and modal preview.
5. Pricing framework from one central config.
6. Premium forms for contact, orders, booking, project intake, and mock checkout.
7. Healthcare safety wording and legal route-ready pages.

## Route-Ready Pages

The React app renders route-ready pages for:

`/`, `/showcase`, `/solutions`, `/vitaflow`, `/vitakiosk`,
`/clinic-pharmacy-partners`, `/ai-website-studio`, `/ai-academy`, `/pricing`,
`/order`, `/book`, `/contact`, `/about`, `/checkout/success`,
`/checkout/cancel`, `/legal/disclaimer`, `/legal/privacy`, and `/legal/terms`.

## Acceptance Mapping

- Creative: scroll-driven hero/story/showcase, spatial scenes, motion-rich CSS,
  reduced-motion fallback.
- Business: four business lines are explicit and route-ready.
- Video/media: Video Hub, asset manifest, capture docs, Higgsfield prompts,
  Remotion plan, and HyperFrames plan.
- Commerce: mock payment provider, central pricing config, site API endpoints.
- Safety: no diagnosis, prescription consultation, doctor endorsement, hospital
  recommendation, or pharmacist replacement positioning.
