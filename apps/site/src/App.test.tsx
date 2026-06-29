import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { aiPharmacyAssistantAvatar, approvedVitaKioskReference, demoAssetRoots, demoAssets } from "./content/demoAssets";
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

    const glowBackdrop = screen.getByTestId("global-glow-backdrop");
    expect(glowBackdrop).toBeInTheDocument();
    expect(screen.getAllByTestId("global-glow-backdrop")).toHaveLength(1);
    expect(glowBackdrop.closest(".site-root")).toBeInTheDocument();
    expect(glowBackdrop.closest(".page-shell")).not.toBeInTheDocument();
    expect(glowBackdrop.closest(".vitakiosk-mini-app")).not.toBeInTheDocument();
    expect(glowBackdrop).toHaveAttribute("data-effect", "pointer-glow-ripple");
    expect(glowBackdrop).toHaveAttribute("data-ripple-throttle-ms");
    expect(glowBackdrop).toHaveAttribute("data-max-ripples");
    expect(document.querySelector("canvas.global-liquid-backdrop")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Build smarter pharmacies, clinics, and AI-powered businesses/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/VitaFlow ERP/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VitaKiosk AI Kiosk/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Website Studio/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AI Academy/i).length).toBeGreaterThan(0);
    expect(document.querySelector("#interactive-demo")).toBeInTheDocument();
    expect(screen.getByLabelText(/Spherical video carousel/i)).toHaveAttribute("data-auto-rotate", "true");
    expect(screen.getByLabelText(/Spherical video carousel/i)).toHaveAttribute(
      "data-render-buffer",
      String(videoHubItems.length),
    );
    expect(screen.queryByRole("button", { name: /Previous video/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Next video/i })).not.toBeInTheDocument();
    const orbitCards = Array.from(document.querySelectorAll(".video-orbit-card"));
    expect(orbitCards).toHaveLength(videoHubItems.length);
    expect(new Set(orbitCards.map((card) => card.getAttribute("data-logical-index"))).size).toBe(
      videoHubItems.length,
    );
    expect(document.querySelectorAll('.video-orbit-card[data-visible="true"]').length).toBeLessThanOrEqual(5);
    expect(document.querySelectorAll('.video-orbit-card[data-orbit-distance="far"]').length).toBeGreaterThan(0);
  });

  it("does not show internal demo provenance badges on the public homepage", () => {
    render(<App />);

    expect(screen.queryByText(/Mock mode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No customer data/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/VitaFlow-ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/System provenance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fictional mock leaflet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Current mock VitaFlow product price/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Mock VitaFlow")).not.toBeInTheDocument();
    expect(screen.queryByText("MOCK-P001")).not.toBeInTheDocument();
    expect(screen.getByText(/Connected product experience/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Product education and where-to-buy guidance only/i).length).toBeGreaterThan(0);
  });

  it("uses Tablet showcase tabs as clickable scene navigation", async () => {
    const user = userEvent.setup();
    render(<App />);
    const showcase = screen.getByLabelText("VitaKiosk Asia system showcase");
    const scope = within(showcase);

    const tabletTab = scope.getByRole("button", { name: /01\s+Tablet/i });
    const kioskTab = scope.getByRole("button", { name: /02\s+Kiosk/i });
    const erpTab = scope.getByRole("button", { name: /03\s+ERP/i });
    const websiteTab = scope.getByRole("button", { name: /04\s+Website/i });
    const academyTab = scope.getByRole("button", { name: /05\s+Academy/i });

    expect(tabletTab).toHaveAttribute("aria-pressed", "true");
    expect(scope.queryByText(/\biPad\b/i)).not.toBeInTheDocument();

    await user.click(erpTab);
    expect(erpTab).toHaveAttribute("aria-pressed", "true");
    expect(scope.getByRole("heading", { name: /ERP remains the source of truth/i })).toBeInTheDocument();

    await user.click(websiteTab);
    expect(websiteTab).toHaveAttribute("aria-pressed", "true");
    expect(scope.getByRole("heading", { name: /website becomes a growth surface/i })).toBeInTheDocument();

    await user.click(academyTab);
    expect(academyTab).toHaveAttribute("aria-pressed", "true");
    expect(scope.getByRole("heading", { name: /Teams learn the workflow/i })).toBeInTheDocument();

    await user.click(kioskTab);
    expect(kioskTab).toHaveAttribute("aria-pressed", "true");
    expect(scope.getByRole("heading", { name: /large kiosk that feels alive/i })).toBeInTheDocument();
  });

  it("keeps the global glow ripple effect lightweight and bounded", async () => {
    render(<App />);
    const glowBackdrop = screen.getByTestId("global-glow-backdrop");
    const maxRipples = Number(glowBackdrop.getAttribute("data-max-ripples"));
    const rippleThrottleMs = Number(glowBackdrop.getAttribute("data-ripple-throttle-ms"));

    expect(rippleThrottleMs).toBeGreaterThanOrEqual(120);
    expect(rippleThrottleMs).toBeLessThanOrEqual(180);
    expect(maxRipples).toBeGreaterThanOrEqual(12);
    expect(maxRipples).toBeLessThanOrEqual(18);

    fireEvent.pointerMove(window, { clientX: 220, clientY: 180, pointerType: "mouse" });
    fireEvent.pointerDown(window, { clientX: 260, clientY: 210, pointerType: "mouse" });
    fireEvent.touchMove(window, { touches: [{ clientX: 330, clientY: 280 }] });
    fireEvent.touchStart(window, { touches: [{ clientX: 340, clientY: 300 }] });

    await waitFor(() => {
      expect(glowBackdrop.querySelector(".global-ripple")).toBeInTheDocument();
    });

    for (let index = 0; index < maxRipples + 8; index += 1) {
      fireEvent.pointerDown(window, {
        clientX: 100 + index,
        clientY: 120 + index,
        pointerType: "mouse",
      });
    }

    expect(glowBackdrop.querySelectorAll(".global-ripple").length).toBeLessThanOrEqual(maxRipples);
    expect(document.querySelector("canvas.global-liquid-backdrop")).not.toBeInTheDocument();
  });

  it("supports an obvious visual debug mode for glow ripple QA", async () => {
    window.history.pushState({}, "", "/?debugRipple=1");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("global-glow-backdrop")).toHaveAttribute("data-debug-ripple", "true");
    });
  });

  it("drives the public VitaKiosk demo without backend devices", async () => {
    window.history.pushState({}, "", "/vitakiosk");
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
    expect(screen.getByRole("dialog", { name: /product enlarged demo state/i })).toBeInTheDocument();
    expect(screen.getByText(/Tap inside sheet to morph/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Close demo state/i }));

    await user.click(screen.getAllByRole("button", { name: /Scan Product/i })[0]);
    expect(screen.getByRole("dialog", { name: /scan product demo state/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Packaging detected/i).length).toBeGreaterThan(0);
  });

  it("renders a solid interactive mini app without screenshot base, iframe, or transparent hotspots", () => {
    window.history.pushState({}, "", "/vitakiosk");
    render(<App />);

    const demo = document.querySelector("#interactive-demo");

    expect(demo).toHaveAttribute("data-component", "InteractiveVitaKioskMiniApp");
    expect(demo?.querySelector(".demo-reference-surface")).not.toBeInTheDocument();
    expect(demo?.querySelector(".demo-reference-layer")).not.toBeInTheDocument();
    expect(demo?.querySelector(".demo-hotspot")).not.toBeInTheDocument();
    expect(demo?.querySelector(".mini-avatar-image")).toHaveAttribute("src", aiPharmacyAssistantAvatar.src);
    expect(demo?.querySelector("iframe")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open live local demo if running/i })).toHaveClass("demo-dev-link");
    expect(screen.getByRole("button", { name: "Tap to Speak" })).toHaveClass("mini-tap-button");
    expect(screen.getByRole("button", { name: "Product panel" })).toHaveClass("mini-product-panel");
    expect(screen.getByRole("button", { name: "Promotion leaflet" })).toHaveClass("mini-promotion-panel");
    expect(screen.getByRole("button", { name: "Shelf navigation map" })).toHaveClass("mini-shelf-panel");
    expect(screen.getByRole("button", { name: "Scan Product" })).toHaveClass("mini-scan-button");
    expect(screen.getByRole("button", { name: "Request assistance" }).closest(".mini-assistance-panel")).toHaveClass("mini-assistance-panel");
    expect(screen.getByRole("button", { name: "Language EN" }).closest(".mini-language-chips")).toHaveClass("mini-language-chips");
    expect(screen.getByRole("button", { name: /Explore Demo/i })).toHaveClass("mini-fullscreen-toggle");
  });

  it("switches the mini app into mobile fullscreen panels for small screens", async () => {
    window.history.pushState({}, "", "/vitakiosk");
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Explore Demo/i }));

    const demo = document.querySelector("#interactive-demo");
    expect(demo).toHaveAttribute("data-mobile-panel", "voice");
    expect(screen.getByRole("navigation", { name: /Fullscreen demo sections/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Mobile demo tab Scan/i }));
    expect(demo).toHaveAttribute("data-mobile-panel", "scan");
    await user.click(screen.getAllByRole("button", { name: "Scan Product" })[0]);
    expect(screen.getByRole("dialog", { name: /scan product demo state/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Close demo state/i }));

    await user.click(screen.getByRole("button", { name: /Mobile demo tab Assist/i }));
    expect(demo).toHaveAttribute("data-mobile-panel", "assistance");
    await user.click(screen.getByRole("button", { name: "Request assistance" }));
    expect(screen.getByRole("dialog", { name: /pharmacist handoff demo state/i })).toBeInTheDocument();
  });

  it("runs Tap to Speak through listening and answering states inside the embedded demo", async () => {
    window.history.pushState({}, "", "/vitakiosk");
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Tap to Speak" }));

    expect(screen.getByTestId("demo-state-machine")).toHaveAttribute("data-state", "listening");
    expect(screen.getByText(/Where is Relief Balm/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("demo-state-machine")).toHaveAttribute("data-state", "answering");
    });
    expect(screen.getByText(/Relief Balm is available at Shelf A-03/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Product panel" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "Shelf navigation map" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "Promotion leaflet" })).toHaveAttribute("data-active", "true");
  });

  it("handles fuzzy match selection and highlights product, shelf, and promotion areas", async () => {
    window.history.pushState({}, "", "/vitakiosk");
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Relief Bomb/i }));

    expect(screen.getAllByText(/Do you mean/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Relief Balm" }));

    expect(screen.getByTestId("demo-state-machine")).toHaveAttribute("data-state", "answering");
    expect(screen.getByRole("button", { name: "Product panel" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "Shelf navigation map" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "Promotion leaflet" })).toHaveAttribute("data-active", "true");
  });

  it("opens product, promotion, shelf, scan, and pharmacist states from real mini-app controls", async () => {
    window.history.pushState({}, "", "/vitakiosk");
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Product panel" }));
    expect(screen.getByRole("dialog", { name: /product enlarged demo state/i })).toBeInTheDocument();
    expect(screen.getByText(/Product summary/i)).toBeInTheDocument();
    await user.click(screen.getByText(/Product summary/i));
    expect(screen.getByText(/Product detail/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Close demo state/i }));

    await user.click(screen.getByRole("button", { name: "Promotion leaflet" }));
    expect(screen.getByRole("dialog", { name: /promotion open demo state/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Sponsored product education must be clearly labelled/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Close demo state/i }));

    await user.click(screen.getByRole("button", { name: "Shelf navigation map" }));
    expect(screen.getByRole("dialog", { name: /shelf route demo state/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Shelf route/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Entrance > Aisle 03 > Shelf A-03/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Close route/i }));

    await user.click(screen.getByRole("button", { name: "Scan Product" }));
    expect(screen.getByRole("dialog", { name: /scan product demo state/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Best match: Relief Balm/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Select Relief Balm/i }));
    expect(screen.getByTestId("demo-state-machine")).toHaveAttribute("data-state", "answering");

    await user.click(screen.getByRole("button", { name: "Request assistance" }));
    expect(screen.getByRole("dialog", { name: /pharmacist handoff demo state/i })).toBeInTheDocument();
    expect(screen.getAllByText(/A pharmacist or staff member can assist you/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Not diagnosis, prescription consultation/i)).toBeInTheDocument();
  });

  it("switches demo language labels without changing the product name or reloading", async () => {
    window.history.pushState({}, "", "/vitakiosk");
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Language 中文" }));
    expect(screen.getByText(/中文 selected/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tap to Speak" }));
    expect(screen.getByText(/Where is Relief Balm/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/仅提供产品教育与导购指引/i)).toBeInTheDocument();
    });
  });

  it("opens the spherical video carousel viewer", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /VitaKiosk Interactive Demo Internal Lab Build/i }));

    expect(screen.getByRole("dialog", { name: /VitaKiosk Interactive Demo full video viewer/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Tap, scan, enlarge/i).length).toBeGreaterThan(0);
  });

  it("uses a compact orbit deck on phone-width screens", async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes("max-width: 767px"),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });

    try {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Spherical video carousel/i)).toHaveAttribute(
          "data-layout-mode",
          "compact-deck",
        );
      });
      expect(document.querySelectorAll('.video-orbit-card[data-visible="true"]').length).toBeLessThanOrEqual(3);
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
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
    expect(aiPharmacyAssistantAvatar.src).toBe("/assets/avatar/ai-pharmacy-assistant-avatar.png");
    expect(aiPharmacyAssistantAvatar.channel).toBe("avatar");
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
      demoAssets.aiPharmacyAssistantAvatar,
      demoAssets.approvedVitaKioskReference,
      ...demoAssets.vitaflow.screenshots,
      ...videoHubItems,
    ];

    expect(roots).toContain("/assets/reference/");
    expect(roots).toContain("/assets/avatar/");
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
