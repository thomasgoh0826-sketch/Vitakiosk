# Security and Data Specification

## Purpose

Keep secrets and real business data out of the repository and demo runtime.

## Prohibited data

`.env`, API keys, tokens, passwords, database URLs, private keys, databases, SQLite files, logs, backups, customer data, sales data, and recordings.

## Acceptance criteria

- `.env.example` contains empty secret values.
- `.gitignore` blocks prohibited data patterns while allowing `.env.example`.
- Staged-file safety exits nonzero for a prohibited staged path.
- Mock mode makes no provider or ERP network call.
- GitHub content is limited to code, docs, fictional mock data, safe assets, tests, and evidence.

## Test evidence

- `scripts/check-repository.mjs`
- `scripts/check-staged-files.mjs`
- `npm.cmd audit --prefix frontend --audit-level=moderate`
- Staged-path inspection recorded in `reports/test-evidence.md`.
