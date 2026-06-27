import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { approvedVitaKioskReference, demoAssetRoots, demoAssets } from "./content/demoAssets";
import { demoHotspots } from "./content/interactiveDemoStates";
import { videoHubItems } from "./content/videoHub";
import { getPricingByCategory, pricingItems } from "./content/pricing";
import { createPaymentProvider } from "./lib/payments";
import { defaultFormValues, sanitizeText, validateSiteForm } from "./lib/forms";

describe("VitaKiosk Asia site", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders the immersive homepage with the four business lines", () => {
    render(<App />);

    expect(screen.getByTestId("fluid-backdrop")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Build smarter pharmacies, clinics, and AI-powered businesses/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/VitaFlow ERP/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VitaKiosk AI Kiosk/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Website Studio/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Academy/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Click inside the kiosk/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Spherical video carousel/i)).toBeInTheDocument();
  });

  it("drives the public VitaKiosk demo without backend devices", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: /Tap to Speak/i })[0]);
    expect(screen.getAllByText(/Listening/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Where is Relief Balm/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Relief Bomb/i }));
    expect(screen.getAllByText(/Do you mean/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Relief Balm" }));
    expect(screen.queryByText(/Do you mean/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Product panel" }));
    expect(screen.getByRole("dialog", { name: /product demo state/i })).toBeInTheDocument();
    expect(screen.getByText(/Tap inside sheet to morph/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Close demo state/i }));

    await user.click(screen.getAllByRole("button", { name: /Scan Product/i })[0]);
    expect(screen.getByRole("dialog", { name: /scan demo state/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Packaging detected/i).length).toBeGreaterThan(0);
  });

  it("opens the spherical video carousel viewer", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /VitaKiosk Interactive Demo Internal Lab Build/i }));

    expect(screen.getByRole("dialog", { name: /VitaKiosk Interactive Demo full video viewer/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Tap, scan, enlarge/i).length).toBeGreaterThan(0);
  });

  it("rotates the spherical video carousel by drag instead of click-only navigation", () => {
    render(<App />);

    const orbit = screen.getByLabelText(/Spherical video carousel/i);
    expect(screen.getByTestId("orbit-active-title")).toHaveTextContent("VitaKiosk Interactive Demo");

    const dispatchPointer = (type: string, clientX: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        clientX: { value: clientX },
        pointerId: { value: 7 },
        button: { value: 0 },
      });
      fireEvent(orbit, event);
    };

    dispatchPointer("pointerdown", 520);
    dispatchPointer("pointermove", 390);
    dispatchPointer("pointerup", 390);

    expect(screen.getByTestId("orbit-active-title")).toHaveTextContent("VitaFlow Source of Truth");
  });

  it("renders route pages as authored experiences instead of placeholders", () => {
    window.history.pushState({}, "", "/vitaflow");
    render(<App />);

    expect(screen.getByRole("heading", { name: /VitaFlow keeps facts grounded/i })).toBeInTheDocument();
    expect(screen.queryByText(/Route-ready page/i)).not.toBeInTheDocument();
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

  it("keeps the approved VitaKiosk screenshot as reference only", () => {
    expect(approvedVitaKioskReference.kind).toBe("approved_reference");
    expect(approvedVitaKioskReference.channel).toBe("reference");
    expect(approvedVitaKioskReference.src).toBe("/assets/reference/vitakiosk-demo-approved.png");
    expect(approvedVitaKioskReference.notes).toMatch(/interactive React UI/i);
    expect(demoHotspots.map((hotspot) => hotspot.label)).toEqual([
      "Tap to Speak",
      "Product panel",
      "Promotion leaflet",
      "Shelf map",
      "Scan Product",
      "Request assistance",
    ]);
  });

  it("uses manifest-driven generated video previews for the spherical carousel", () => {
    expect(videoHubItems.map((asset) => asset.title)).toContain("VitaKiosk Interactive Demo");
    expect(videoHubItems).toHaveLength(7);
    expect(videoHubItems.every((asset) => asset.previewSrc.startsWith("/assets/videos/higgsfield/"))).toBe(true);
    expect(videoHubItems.every((asset) => asset.fullSrc.startsWith("/assets/videos/higgsfield/"))).toBe(true);
    expect(videoHubItems.every((asset) => asset.poster.startsWith("/assets/posters/higgsfield/"))).toBe(true);
  });

  it("keeps demo media under public asset roots instead of importing evidence paths", () => {
    const roots = Object.values(demoAssetRoots);
    const allAssets = [
      demoAssets.approvedVitaKioskReference,
      ...demoAssets.vitaflow.screenshots,
      ...videoHubItems,
    ];

    expect(roots).toContain("/assets/reference/");
    expect(roots).toContain("/assets/videos/higgsfield/");
    for (const asset of allAssets) {
      const mediaPaths = "src" in asset ? [asset.src] : [asset.poster, asset.previewSrc, asset.fullSrc];
      for (const mediaPath of mediaPaths) {
        expect(mediaPath).toMatch(/^\/assets\//);
        expect(mediaPath).not.toMatch(/reports\/evidence/);
        expect(mediaPath).not.toMatch(/Playground/);
      }
      expect(asset.replacementPath).toMatch(/^apps\/site\/public\/assets\//);
    }
  });
});

describe("forms and payment providers", () => {
  it("sanitizes text and rejects incomplete forms", () => {
    expect(sanitizeText(" <hello>   world ")).toBe("hello world");
    expect(validateSiteForm(defaultFormValues).valid).toBe(false);
  });

  it("selects mock provider by default and keeps live providers disabled", async () => {
    const mock = createPaymentProvider();
    await expect(
      mock.createCheckoutSession({
        mode: "deposit",
        itemId: "vitakiosk-local-edition",
        customerEmail: "demo@example.com",
        customerName: "Demo",
      }),
    ).resolves.toMatchObject({ provider: "mock", status: "checkout_created" });

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
