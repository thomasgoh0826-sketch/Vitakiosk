export type PaymentProviderName = "manual" | "stripe" | "billplz";

export interface CheckoutRequest {
  mode: "subscription" | "deposit" | "one_time" | "quote";
  itemId: string;
  customerEmail: string;
  customerName: string;
}

export interface CheckoutSession {
  id: string;
  provider: PaymentProviderName;
  status: "manual_payment_pending" | "quote_requested" | "manual_review";
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

function makeManualSession(request: CheckoutRequest): CheckoutSession {
  const suffix = Math.random().toString(36).slice(2, 9);
  return {
    id: `manual_${request.mode}_${suffix}`,
    provider: "manual",
    status: request.mode === "quote" ? "quote_requested" : "manual_payment_pending",
    url: `/checkout/success?provider=manual&item=${encodeURIComponent(request.itemId)}`,
    message:
      request.mode === "quote"
        ? "Quote request received. Payment will be confirmed manually after discussion."
        : "Manual payment confirmation request received. No live payment was attempted.",
  };
}

export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual" as const;

  async createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSession> {
    return makeManualSession(request);
  }

  async createSubscriptionCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return makeManualSession({ ...request, mode: "subscription" });
  }

  async createOneTimeCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    return makeManualSession({ ...request, mode: "one_time" });
  }

  async verifyWebhook(): Promise<{ ok: boolean; provider: PaymentProviderName }> {
    return { ok: true, provider: "manual" };
  }

  async getPaymentStatus(sessionId: string): Promise<{ status: string; sessionId: string }> {
    return { status: "manual_payment_pending", sessionId };
  }

  async refundPayment(sessionId: string): Promise<{ status: string; sessionId: string }> {
    return { status: "refund_placeholder", sessionId };
  }
}

export class DisabledLivePaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderName;

  constructor(name: Exclude<PaymentProviderName, "manual">) {
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
  provider: PaymentProviderName = "manual",
): PaymentProvider {
  if (provider === "manual") {
    return new ManualPaymentProvider();
  }
  return new DisabledLivePaymentProvider(provider);
}
