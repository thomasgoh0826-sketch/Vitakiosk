import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { demoAssets, videoHubAssets } from "./content/demoAssets";
import { getPricingByCategory, pricingItems } from "./content/pricing";
import { createPaymentProvider } from "./lib/payments";
import { defaultFormValues, sanitizeText, validateSiteForm } from "./lib/forms";

describe("VitaKiosk Asia site", () => {
  it("renders the immersive homepage with the four business lines", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /Build smarter pharmacies, clinics, and AI-powered businesses/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/VitaFlow ERP/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VitaKiosk AI Kiosk/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Website Studio/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Academy/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Scroll into the lab/i)).toBeInTheDocument();
  });

  it("opens a video hub preview modal", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Clinic Queue Problem/i }));

    expect(screen.getByRole("dialog", { name: /Clinic Queue Problem preview/i })).toBeInTheDocument();
    expect(screen.getByText(/Replace with reviewed muted demo/i)).toBeInTheDocument();
  });

  it("validates forms before creating records", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Send inquiry/i }));

    expect(screen.getByText(/Enter a contact name/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter a valid email/i)).toBeInTheDocument();
  });
});

describe("pricing config", () => {
  it("keeps required categories configured", () => {
    expect(getPricingByCategory("vitaflow").map((item) => item.name)).toEqual([
      "Starter",
      "Growth",
      "Enterprise",
    ]);
    expect(getPricingByCategory("vitakiosk").map((item) => item.name)).toEqual([
      "Local Edition",
      "Clinic Partner Campaign",
      "Enterprise Deployment",
    ]);
    expect(getPricingByCategory("aiLessons")).toHaveLength(5);
    expect(getPricingByCategory("aiWebsite")).toHaveLength(5);
  });

  it("does not scatter payment modes outside known values", () => {
    const modes = new Set(pricingItems.map((item) => item.checkoutMode));
    expect([...modes].sort()).toEqual(["deposit", "one_time", "quote", "subscription"]);
  });
});

describe("asset manifest", () => {
  it("marks ERP captures as placeholders until safe assets exist", () => {
    expect(demoAssets.vitaflow.screenshots[0].kind).toBe("placeholder");
    expect(demoAssets.vitaflow.screenshots[0].notes).toMatch(/non-private ERP demo/i);
  });

  it("uses real kiosk demo captures for iPad and large kiosk lanes", () => {
    expect(demoAssets.vitakiosk.ipadScreenshots.every((asset) => asset.kind === "real_capture")).toBe(true);
    expect(demoAssets.vitakiosk.largeKioskScreenshots.every((asset) => asset.kind === "real_capture")).toBe(true);
    expect(videoHubAssets.map((asset) => asset.title)).toContain("VitaKiosk in Action");
  });
});

describe("forms and payment providers", () => {
  it("sanitizes text and rejects incomplete forms", () => {
    expect(sanitizeText(" <hello>   world ")).toBe("hello world");
    expect(validateSiteForm(defaultFormValues).valid).toBe(false);
  });

  it("selects manual mock provider by default and keeps live providers disabled", async () => {
    const mock = createPaymentProvider();
    await expect(
      mock.createCheckoutSession({
        mode: "deposit",
        itemId: "vitakiosk-local-edition",
        customerEmail: "demo@example.com",
        customerName: "Demo",
      }),
    ).resolves.toMatchObject({ provider: "manual_mock", status: "manual_payment_pending" });

    const stripe = createPaymentProvider("stripe");
    await expect(
      stripe.createCheckoutSession({
        mode: "deposit",
        itemId: "website",
        customerEmail: "demo@example.com",
        customerName: "Demo",
      }),
    ).rejects.toThrow(/skeleton only/i);
  });
});
