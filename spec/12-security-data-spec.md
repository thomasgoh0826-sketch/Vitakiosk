# Security and Data Specification

## Purpose

Keep secrets and real business data out of the repository and demo runtime.

## Prohibited data

`.env`, API keys, tokens, passwords, database URLs, private keys, databases, SQLite files, logs, backups, customer data, sales data, recordings, raw audio files, downloaded speech models, and model cache files.

## Acceptance criteria

- `.env.example` contains empty secret values.
- `.env.example` documents explicit provider selectors with mock defaults: `STT_PROVIDER`, `TTS_PROVIDER`, `AI_PROVIDER`, `VITAFLOW_PROVIDER`, and `VISION_PROVIDER`.
- `.env.example` may document non-secret local Ollama defaults (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_SECONDS`) but must not include API keys, tokens, private database URLs, or secrets.
- `.gitignore` blocks prohibited data patterns while allowing `.env.example`.
- `.gitignore` blocks `.models/`, model cache folders, raw audio files, recordings, logs, databases, backups, and private data.
- Local camera product scan must not persist raw product/customer images or
  video frames by default. Any temporary diagnostic image capture, if ever
  added for reviewed troubleshooting, must live only under ignored temp paths
  and must not be committed.
- Product display images must come from backend/VitaFlow metadata and should be
  local/static or backend-proxied paths. The frontend must reject unsafe image
  URL schemes and fall back to generated artwork instead of exposing private
  storage paths, inline scripts, customer images, or patient data.
- Staged-file safety exits nonzero for a prohibited staged path.
- Mock mode makes no provider or ERP network call.
- Live providers are disabled unless explicitly selected in local `.env`; credentials alone never switch a provider out of mock mode.
- Backend tests use mock providers, injected fake STT runners, mocked local
  product scan bytes, or mocked Ollama HTTP transports only and must not call
  OpenAI, faster-whisper model downloads, ElevenLabs, real Ollama, VitaFlow ERP,
  OCR services, camera hardware, image-recognition cloud services, or
  customer/sales data sources.
- Local development CORS is limited to explicit Vite origins on ports 5173 and 5175 for `localhost` and `127.0.0.1`; wildcard origins are not accepted.
- GitHub content is limited to code, docs, fictional mock data, safe assets, tests, and evidence.

## Test evidence

- `scripts/check-repository.mjs`
- `scripts/check-staged-files.mjs`
- `backend/tests/test_provider_config.py`
- `npm.cmd audit --prefix frontend --audit-level=moderate`
- Staged-path inspection recorded in `reports/test-evidence.md`.
