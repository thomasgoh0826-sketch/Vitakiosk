# VitaKiosk Asia Site Plan

## Purpose

`apps/site` is the first standalone version of `vitakiosk.asia` for the VitaKiosk Asia / VitaKiosk Labs parent brand. It is separate from the kiosk demo app in `frontend`, so the existing kiosk remains on `http://127.0.0.1:5175` and the new site runs on `http://127.0.0.1:5176`.

## Information Architecture

Routes:

- `/`
- `/vitaflow`
- `/vitakiosk`
- `/clinic-pharmacy-partners`
- `/ai-website-studio`
- `/ai-academy`
- `/showcase`
- `/pricing`
- `/order`
- `/book`
- `/contact`
- `/about`
- `/checkout/success`
- `/checkout/cancel`
- `/legal/disclaimer`
- `/legal/privacy`
- `/legal/terms`

## Conversion Flow

Homepage visitors can move into four business lines:

- VitaFlow ERP subscription inquiry.
- VitaKiosk order or partner campaign inquiry.
- AI Website Studio project intake.
- AI Academy lesson or training booking.

Payment CTAs use mock checkout only. Quote-based items route to contact or order forms.

## Acceptance Criteria

- Site exists as `apps/site`.
- Homepage explains all four business lines.
- Clinic/hospital/pharmacy partner model is present.
- Showcase reads media from one manifest.
- Video hub has poster fallbacks and modal playback.
- Pricing, order, booking, checkout success, and checkout cancel routes exist.
- Healthcare safety disclaimer and sponsored-content note are visible.
- No live payment, no card collection, no provider secret in frontend.
- Existing kiosk frontend and backend ports are unchanged.

## Test Evidence Mapping

- Site route and content render: `apps/site/src/App.test.tsx`.
- Pricing framework: `apps/site/src/content/pricing.test.ts`.
- Demo asset manifest: `apps/site/src/content/demoAssets.test.ts`.
- Form validation: `apps/site/src/lib/validation.test.ts`.
- Payment abstraction: `apps/site/src/payment/providers.test.ts`.
- Backend site API and mock checkout: `backend/tests/test_site_api.py`.
