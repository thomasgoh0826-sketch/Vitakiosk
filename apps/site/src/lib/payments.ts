export type PaymentProviderName = "manual_mock" | "mock" | "stripe" | "billplz" | "manual";

export interface CheckoutRequest {
  mode: "subscription" | "deposit" | "one_time" | "quote";
  itemId: string;
  customerEmail: string;
  customerName: string;
}

export interface CheckoutSession {
  id: string;
  provider: PaymentProviderName;
  status:
    | "inquiry_submitted"
    | "quote_requested"
    | "manual_payment_pending"
    | "manual_payment_received"
    | "confirmed"
    | "scheduled"
    | "completed"
    | "cancelled"
    | "checkout_created"
    | "manual_review"
    | "mock_success"
    | "mock_cancel";
  url: string;
  message: string;
  referenceId?: string;
  nextStep?: string;
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

function makeManualSession(request: CheckoutRequest): CheckoutSession {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  const referenceId = `VKA-${suffix}`;
  const pendingStatus =
    request.mode === "quote" || request.mode === "subscription"
      ? "quote_requested"
      : "manual_payment_pending";
  return {
    id: `manual_${request.mode}_${suffix.toLowerCase()}`,
    provider: "manual_mock",
    status: pendingStatus,
    referenceId,
    url: `/checkout/success?provider=manual_mock&ref=${encodeURIComponent(referenceId)}`,
    message:
      "Online payment gateway is not enabled yet. Payment and onboarding are confirmed manually after discussion.",
    nextStep:
      "We will follow up by WhatsApp or email with the quote, schedule, and manual bank transfer or DuitNow instructions if payment is needed.",
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

export class ManualBankTransferProvider implements PaymentProvider {
  readonly name = "manual_mock" as const;

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
    return { ok: true, provider: "manual_mock" };
  }

  async getPaymentStatus(sessionId: string): Promise<{ status: string; sessionId: string }> {
    return { status: "manual_payment_pending", sessionId };
  }

  async refundPayment(sessionId: string): Promise<{ status: string; sessionId: string }> {
    return { status: "manual_refund_review", sessionId };
  }
}

export class DisabledLivePaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderName;

  constructor(name: "stripe" | "billplz") {
    this.name = name;
  }

  async createCheckoutSession(_request?: CheckoutRequest): Promise<CheckoutSession> {
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
  provider: PaymentProviderName = "manual_mock",
): PaymentProvider {
  if (provider === "manual_mock" || provider === "manual") {
    return new ManualBankTransferProvider();
  }
  if (provider === "mock") {
    return new MockPaymentProvider();
  }
  return new DisabledLivePaymentProvider(provider);
}
