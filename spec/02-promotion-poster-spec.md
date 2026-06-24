# Promotion and Poster Specification

## Purpose

Show only eligible promotions, campaign leaflets, product leaflets, and posters for the current branch.

## Behavior

Promotion and campaign leaflet eligibility requires `active=true`, an exact branch match, and a current validity window. Product-specific leaflets must also include the current product ID. Category-linked leaflets must use adapter-provided category tags only. Idle posters must reference an eligible promotion.

The backend may return structured `ui_actions` to request a leaflet, gallery, enlarged leaflet preview, or pharmacist handoff. The frontend executes only whitelisted actions and must ignore arbitrary or unknown action types. Accepted leaflet action names include `SHOW_PROMOTION_LEAFLET`, `SHOW_CAMPAIGN_LEAFLET`, `OPEN_PROMOTION_LEAFLET`, `OPEN_CAMPAIGN_LEAFLET`, `SHOW_LEAFLET_GALLERY`, and the older modal aliases that map to the same controlled preview behavior.

## Safety constraints

- Do not create promotional claims from AI output.
- Do not show inactive, expired, future, or other-branch promotions.
- Do not show inactive, expired, future, or other-branch campaign leaflets.
- Mock posters contain no medical efficacy claim.
- Pharmacist escalation overrides promotion/campaign browsing.

## Acceptance criteria

- `MOCK-PR001` appears for `MOCK-P001` at `SG-001` on 2026-06-21.
- Wrong-branch and inactive promotions are excluded.
- `MOCK-POSTER001` is the only eligible idle poster for `SG-001`.
- Product promotion leaflets appear automatically only when they are active, current, and branch-valid.
- Product with no specific promotion or no matched product defaults the panel to an active branch-valid campaign leaflet when one exists, while still allowing touch-friendly promotion/campaign browsing.
- The normal promotion panel uses a responsive leaflet grid driven by the panel container. Narrow or short panels show one primary leaflet that fills the available frame; wider/taller panels may reveal additional active branch-valid promotion/campaign leaflets without shrinking them into tiny cards.
- Leaflet ordering is deterministic and source-of-truth based: product-linked active promotion first, then related campaign when available, then other active branch-valid leaflets. If no product-specific promotion exists or the product is not found, an active campaign leaflet is first.
- General promotion/campaign questions show active branch-valid leaflets in a horizontal carousel/gallery with direct leaflet card touch targets.
- The normal promotion panel must not show a visible `Enlarge Leaflet` button; the leaflet artwork/card itself is the touch target that opens the enlarged viewer.
- The enlarged leaflet viewer is a clean floating holographic card over the existing kiosk UI. It supports swipe/drag/trackpad browsing and keyboard arrows as accessibility fallback, moves metadata below the leaflet when space is tight, clips only transformed stage overflow that would otherwise cross into the metadata area, and omits visible X, Previous/Next buttons, dots, page counters, and large modal title/header copy.
- Unknown frontend action types are ignored and never executed.
- The UI labels promotion data as fictional mock data.

## Test evidence

- `backend/tests/test_services.py`
- `backend/tests/test_api.py`
- `frontend/src/App.integration.test.tsx`
- `frontend/src/components/PromotionPoster.test.tsx`
- `frontend/src/components/LeafletModal.test.tsx`
- `frontend/src/typedInputLayout.test.ts`
