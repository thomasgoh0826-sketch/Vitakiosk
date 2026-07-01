import { describe, expect, it } from "vitest";

import { findPricingPlan, plansForGroup, pricingPlans } from "./pricing";

describe("pricingPlans", () => {
  it("covers all requested business groups", () => {
    expect(plansForGroup("vitaflow").length).toBeGreaterThanOrEqual(3);
    expect(plansForGroup("vitakiosk").length).toBeGreaterThanOrEqual(3);
    expect(plansForGroup("academy").length).toBeGreaterThanOrEqual(3);
    expect(plansForGroup("website").length).toBeGreaterThanOrEqual(3);
  });

  it("does not hardcode live payment prices or card collection", () => {
    const text = JSON.stringify(pricingPlans).toLowerCase();

    expect(text).not.toContain("card number");
    expect(text).not.toContain("guaranteed treatment");
    expect(text).not.toContain("ai doctor");
  });

  it("can find configured plans by id", () => {
    expect(findPricingPlan("vitaflow-starter")?.cta).toBe("Request Demo");
    expect(findPricingPlan("website-ai-chatbot")?.cta).toBe("Start Project Inquiry");
  });
});
