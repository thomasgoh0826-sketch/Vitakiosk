# AI controlled UI auto-enlarge actions evidence

Evidence date: 2026-06-29

## Scope

Controlled, whitelisted `ui_actions` now open existing VitaKiosk UI overlays
without arbitrary button clicking:

- `OPEN_PRODUCT_DETAIL` opens the Product detail sheet for the current
  VitaFlow/mock product.
- `OPEN_PROMOTION_MODAL` opens the active branch-valid promotion leaflet.
- `OPEN_SHELF_MAP` opens the enlarged Shelf Navigation route map.
- `REQUEST_PHARMACIST_ASSISTANCE` keeps safety escalation ahead of all
  product, promotion, and shelf auto-open actions.

Unknown or malformed action payloads are ignored by the frontend.

## TDD evidence

- RED backend: `python -m pytest backend/tests/test_ai_brain.py -q` failed
  before implementation because price/detail, promotion, shelf, and pregnancy
  safety action expectations were not met.
- RED frontend: `npm.cmd run test:run --prefix frontend -- App.integration.test.tsx --reporter=dot`
  failed before implementation because `OPEN_PRODUCT_DETAIL` and
  `OPEN_SHELF_MAP` did not open overlays.
- GREEN targeted backend: `python -m pytest backend/tests/test_ai_brain.py -q`
  passed with 33 tests.
- GREEN targeted frontend: `npm.cmd run test:run --prefix frontend -- App.integration.test.tsx --reporter=dot`
  passed with 35 tests.
- Full backend verification: `python -m pytest backend/tests -v` passed with
  168 tests.
- Full frontend verification: `npm.cmd run test:run --prefix frontend` passed
  with 23 files and 198 tests.

No `.env`, API keys, audio files, camera frames, logs, model cache, customer
data, or sales data are part of this evidence.
