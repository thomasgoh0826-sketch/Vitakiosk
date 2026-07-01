export type PaymentProviderName = "mock" | "stripe" | "billplz" | "manual";

export interface CheckoutRequest {
  mode: "subscription" | "deposit" | "one_time" | "quote";
  itemId: string;
  customerEmail: string;
  customerName: string;
}

export interface CheckoutSession {
  id: string;
  provider: PaymentProviderName;
  status: "checkout_created" | "manual_review" | "mock_success" | "mock_cancel";
  url: string;
  message: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSession>;
  createSubscriptionCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  createOneTimeCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  verifyWebhook(payload: unknown): Promise<{ ok: boolean; provider: PaymentProviderName }>;
  getPaymentStatus(sessionId: string): Promise<{ status: string; sessionId: string }>;
  refundPayment(sessionId: string): Promise<{ status: string; sessionId: string }>;
}

function makeMockSession(request: CheckoutRequest): CheckoutSession {
  const suffix = Math.random().toString(36).slice(2, 9);
  return {
    id: `mock_${request.mode}_${suffix}`,
    provider: "mock",
    status: request.mode === "quote" ? "manual_review" : "checkout_created",
    url: `/checkout/success?provider=mock&item=${encodeURIComponent(request.itemId)}`,
    message:
      request.mode === "quote"
        ? "Mock quote request created. No payment was attempted."
        : "Mock checkout session created. No live charge was attempted.",
  };
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock" as const;

  async createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSession> {
    return makeMockSession(request);
  }

  async createSubscriptionCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return makeMockSession({ ...request, mode: "subscription" });
  }

  async createOneTimeCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return makeMockSession({ ...request, mode: "one_time" });
  }

  async verifyWebhook(): Promise<{ ok: boolean; provider: PaymentProviderName }> {
    return { ok: true, provider: "mock" };
  }

  async getPaymentStatus(sessionId: string): Promise<{ status: string; sessionId: string }> {
    return { status: "mock_success", sessionId };
  }

  async refundPayment(sessionId: string): Promise<{ status: string; sessionId: string }> {
    return { status: "refund_placeholder", sessionId };
  }
}

export class DisabledLivePaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderName;

  constructor(name: Exclude<PaymentProviderName, "mock">) {
    this.name = name;
  }

  async createCheckoutSession(_request: CheckoutRequest): Promise<CheckoutSession> {
    throw new Error(`${this.name} is a skeleton only. Enable it through a reviewed integration task.`);
  }

  async createSubscriptionCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return this.createCheckoutSession(request);
  }

  async createOneTimeCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return this.createCheckoutSession(request);
  }

  async verifyWebhook(): Promise<{ ok: boolean; provider: PaymentProviderName }> {
    return { ok: false, provider: this.name };
  }

  async getPaymentStatus(sessionId: string): Promise<{ status: string; sessionId: string }> {
    return { status: "manual_review", sessionId };
  }

  async refundPayment(sessionId: string): Promise<{ status: string; sessionId: string }> {
    return { status: "refund_placeholder", sessionId };
  }
}

export function createPaymentProvider(
  provider: PaymentProviderName = "mock",
): PaymentProvider {
  if (provider === "mock") {
    return new MockPaymentProvider();
  }
  return new DisabledLivePaymentProvider(provider);
}
