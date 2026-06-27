# Site Payment Framework

## Current Mode

`SITE_PAYMENT_PROVIDER=mock` is the only enabled mode. It creates mock checkout
sessions and local runtime records, but never calls Stripe, Billplz, a bank, or
any live processor.

## Environment Placeholders

Only empty placeholders belong in `.env.example`:

```env
SITE_PAYMENT_PROVIDER=mock
SITE_BASE_URL=http://127.0.0.1:5176
SITE_API_BASE_URL=http://127.0.0.1:8001
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_VITAFLOW_STARTER_MONTHLY=
STRIPE_PRICE_VITAFLOW_GROWTH_MONTHLY=
STRIPE_PRICE_AI_LESSON_1TO1=
STRIPE_PRICE_WEBSITE_DEPOSIT=
BILLPLZ_API_KEY=
BILLPLZ_COLLECTION_ID=
BILLPLZ_X_SIGNATURE_KEY=
```

Do not commit `.env`, API keys, webhook secrets, bank details, card data, or live
payment records.

## Provider Contract

`PaymentProvider`

- `createCheckoutSession`
- `createSubscriptionCheckout`
- `createOneTimeCheckout`
- `verifyWebhook`
- `getPaymentStatus`
- `refundPayment`

Backend equivalents are in `backend/app/site_payments.py`. Frontend equivalents
are in `apps/site/src/lib/payments.ts`.

## Providers

- `MockPaymentProvider`: enabled by default, returns local success URLs.
- `StripePaymentProvider`: skeleton only, no network call.
- `BillplzPaymentProvider`: skeleton only, no network call.
- `ManualBankTransferProvider`: future/manual review flow, no bank data stored.

## Local Runtime Records

Site records are written under ignored `tmp/site-dev/`. They are for local
testing only and must not contain card data, payment secrets, customer databases,
sales data, or private ERP data.
