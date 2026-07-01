import { describe, expect, it } from "vitest";

import { getPaymentProvider } from "./providers";

const order = {
  orderId: "ORDER-1",
  planId: "vitaflow-starter",
  customerEmail: "demo@example.com",
  amountLabel: "Placeholder monthly plan",
  mode: "subscription" as const,
};

describe("payment providers", () => {
  it("uses manual confirmation by default", () => {
    const session = getPaymentProvider().createCheckoutSession(order);

    expect(session.provider).toBe("manual_mock");
    expect(session.checkoutUrl).toContain("/checkout/success");
    expect(session.nextStep).toMatch(/WhatsApp|email/i);
    expect(session.livePayment).toBe(false);
  });

  it("keeps live providers disabled in the frontend framework", () => {
    for (const name of ["stripe", "billplz"] as const) {
      const session = getPaymentProvider(name).createCheckoutSession(order);

      expect(session.status).toBe("provider_disabled");
      expect(session.livePayment).toBe(false);
      expect(session.checkoutUrl).toContain("/checkout/cancel");
    }
  });

  it("supports manual bank transfer as manual mock confirmation", () => {
    const session = getPaymentProvider("manual_bank_transfer").createCheckoutSession(order);

    expect(session.provider).toBe("manual_mock");
    expect(session.status).toBe("quote_requested");
    expect(session.livePayment).toBe(false);
  });
});
