# Security and Data Specification

## Purpose

Keep secrets and real business data out of the repository and demo runtime.

## Prohibited data

`.env`, API keys, tokens, passwords, database URLs, private keys, databases, SQLite files, logs, backups, customer data, sales data, and recordings.

## Acceptance criteria

- `.env.example` contains empty secret values.
- `.env.example` documents explicit provider selectors with mock defaults: `STT_PROVIDER`, `TTS_PROVIDER`, `AI_PROVIDER`, `VITAFLOW_PROVIDER`, and `VISION_PROVIDER`.
- `.gitignore` blocks prohibited data patterns while allowing `.env.example`.
- Staged-file safety exits nonzero for a prohibited staged path.
- Mock mode makes no provider or ERP network call.
- Live providers are disabled unless explicitly selected in local `.env`; credentials alone never switch a provider out of mock mode.
- Backend tests use mock providers only and must not call OpenAI, ElevenLabs, Ollama, VitaFlow ERP, OCR services, or customer/sales data sources.
- Local development CORS is limited to explicit Vite origins on ports 5173 and 5175 for `localhost` and `127.0.0.1`; wildcard origins are not accepted.
- GitHub content is limited to code, docs, fictional mock data, safe assets, tests, and evidence.

## Test evidence

- `scripts/check-repository.mjs`
- `scripts/check-staged-files.mjs`
- `backend/tests/test_provider_config.py`
- `npm.cmd audit --prefix frontend --audit-level=moderate`
- Staged-path inspection recorded in `reports/test-evidence.md`.
