# VitaKiosk Agent Instructions

## Working style

- 会自己想解决问题，而不是只照用户说的做；处理一个问题时要检查是否留下相关问题。
- Preserve existing files unless the user explicitly authorizes a change.
- Every feature requires acceptance criteria and recorded test evidence.
- Use test-first development for behavior changes and run the relevant checks before committing.

## Pharmacy safety

- VitaFlow ERP is the source of truth for products, stock, prices, promotions, and shelf locations.
- AI must not diagnose, prescribe, or replace a pharmacist.
- Never invent product details, stock, price, promotion, or shelf location.
- Red-flag cases must stop the normal flow and escalate to a pharmacist.
- Unknown products must create a purchasing query instead of producing a guess.
- Promotion posters may show only active, date-valid promotions for the current branch.

## Mock-first integration

- The initial application uses mock data and mock adapters only.
- Do not call OpenAI, ElevenLabs, VitaFlow ERP, Ollama, or any other live provider.
- Keep provider-neutral adapter contracts so live integrations can be added deliberately.
- Never switch to a live provider merely because a credential exists; provider selection must be an explicit reviewed configuration change.
- Keep `VITAKIOSK_PROVIDER_MODE=mock`; controlled live testing is per-layer only through `STT_PROVIDER`, `TTS_PROVIDER`, `AI_PROVIDER`, `VITAFLOW_PROVIDER`, and `VISION_PROVIDER`.
- Supported provider selectors are `mock`, `openai_whisper`, `elevenlabs`, `openai`, `ollama`, `readonly_api`, and `barcode_ocr` as documented in `.env.example`; tests must leave them in mock mode unless a reviewed task says otherwise.
- The first VitaFlow live connector must be `readonly_api` only and must never write stock, sales, customer, purchasing, promotion, or shelf data.
- Credentials must be read from environment variables; never hardcode a key, token, password, database URL, or private key.

## Protected external path

- Do not access, read, inspect, modify, move, or delete `C:\Users\Admin\Documents\Playground\release`.
- That directory belongs to the separate VitaFlow ERP project and is outside this repository's scope.

## Git and data safety

- Never commit `.env`, API keys, databases, SQLite files, logs, backups, customer data, or sales data.
- Only `.env.example` may document environment variable names, and secret values must remain empty.
- Before each commit, inspect staged paths and run `node scripts/check-staged-files.mjs`.
- If a sensitive file is staged, stop immediately, leave it uncommitted, and notify the user.
- GitHub may contain source code, documentation, fictional mock data, tests, and test evidence only.

## Product requirements

- Frontend targets iPad landscape kiosk use with accessible controls and clear degraded states.
- Avatar states are `idle`, `listening`, `thinking`, `speaking`, `error`, and `pharmacist_escalation`.
- WebSocket events are session-scoped; local UI state is a safe fallback when disconnected.
- Missing authoritative data must be shown as unavailable, never synthesized.
- Before changing an adapter contract, update its feature spec and acceptance evidence mapping.
