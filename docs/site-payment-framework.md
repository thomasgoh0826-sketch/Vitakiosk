# Site Payment Framework

## Current Public Mode

`SITE_PAYMENT_PROVIDER=manual_mock` is the default.

VitaKiosk Asia is in a pre-company stage. The public website supports inquiries,
bookings, quote requests, and manual confirmation records, but it must not imply
that automated subscription activation or live online payment is production-ready.

Public note:

> Online payment gateway is not enabled yet. Payment and onboarding are confirmed manually after discussion.

## Provider Shape

Payment providers expose:

- `createCheckoutSession(order)`
- `verifyWebhook(request)`
- `getPaymentStatus(paymentId)`
- `refundPayment(paymentId)`
- `createSubscriptionCheckout(order)`
- `createOneTimeCheckout(order)`

Backend implementation lives in `backend/app/site_payments.py`. The frontend
framework lives in `apps/site/src/payment/providers.ts` and
`apps/site/src/lib/payments.ts`.

## Providers

- `manual_mock`: default pre-company manual confirmation provider. It returns a
  reference ID, manual status, and WhatsApp/email follow-up instructions. It
  does not call a bank, Stripe, Billplz, or any live gateway.
- `mock`: development-only checkout-style mock retained for local architecture tests.
- `manual_bank_transfer`: compatibility alias for `manual_mock`.
- `stripe`: future skeleton only, returns disabled provider status.
- `billplz`: future skeleton only, returns disabled provider status.

## Public CTA Wording

Use manual-first language:

- VitaFlow ERP: `Request Demo` / `Request Quote`
- VitaKiosk: `Request Quote` / `Book Demo`
- AI Website Studio: `Start Project Inquiry`
- AI Academy: `Book Lesson` / `Reserve Lesson Slot`
- Payment: `Manual Payment Confirmation`

Avoid public wording such as `Subscribe Now`, `Pay Now`, `Checkout`, or
`Activate Subscription`.

## Manual Statuses

- `inquiry_submitted`
- `quote_requested`
- `manual_payment_pending`
- `manual_payment_received`
- `confirmed`
- `scheduled`
- `completed`
- `cancelled`

## Manual Flow

Customer forms collect name, phone, email, business type, selected
product/service, and notes. The API returns a reference ID, next-step message,
and manual confirmation status. No card details are collected.

Manual bank transfer or DuitNow instructions are shared only after discussion.

## Production Activation Checklist

- Confirm company/payment readiness in a reviewed task.
- Add server-side credentials through environment variables only.
- Keep secrets out of `.env.example`, source code, tests, screenshots, and logs.
- Add webhook verification tests before enabling live mode.
- Never store card data in VitaKiosk.
