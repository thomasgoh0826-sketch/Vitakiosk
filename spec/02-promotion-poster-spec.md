# Promotion and Poster Specification

## Purpose

Show only eligible promotions, campaign leaflets, product leaflets, and posters for the current branch.

## Behavior

Promotion and campaign leaflet eligibility requires `active=true`, an exact branch match, and a current validity window. Product-specific leaflets must also include the current product ID. Category-linked leaflets must use adapter-provided category tags only. Idle posters must reference an eligible promotion.

The Kiosk loads the current branch's eligible leaflet deck from a read-only endpoint on startup. If one or more eligible leaflets exist, the promotion panel shows a default leaflet before the first AI request. A spoken or typed promotion/campaign request may choose and enlarge the matching leaflet, but the enlarged viewer retains the complete eligible branch deck for swipe browsing.

When `VITAFLOW_PROVIDER=readonly_api`, the leaflet selector must be backed by the same VitaFlow adapter as product lookup. Mock leaflets must not be mixed into a live VitaFlow response. A product-specific promotion or campaign request exposes only leaflets linked to that product; the full branch deck is reserved for an explicit general promotion/campaign browsing request.

When VitaFlow supplies dedicated `posterImageUrl` artwork, the Kiosk must display that completed leaflet artwork ahead of the product `imageUrl`. The product image is only a degraded fallback for an eligible VitaFlow record that does not yet have dedicated leaflet artwork; it must not replace a saved poster.

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
- `GET /api/leaflets/active` returns only current, active leaflets for the requested branch and preserves source-of-truth ordering.
- Before the first AI answer, the promotion panel displays an eligible current-branch leaflet when the active leaflet endpoint returns one.
- A requested promotion/campaign leaflet opens as the active enlarged card while all other eligible current-branch leaflets remain available by swipe.
- Product promotion leaflets appear automatically only when they are active, current, and branch-valid.
- Product with no specific promotion or no matched product defaults the panel to an active branch-valid campaign leaflet when one exists, while still allowing touch-friendly promotion/campaign browsing.
- The normal promotion panel uses a responsive leaflet grid driven by the panel container. Narrow or short panels show one primary leaflet that fills the available frame; wider/taller panels may reveal additional active branch-valid promotion/campaign leaflets without shrinking them into tiny cards.
- Leaflet ordering is deterministic and source-of-truth based: product-linked active promotion first, then related campaign when available, then other active branch-valid leaflets. If no product-specific promotion exists or the product is not found, an active campaign leaflet is first.
- General promotion/campaign questions show active branch-valid leaflets in a horizontal carousel/gallery with direct leaflet card touch targets.
- A general promotion question names only the current branch's active, date-valid promotion titles before opening the first promotion leaflet. A general campaign question names only the current branch's active, date-valid campaign titles before opening the first campaign leaflet; neither answer may invent or mix the other leaflet kind into its spoken summary.
- Mixed Chinese/English general leaflet questions such as `有什么promotion` and `有什么campaign`, plus the common `caimpaign` misspelling, retain their requested promotion/campaign intent instead of falling through to product search.
- API-shaped leaflet actions may contain nullable fields for the non-target leaflet kind. A non-empty `campaignId` must still open its campaign even when `promotionId` is present as `null`, and vice versa.
- The normal promotion panel must not show a visible `Enlarge Leaflet` button; the leaflet artwork/card itself is the touch target that opens the enlarged viewer.
- A VitaFlow `posterImageUrl` is rendered as the leaflet artwork even when the same record also includes a product `imageUrl`.
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
