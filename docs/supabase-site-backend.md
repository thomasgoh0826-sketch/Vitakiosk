# Supabase Site Backend

Supabase stores public `vitakiosk.asia` marketing-site intake records only:

- leads/contact form submissions
- VitaFlow ERP demo or quote requests
- VitaKiosk order inquiries
- clinic/pharmacy partner placement inquiries
- AI lesson bookings
- AI website project inquiries
- manual payment status references
- admin notes later

Supabase must not store:

- raw camera frames
- raw audio
- ElevenLabs audio
- patient or medical data
- real pharmacy sales data
- real VitaFlow ERP database data
- card details
- payment secrets

## Environment

Backend `.env` only:

```env
SITE_DATABASE_PROVIDER=supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SITE_PAYMENT_PROVIDER=manual_mock
```

Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only. Do not expose it to `apps/site`,
screenshots, logs, GitHub, or documentation.

If Supabase env is missing, the backend falls back to mock/local memory and the
site keeps working.

## Data Flow

```text
Frontend form
-> backend /api/site/*
-> backend validation and sanitization
-> backend Supabase insert
-> safe response with reference code and next step
```

The frontend should not bypass backend validation.

## Setup Checklist

1. Open the Supabase dashboard.
2. Create a project named `vitakiosk-asia` if needed.
3. Choose the closest Malaysia/Singapore region available.
4. Review `docs/supabase-schema.sql`.
5. Apply the SQL only after confirming no sensitive data will be exposed.
6. Copy Supabase URL and keys into local backend `.env`.
7. Never commit `.env` or key values.

When keys are visible in the dashboard, only confirm that they were found:

- `SUPABASE_URL: found`
- `SUPABASE_ANON_KEY: found`
- `SUPABASE_SERVICE_ROLE_KEY: found`

## Production Migration

Before production:

- review RLS policies
- add admin read/update through secure backend/admin role only
- keep public users insert-only
- add backup/export policy
- add webhook tests before enabling Billplz or Stripe
- keep manual payment as default until company/payment gateway setup is ready
