import { buildSubmission, SiteFormValues } from "./forms";
import { CheckoutSession } from "./payments";

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
  return postJson<SiteFormResponse>(endpointByKind[values.kind], buildSubmission(values));
}

export async function createManualConfirmation(
  itemId: string,
  customerEmail: string,
  customerName: string,
  mode: "subscription" | "deposit" | "one_time" | "quote",
): Promise<CheckoutSession> {
  return postJson<CheckoutSession>("/api/site/checkout/create", {
    order_id: `SITE-${Date.now()}`,
    plan_id: itemId,
    customer_email: customerEmail,
    customer_name: customerName,
    amount_label: customerName,
    mode,
    provider: "manual_mock",
  });
}

export const createMockCheckout = createManualConfirmation;
