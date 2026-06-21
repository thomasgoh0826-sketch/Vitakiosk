# VitaKiosk Test Evidence

Evidence date: 2026-06-21

| Evidence | Command | Actual result | Status |
|---|---|---|---|
| Backend tests | `.\.venv\Scripts\python.exe -m pytest backend\tests -q -W error` | 41 passed in 0.20s | Pass |
| Frontend tests | `npm.cmd run test:run --prefix frontend` | 8 files, 26 tests passed | Pass |
| Shelf map component | `npm.cmd run test:run --prefix frontend -- src/components/ShelfMap.test.tsx` | 2 tests passed: route landmarks and unavailable-location non-invention | Pass |
| Frontend build | `npm.cmd run build --prefix frontend` | TypeScript and Vite production build completed; 328.22kB JS before gzip | Pass |
| Dependency audit | `npm.cmd audit --prefix frontend --audit-level=moderate` | 0 vulnerabilities | Pass |
| Repository contract | `node scripts/check-repository.mjs` | Required structure and secret placeholders verified | Pass |
| Spec coverage | `node scripts/check-specs.mjs` | 13 feature specs passed coverage check | Pass |
| Staged-file safety | `node scripts/check-staged-files.mjs` | Run before every task commit; no prohibited staged path | Pass |
| Tracked-file safety | `node scripts/check-staged-files.mjs --tracked` | All tracked paths checked; no prohibited business or secret file | Pass |
| Protected-path declaration | Review `AGENTS.md`, README, architecture, and spec 07 | Protected ERP release directory is explicitly out of scope and was not accessed | Pass |
| iPad landscape visual QA | In-app Browser at 1024×768 | 7 regions; document 1024×768; no overflow; no old `.shelf-route` stepper; no framework overlay or console errors/warnings | Pass |
| Shelf map screenshot | In-app Browser `tab.screenshot({ fullPage: false })` | Cyan route, purple target marker, current-position marker, aisle blocks, and Aisle/Shelf/Level details are visible | Pass |
| Narrow responsive QA | In-app Browser at 390×844 | 7 regions; document width 375px within viewport; no horizontal overflow; no console errors/warnings | Pass |
| Escalation interaction QA | Click `Request assistance` on localhost | Avatar changed to `Pharmacist requested`, escalation ID appeared, Hold disabled | Pass |
| Microphone interaction QA | Browser permission and hold/release | Automated MediaRecorder boundary is covered; physical microphone permission was not granted | Not manually verified |

Automated evidence uses fictional mock data and no live provider credential.

## Visual fidelity ledger

| Comparison point | Concept evidence | Render evidence | Result |
|---|---|---|---|
| Layout | Left assistant rail plus five right-side information regions | Same structure fits 1024×768 without scroll | Matched |
| Palette | True white, navy, teal/mint, coral escalation | Computed render and screenshots preserve the same roles | Matched |
| Typography and controls | Large wordmark, clear panel titles, large hold control | Hierarchy is preserved; Hold control is 84px high | Matched |
| Data and safety copy | Mock VitaFlow, SG-001, fictional Relief Balm offer | Exact mock provenance and no diagnosis or real medicine claim | Matched |
| Shelf navigation | Concept stepper was identified as incorrect | Dark indoor floor map with cyan route, purple target, entrance marker, shelf blocks, and location readouts | Corrected per approved map design |
| Product visual | Concept contains generated fictional packaging | Demo uses a neutral `RE` monogram so no packaging detail is mistaken for ERP truth | Intentional safety deviation |
| Extra footer controls | Concept proposed two unrequested reset/search controls | Omitted because they were not part of the approved feature scope | Intentional scope deviation |

Concept: `assets/design/vitakiosk-kiosk-concept.png`.

Shelf map acceptance screenshot: [iPad landscape route map](evidence/shelf-map-ipad-landscape.png).

The shelf map screenshot is committed because `spec/13-acceptance-standard.md` explicitly requires map-route screenshot evidence. Other temporary browser QA artifacts remain outside the repository.
