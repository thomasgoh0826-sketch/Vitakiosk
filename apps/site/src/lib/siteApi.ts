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

export async function submitSiteForm(values: SiteFormValues) {
  const endpointByKind: Record<SiteFormValues["kind"], string> = {
    lead: "/api/site/lead",
    vitaflow: "/api/site/orders",
    vitakiosk: "/api/site/orders",
    partner: "/api/site/orders",
    lesson: "/api/site/bookings",
    website: "/api/site/projects",
  };
  return postJson(endpointByKind[values.kind], buildSubmission(values));
}

export async function createMockCheckout(
  itemId: string,
  customerEmail: string,
  customerName: string,
  mode: "subscription" | "deposit" | "one_time" | "quote",
): Promise<CheckoutSession> {
  return postJson<CheckoutSession>("/api/site/checkout/create", {
    item_id: itemId,
    customer_email: customerEmail,
    customer_name: customerName,
    mode,
  });
}
