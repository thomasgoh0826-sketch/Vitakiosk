# Manual Payment Workflow

Current mode: pre-company manual confirmation.

Public message:

`Online payment gateway is not enabled yet. Payment and onboarding are confirmed manually after discussion.`

The website supports:

- contact inquiries
- VitaFlow demo or quote requests
- VitaKiosk quote or demo requests
- clinic/pharmacy partner inquiries
- AI lesson reservations
- AI website project inquiries

The website does not collect card data and does not trigger Stripe, Billplz, or
any live payment gateway.

Manual payment statuses:

- `not_required`
- `manual_payment_pending`
- `manual_payment_received`
- `manual_review`

Typical flow:

1. Customer submits a form.
2. Backend validates and sanitizes the payload.
3. Backend generates a readable reference code such as `VK-ORD-2026-0001`.
4. Backend stores the request in mock memory or Supabase.
5. Customer receives a safe response with reference code and next step.
6. Quote, schedule, bank transfer, or DuitNow instructions are shared manually.

Future Billplz/Stripe activation must be a separate reviewed task with webhook
verification, company/payment readiness, and no card storage in VitaKiosk.
