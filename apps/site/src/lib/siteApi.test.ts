import { describe, expect, it } from "vitest";

import { buildSubmission } from "./forms";
import { buildSiteApiSubmission } from "./siteApi";

describe("site frontend Supabase safety", () => {
  it("does not expose Supabase service-role env names to the frontend bundle path", async () => {
    const source = await import("./siteApi?raw");

    expect(source.default).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(source.default).not.toContain("SUPABASE_ANON_KEY");
  });

  it("builds public form submissions without payment card fields", () => {
    const values = {
      kind: "lead",
      fullName: "Demo",
      email: "demo@example.com",
      phone: "60123456789",
      organization: "",
      businessType: "Pharmacy",
      packageId: "vitakiosk-local-edition",
      message: "Interested",
    } as const;
    const payload = buildSubmission(values);

    expect(JSON.stringify(payload).toLowerCase()).not.toContain("card");
  });

  it("maps public lead forms to the backend validated endpoint shape", () => {
    const payload = buildSiteApiSubmission({
      kind: "lead",
      fullName: "Demo User",
      email: "demo@example.com",
      phone: "60123456789",
      organization: "Demo Pharmacy",
      businessType: "Pharmacy",
      packageId: "vitakiosk-local-edition",
      message: "Interested in a kiosk demo",
    });

    expect(payload).toEqual({
      name: "Demo User",
      email: "demo@example.com",
      phone: "60123456789",
      company: "Demo Pharmacy",
      interest: "Pharmacy",
      message: "Interested in a kiosk demo",
    });
  });
});
