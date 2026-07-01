export type PaymentProviderName = "manual_mock" | "mock" | "stripe" | "billplz" | "manual_bank_transfer";

export type CheckoutOrder = {
  orderId: string;
  planId: string;
  customerEmail: string;
  amountLabel: string;
  mode: "subscription" | "one_time" | "deposit" | "quote";
};

export type CheckoutSession = {
  provider: PaymentProviderName;
  checkoutUrl: string;
  paymentId: string;
  status: "checkout_created" | "quote_requested" | "manual_payment_pending" | "provider_disabled";
  livePayment: false;
  referenceId?: string;
  nextStep?: string;
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createCheckoutSession(order: CheckoutOrder): CheckoutSession;
  verifyWebhook(body: unknown): { ok: boolean; provider: PaymentProviderName };
  getPaymentStatus(paymentId: string): { paymentId: string; status: string };
  refundPayment(paymentId: string): { paymentId: string; status: "not_available" };
  createSubscriptionCheckout(order: CheckoutOrder): CheckoutSession;
  createOneTimeCheckout(order: CheckoutOrder): CheckoutSession;
}

class MockPaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderName = "mock";

  createCheckoutSession(order: CheckoutOrder): CheckoutSession {
    return {
      provider: this.name,
      checkoutUrl: `/checkout/success?ref=${encodeURIComponent(order.orderId)}&provider=mock`,
      paymentId: `MOCK-PAY-${order.orderId}`,
      status: "checkout_created",
      livePayment: false,
    };
  }

  createSubscriptionCheckout(order: CheckoutOrder): CheckoutSession {
    return this.createCheckoutSession({ ...order, mode: "subscription" });
  }

  createOneTimeCheckout(order: CheckoutOrder): CheckoutSession {
    return this.createCheckoutSession(order);
  }

  verifyWebhook(): { ok: boolean; provider: PaymentProviderName } {
    return { ok: true, provider: this.name };
  }

  getPaymentStatus(paymentId: string): { paymentId: string; status: string } {
    return { paymentId, status: "mock_paid" };
  }

  refundPayment(paymentId: string): { paymentId: string; status: "not_available" } {
    return { paymentId, status: "not_available" };
  }
}

class DisabledLiveProvider extends MockPaymentProvider {
  constructor(readonly name: "stripe" | "billplz") {
    super();
  }

  createCheckoutSession(order: CheckoutOrder): CheckoutSession {
    return {
      provider: this.name,
      checkoutUrl: `/checkout/cancel?ref=${encodeURIComponent(order.orderId)}&provider=${this.name}`,
      paymentId: `DISABLED-${this.name.toUpperCase()}-${order.orderId}`,
      status: "provider_disabled",
      livePayment: false,
    };
  }

  verifyWebhook(): { ok: boolean; provider: PaymentProviderName } {
    return { ok: true, provider: this.name };
  }
}

class ManualBankTransferProvider extends MockPaymentProvider {
  readonly name: PaymentProviderName = "manual_mock";

  createCheckoutSession(order: CheckoutOrder): CheckoutSession {
    const referenceId = `VKA-${order.orderId}`;
    return {
      provider: this.name,
      checkoutUrl: `/checkout/success?ref=${encodeURIComponent(referenceId)}&provider=manual_mock`,
      paymentId: `MANUAL-${order.orderId}`,
      status: order.mode === "subscription" || order.mode === "quote" ? "quote_requested" : "manual_payment_pending",
      livePayment: false,
      referenceId,
      nextStep:
        "Follow-up happens by WhatsApp or email with quote, schedule, and manual bank transfer or DuitNow instructions.",
    };
  }
}

export function getPaymentProvider(name: PaymentProviderName = "manual_mock"): PaymentProvider {
  if (name === "manual_mock" || name === "manual_bank_transfer") {
    return new ManualBankTransferProvider();
  }
  if (name === "mock") {
    return new MockPaymentProvider();
  }
  if (name === "stripe" || name === "billplz") {
    return new DisabledLiveProvider(name);
  }
  return new ManualBankTransferProvider();
}
