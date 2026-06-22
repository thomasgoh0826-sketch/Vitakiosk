# VitaKiosk Test Evidence

Evidence date: 2026-06-22

| Evidence | Command | Actual result | Status |
|---|---|---|---|
| Backend health | `Invoke-WebRequest http://127.0.0.1:8000/health` | `{"status":"ok","service":"vitakiosk-api","provider_mode":"mock"}` | Pass |
| Backend tests | `.\.venv\Scripts\python.exe -m pytest backend\tests -q -W error` | 45 passed | Pass |
| Controlled provider config | `.\.venv\Scripts\python.exe -m pytest backend\tests\test_provider_config.py -q` | 4 passed: provider selectors default to mock, credentials do not auto-enable live providers, invalid selectors fail closed | Pass |
| Frontend tests | `npm.cmd run test:run --prefix frontend` | 14 files, 58 tests passed | Pass |
| Optional Three.js and VRM avatar renderers | `npm.cmd run test:run --prefix frontend -- src/components/avatar/AvatarRenderer.test.ts src/components/avatar/AvatarModel.test.ts src/components/AvatarAssistant.test.tsx src/components/avatar/VrmAvatarRenderer.test.tsx src/hooks/useAvatarIdleMotion.test.ts src/hooks/useAvatarLipSync.test.ts` | 6 files, 36 tests passed; Lottie default, Three.js renderer state accessibility, VRM renderer state accessibility, config selection, GLB/VRM model URL resolution, VRM-backed marker, fallback marker, expression mapping, reduced-motion idle stability, and amplitude-based mouth movement covered | Pass |
| GLB humanoid avatar asset | Review `frontend/src/assets/avatar/vitakiosk-avatar.glb` and `docs/avatar-model.md` | Lightweight fictional GLB placeholder exists at the reviewed path; docs explain self-hosted model replacement, licensing, performance, no-runtime-service, and fallback constraints | Pass |
| VRM self-hosted avatar asset | Review `frontend/src/assets/avatar/vita.vrm`, `docs/avatar-model.md`, and `spec/04-ai-avatar-spec.md` | User-provided local VRM demo model exists at the reviewed self-hosted path; renderer supports `VITE_AVATAR_RENDERER=vrm`, idle motion, blinking, expression mapping, amplitude lip sync, and safe fallback; model is about 15.37 MB and should be optimized before production use when practical | Pass |
| VRM pose and portrait runtime QA | In-app Browser at 1024×768 with `VITE_AVATAR_RENDERER=vrm`; screenshot review `reports/evidence/vrm-avatar-pose-framing-1024x768.png` | Runtime evidence shows `data-avatar-renderer="vrm"`, `data-avatar-framing="portrait"`, self-hosted VRM model active, upper-body framing, visible face lighting, and no horizontally stretched T-pose arms | Pass |
| Three.js avatar runtime QA | `$env:VITE_AVATAR_RENDERER='threejs'; npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5174`; in-app Browser at 1024x768 | Runtime DOM reported `data-avatar-renderer="threejs"`, WebGL `available`, `canvasCount=1`, `lottieCount=0`, viewport/document 1024x768; screenshot saved to `reports/evidence/threejs-avatar-renderer-1024x768.png` | Pass |
| Shelf map component | `npm.cmd run test:run --prefix frontend -- src/components/ShelfMap.test.tsx` | 2 tests passed: route landmarks and unavailable-location non-invention | Pass |
| Frontend build | `npm.cmd run build --prefix frontend` | TypeScript and Vite production build completed; default bundle 335.72kB JS before gzip, optional lazy ThreeAvatarRenderer chunk 80.26kB, VrmAvatarRenderer chunk 194.40kB, AvatarModel chunk 861.88kB, and local VRM asset 15,369.46kB | Pass |
| Dependency audit | `npm.cmd audit --prefix frontend --audit-level=moderate` | 0 vulnerabilities | Pass |
| Repository contract | `node scripts/check-repository.mjs` | Required structure and secret placeholders verified | Pass |
| Spec coverage | `node scripts/check-specs.mjs` | 13 feature specs passed coverage check | Pass |
| Staged-file safety | `node scripts/check-staged-files.mjs` | Run before every task commit; no prohibited staged path | Pass |
| Tracked-file safety | `node scripts/check-staged-files.mjs --tracked` | All tracked paths checked; no prohibited business or secret file | Pass |
| Protected-path declaration | Review `AGENTS.md`, README, architecture, and spec 07 | Protected ERP release directory is explicitly out of scope and was not accessed | Pass |
| Dark neon iPad landscape QA | In-app Browser at 1024×768 | Viewport 1024×768; document 1024×768; dark gradient body background; 9 accessible regions; console errors/warnings: 0 | Pass |
| Refined premium kiosk visual QA | In-app Browser at 1024x768 | Viewport 1024x768; document 1024x768; no light dashboard panels; holographic avatar, poster campaign display, stronger shelf route map, compact ERP panel, and safety control panel verified; console errors/warnings: 0 | Pass |
| Tap voice control QA | Click primary `Tap to Speak` | Ready label present; click entered permission-error path because microphone permission was not granted; `Try Again` and accessible error feedback verified; real listening/Tap to Stop transition not manually verified | Permission boundary |
| Cinematic kiosk screenshot | In-app Browser `tab.screenshot({ fullPage: false })` | Dark AI bay, primary Tap to Speak, poster-style promotion, shelf map route, ERP provenance, and pharmacist safety panel visible | Pass |
| Shelf map screenshot | In-app Browser `tab.screenshot({ fullPage: false })` | Cyan route, purple target marker, current-position marker, aisle blocks, and Aisle/Shelf/Level details are visible | Pass |
| Narrow responsive QA | In-app Browser at 390×844 | 7 regions; document width 375px within viewport; no horizontal overflow; no console errors/warnings | Pass |
| Escalation interaction QA | Click `Request assistance` on localhost | Avatar changed to `Pharmacist requested`; escalation ID `ESC-0002` appeared; primary voice button changed to disabled `Pharmacist Requested` | Pass |
| Microphone interaction QA | Browser permission and hold/release | Automated MediaRecorder boundary is covered; physical microphone permission was not granted | Not manually verified |

Automated evidence uses fictional mock data and no live provider credential.

## Visual fidelity ledger

| Comparison point | Concept evidence | Render evidence | Result |
|---|---|---|---|
| Layout | Approved B direction uses left AI bay, center conversation/product/map deck, and right retail/safety rail | Render fits 1024×768 exactly with no document scroll | Matched |
| Palette | Approved direction requires dark navy/black, cyan route/glow, purple AI/promo accents, glass panels | Computed body background is dark gradient; screenshot has no white dashboard surface | Matched |
| Voice control | Main interaction must be `Tap to Speak`, with hold-to-speak only as fallback | Primary button is `Tap to Speak`; Hold appears only inside secondary fallback | Matched |
| Avatar | Approved direction requires a futuristic AI assistant screen, not a childish/simple face | Render uses holographic core, scanning ring, waveform, and state label | Matched |
| Promotion | Promotion must look like a poster and only show active branch-aware mock promotion data | Poster frame shows active SG-001 promotion, mock VitaFlow price lockup, validity, mock label, and no invented discount | Matched |
| Shelf navigation | Required as an indoor pharmacy map with current marker, target marker, route, aisle/shelf/level | Screenshot shows Entrance, Aisle 03, Shelf A-03, Level 02, cyan route, purple target | Matched |
| ERP and safety | ERP must be small floating system panel; pharmacist panel must be safety/escalation oriented | Render shows Mock VitaFlow, SG-001, Mock mode, no customer data, and AI-not-pharmacist safety copy | Matched |
| Data and safety copy | VitaFlow/mock data is source of truth; no diagnosis, no customer data, no invented stock/price/location | Render uses existing mock product, price, stock, shelf, branch, promotion, and safety messaging only | Matched |
| Voice permission | Browser microphone permission was not granted during QA | Error path and `Try Again` state verified; real listening path remains covered by code contract and automated MediaRecorder tests only | Intentional evidence limitation |

Concept: `docs/superpowers/specs/2026-06-21-dark-neon-cinematic-kiosk-design.md` and the approved visual companion B direction.

Shelf map acceptance screenshot: [iPad landscape route map](evidence/shelf-map-ipad-landscape.png).

Dark neon kiosk acceptance screenshot: [1024 × 768 Cinematic AI Bay](evidence/dark-neon-kiosk-ipad-landscape.png).

Refined premium kiosk screenshot: [1024x768 dark neon visual polish](evidence/dark-neon-kiosk-refined-1024x768.png).

VRM pose/framing screenshot: [1024x768 VRM assistant portrait](evidence/vrm-avatar-pose-framing-1024x768.png).

The committed screenshots are limited to mock data and contain no real customer, sales, database, log, backup, token, password, or ERP release data.
