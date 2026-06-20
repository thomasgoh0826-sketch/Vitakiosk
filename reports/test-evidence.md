# VitaKiosk Test Evidence

Evidence date: 2026-06-21

| Evidence | Command | Actual result | Status |
|---|---|---|---|
| Backend tests | `.\.venv\Scripts\python.exe -m pytest backend\tests -v -W error` | 41 passed before documentation task | Pass |
| Frontend tests | `npm.cmd run test:run --prefix frontend` | 23 passed before documentation task | Pass |
| Frontend build | `npm.cmd run build --prefix frontend` | TypeScript and Vite production build completed | Pass |
| Dependency audit | `npm.cmd audit --prefix frontend --audit-level=moderate` | 0 vulnerabilities | Pass |
| Repository contract | `node scripts/check-repository.mjs` | Required structure and secret placeholders verified | Pass |
| Spec coverage | `node scripts/check-specs.mjs` | 13 feature specs passed coverage check | Pass |
| Staged-file safety | `node scripts/check-staged-files.mjs` | Run before every task commit; no prohibited staged path | Pass |
| Protected-path declaration | Review `AGENTS.md`, README, architecture, and spec 07 | Protected ERP release directory is explicitly out of scope and was not accessed | Pass |
| iPad landscape visual QA | Browser at 1024×768 | Fresh screenshot and layout inspection recorded in Task 10 | Awaiting browser verification |
| Microphone interaction QA | Browser permission and hold/release | Automated MediaRecorder boundary is covered; physical microphone not yet exercised | Not manually verified |

Automated evidence uses fictional mock data and no live provider credential.
