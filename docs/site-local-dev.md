# Site Local Development

## Ports

- Stable VitaKiosk frontend: `http://127.0.0.1:5175`
- VitaKiosk backend: `http://127.0.0.1:8001`
- Flagship website: `http://127.0.0.1:5176`

## Commands

```powershell
npm.cmd install --prefix apps/site
npm.cmd run site:dev
npm.cmd run site:test
npm.cmd run site:build
```

The root scripts are:

```json
{
  "site:dev": "npm run dev --prefix apps/site -- --host 127.0.0.1 --port 5176 --strictPort",
  "site:build": "npm run build --prefix apps/site",
  "site:test": "npm run test:run --prefix apps/site"
}
```

## Environment

The site uses mock commerce by default:

```env
SITE_PAYMENT_PROVIDER=mock
SITE_BASE_URL=http://127.0.0.1:5176
SITE_API_BASE_URL=http://127.0.0.1:8001
```

Do not commit `.env`, provider keys, raw captures, logs, model files, customer
data, sales data, or payment data.

## Notes

The site is separate from the kiosk demo. It imports safe existing kiosk
evidence screenshots through the asset manifest and does not reset backend
provider settings or the VRM avatar renderer.
