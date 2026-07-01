import { buildSubmission, sanitizeText, SiteFormValues } from "./forms";

const apiBase =
  import.meta.env.VITE_SITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8001";

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export interface SiteFormResponse {
  id: string;
  status: string;
  reference_id?: string;
  next_step?: string;
  payment_note?: string;
  notification_status?: "sent" | "deferred" | "disabled";
  customer_message?: string;
}

export interface ManualConfirmationResponse {
  ok: boolean;
  live_payment: false;
  message: string;
  customer_message?: string;
  notification_status?: "sent" | "deferred" | "disabled";
  checkout: {
    provider: string;
    status: string;
    reference_id?: string;
    checkout_url?: string;
    next_step?: string;
    message?: string;
  };
  record?: SiteFormResponse;
}

export async function submitSiteForm(values: SiteFormValues): Promise<SiteFormResponse> {
  const endpointByKind: Record<SiteFormValues["kind"], string> = {
    lead: "/api/site/lead",
    vitaflow: "/api/site/orders",
    vitakiosk: "/api/site/orders",
    partner: "/api/site/orders",
    lesson: "/api/site/bookings",
    website: "/api/site/projects",
  };
  return postJson<SiteFormResponse>(endpointByKind[values.kind], buildSiteApiSubmission(values));
}

export function buildSiteApiSubmission(values: SiteFormValues): Record<string, string> {
  const clean = buildSubmission(values);
  const name = sanitizeText(values.fullName);
  const organization = sanitizeText(values.organization);
  const businessType = sanitizeText(values.businessType);
  const selectedPackage = sanitizeText(values.packageId);
  const message = clean.message;
  const common = {
    email: clean.email,
    phone: clean.phone,
  };

  if (values.kind === "lead") {
    return {
      name,
      ...common,
      company: organization,
      interest: businessType,
      message,
    };
  }

  if (values.kind === "lesson") {
    return {
      name,
      ...common,
      topic: selectedPackage,
      notes: message,
    };
  }

  if (values.kind === "website") {
    return {
      businessName: organization || name,
      contactPerson: name,
      ...common,
      industry: businessType,
      selectedPackage,
      notes: message,
    };
  }

  return {
    buyerType: values.kind,
    companyName: organization || `${name} ${businessType}`,
    contactPerson: name,
    ...common,
    selectedPlan: selectedPackage,
    businessType,
    notes: message,
  };
}

export async function createManualConfirmation(
  itemId: string,
  values: SiteFormValues,
  mode: "subscription" | "deposit" | "one_time" | "quote",
): Promise<ManualConfirmationResponse> {
  return postJson<ManualConfirmationResponse>("/api/site/checkout/create", {
    order_id: `SITE-${Date.now()}`,
    plan_id: itemId,
    customer_email: sanitizeText(values.email).toLowerCase(),
    customer_name: sanitizeText(values.fullName),
    customer_phone: sanitizeText(values.phone),
    business_type: sanitizeText(values.businessType),
    selected_package: sanitizeText(values.packageId),
    message: sanitizeText(values.message),
    amount_label: sanitizeText(values.fullName),
    mode,
    provider: "manual_mock",
  });
}

export const createMockCheckout = createManualConfirmation;
