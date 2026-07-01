import { describe, expect, it } from "vitest";

import {
  findPricingPlan,
  getPricingByCategory,
  plansForGroup,
  pricingItems,
  pricingPlans,
} from "./pricing";

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
    expect(findPricingPlan("vitaflow-starter")?.priceLabel).toBe("Free setup + RM199/month");
    expect(findPricingPlan("website-ai-chatbot")?.cta).toBe("Start Website Project");
  });

  it("uses the listed public prices", () => {
    expect(findPricingPlan("vitaflow-growth")?.priceLabel).toBe("Free setup + RM399/month");
    expect(findPricingPlan("vitaflow-enterprise")?.priceLabel).toBe(
      "Free setup + custom quote from RM899/month",
    );
    expect(findPricingPlan("vitakiosk-local-edition")?.priceLabel).toBe(
      "From RM700 setup + RM200/month maintenance",
    );
    expect(findPricingPlan("vitakiosk-clinic-partner-campaign")?.priceLabel).toBe(
      "From RM1,500/campaign",
    );
    expect(findPricingPlan("ai-website-chatbot")?.priceLabel).toBe(
      "From RM1,000 + RM150/month",
    );
  });

  it("marks only the requested academy packages as non-negotiable", () => {
    const fixed = getPricingByCategory("aiLessons").filter((item) => !item.negotiable);

    expect(fixed.map((item) => item.name)).toEqual([
      "AI Pharmacy Workflow",
      "Codex / Website Coaching",
      "AI Content & Video Workflow",
    ]);
    expect(fixed.every((item) => item.nonNegotiableLabel === "Non-negotiable")).toBe(true);
    expect(pricingItems.filter((item) => item.nonNegotiableLabel).length).toBe(3);
  });
});
