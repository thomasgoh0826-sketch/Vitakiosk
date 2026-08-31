# Site Local Dev

## Ports

- VitaKiosk demo frontend: `http://127.0.0.1:5175`
- VitaKiosk backend: `http://127.0.0.1:8001`
- VitaKiosk Asia site: `http://127.0.0.1:5176`

## Commands

```powershell
npm.cmd install --prefix apps/site
npm.cmd run site:dev
npm.cmd run site:test
npm.cmd run site:build
```

Backend site APIs are under `/api/site/*` and are safe mock endpoints.

## Environment

Only `.env.example` documents variables. Do not commit `.env`, real payment keys, audio, logs, customer data, sales data, payment records, or private ERP data.
