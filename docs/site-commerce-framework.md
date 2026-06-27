# Site Commerce Framework

The marketing site keeps the existing mock-first commerce framework and shows
it through `CommerceConsole`.

## What Exists

- VitaFlow subscription inquiry framework.
- VitaKiosk order and deposit framework.
- AI lesson booking/payment framework.
- AI website project/deposit framework.
- Mock checkout session creation.
- Success and cancel pages.

## Provider Rule

Default provider:

```text
mock
```

Future providers remain skeletons until deliberately enabled:

- Stripe
- Billplz
- Manual bank transfer

No live payment is attempted in this site. Do not store card data. Do not
commit `.env` or real payment keys.

## Configuration

Pricing and status flows stay in:

```text
apps/site/src/content/pricing.ts
```

Payment provider abstraction stays in:

```text
apps/site/src/lib/payments.ts
```

Form validation and mock record behavior stay in:

```text
apps/site/src/lib/forms.ts
apps/site/src/lib/siteApi.ts
```

## Visual Treatment

`CommerceConsole` uses animated tabs and a focused active panel instead of a
plain pricing table. Details are intentionally short on the homepage; intake
forms and follow-up conversation carry the longer sales information.
