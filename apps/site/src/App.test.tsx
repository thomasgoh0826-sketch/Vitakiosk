import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { ErpOrbitCarousel } from "./components/ErpOrbitCarousel";
import { InteractiveVitaKioskMiniApp } from "./components/InteractiveVitaKioskMiniApp";
import {
  aiPharmacyAssistantAvatar,
  approvedVitaKioskReference,
  demoAssetRoots,
  demoAssets,
  vitakioskKioskModel,
  vitakioskTabletModel,
} from "./content/demoAssets";
import { videoHubItems } from "./content/videoHub";
import { getPricingByCategory, pricingItems } from "./content/pricing";
import { createPaymentProvider } from "./lib/payments";
import { defaultFormValues, sanitizeText, validateSiteForm } from "./lib/forms";

describe("VitaKiosk Asia site", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  const dispatchPointerEvent = (
    target: Element,
    type: string,
    options: {
      clientX: number;
      clientY?: number;
      pointerId?: number;
      pointerType?: string;
      button?: number;
    },
  ) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      clientX: { value: options.clientX },
      clientY: { value: options.clientY ?? 0 },
      pointerId: { value: options.pointerId ?? 1 },
      pointerType: { value: options.pointerType ?? "mouse" },
      button: { value: options.button ?? 0 },
    });
    fireEvent(target, event);
  };

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
    expect(
      screen.getByRole("heading", { name: /Healthcare safety wording is part of the product/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/VitaKiosk provides general product education, where-to-buy guidance/i),
    ).toBeInTheDocument();
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText("VitaKiosk Asia")).toBeInTheDocument();
    expect(within(footer).getByRole("link", { name: "Showcase" })).toHaveAttribute("href", "/showcase");
    expect(within(footer).getByRole("link", { name: "Disclaimer" })).toHaveAttribute(
      "href",
      "/legal/disclaimer",
    );
    expect(within(footer).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/legal/privacy");
    expect(within(footer).getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/legal/terms");
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
    expect(document.querySelector(".demo-reference-showcase img")).toHaveAttribute(
      "src",
      approvedVitaKioskReference.src,
    );
  });

  it("opens a restricted bottom-right customer service bot without exposing provider secrets", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          answer:
            "VitaKiosk Asia supports VitaFlow ERP, VitaKiosk AI Kiosk, AI Website Studio, and AI Academy.",
          topic_allowed: true,
          live_provider: false,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    try {
      render(<App />);
      const user = userEvent.setup();

      const customerServiceBot = screen.getByTestId("customer-service-bot");
      expect(customerServiceBot).toBeInTheDocument();
      expect(customerServiceBot).toHaveAttribute("data-mobile-anchor", "right");
      expect(customerServiceBot).toHaveAttribute("data-mobile-launcher-shape", "sphere");
      await user.click(screen.getByRole("button", { name: /Open VitaKiosk Asia customer service/i }));
      await user.type(
        screen.getByLabelText(/Ask the VitaKiosk Asia assistant/i),
        "What services do you offer?",
      );
      await user.click(screen.getByRole("button", { name: /Send chat message/i }));

      await waitFor(() => {
        expect(screen.getByText(/supports VitaFlow ERP/i)).toBeInTheDocument();
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/site/chat"),
        expect.objectContaining({
          method: "POST",
          headers: { "content-type": "application/json" },
        }),
      );
      const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
      const requestBody = JSON.parse(String(requestInit.body));
      expect(requestBody).toMatchObject({
        message: "What services do you offer?",
      });
      expect(requestBody.history).toEqual([
        expect.objectContaining({
          role: "assistant",
          text: expect.stringContaining("public website questions"),
        }),
      ]);
      expect(JSON.stringify(fetchSpy.mock.calls[0])).not.toMatch(/authorization|agnes|sk-/i);
      expect(document.querySelector("iframe")).not.toBeInTheDocument();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("uses the original interface device visual in the hero", () => {
    render(<App />);

    const interfaceVisual = screen.getByTestId("hero-interface-visual");

    expect(interfaceVisual).toBeInTheDocument();
    expect(interfaceVisual.querySelector(".avatar-mini")).toBeInTheDocument();
    expect(interfaceVisual.querySelector(".product-mini")).toBeInTheDocument();
    expect(interfaceVisual.querySelector(".map-mini")).toBeInTheDocument();
    expect(interfaceVisual.querySelector(".promo-mini")).toBeInTheDocument();
    expect(screen.queryByTestId("hero-avatar-video")).not.toBeInTheDocument();
  });

  it("keeps hero service cards clickable around the restored visual", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: /Explore AI Website Studio/i })).toHaveAttribute(
      "href",
      "/ai-website-studio",
    );
    expect(screen.getByRole("link", { name: /Explore VitaKiosk AI Kiosk/i })).toHaveAttribute("href", "/vitakiosk");
  });

  it("uses the approved AI Academy video clip in the media orbit manifest", () => {
    const academyVideo = videoHubItems.find((item) => item.id === "ai-academy");

    expect(academyVideo).toBeDefined();
    expect(academyVideo?.poster).toBe("/assets/posters/jimeng/ai-academy-32s.jpg");
    expect(academyVideo?.previewSrc).toBe("/assets/videos/jimeng/ai-academy-32s.mp4");
    expect(academyVideo?.fullSrc).toBe("/assets/videos/jimeng/ai-academy-32s.mp4");
    expect(academyVideo?.previewType).toBe("video/mp4");
    expect(academyVideo?.fullType).toBe("video/mp4");
    expect(academyVideo?.status).toBe("Demo Capture");
    expect(academyVideo?.duration).toBe("32s clip");
  });

  it("applies universal scroll reveal markers for desktop and laptop motion profiles", async () => {
    const originalMatchMedia = window.matchMedia;
    const originalIntersectionObserver = window.IntersectionObserver;

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes("min-width: 1024px") || query.includes("hover: hover") || query.includes("pointer: fine"),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: class {
        private callback: IntersectionObserverCallback;

        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback;
        }

        observe(target: Element) {
          this.callback(
            [{ isIntersecting: true, target } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        }
        unobserve() {
          return undefined;
        }
        disconnect() {
          return undefined;
        }
      },
    });

    try {
      render(<App />);

      await waitFor(() => {
        expect(document.querySelector(".hero-copy")).toHaveAttribute("data-scroll-reveal", "revealed");
      });

      expect(document.querySelector(".scene-copy")).toHaveAttribute("data-scroll-reveal", "revealed");
      expect(document.querySelector(".section-heading")).toHaveAttribute("data-scroll-reveal", "revealed");
      expect(document.querySelector(".video-orbit-shell")).toHaveAttribute("data-scroll-reveal", "revealed");
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
      Object.defineProperty(window, "IntersectionObserver", {
        configurable: true,
        writable: true,
        value: originalIntersectionObserver,
      });
    }
  });

  it("keeps scroll reveal static on touch and tablet input profiles", async () => {
    const originalMatchMedia = window.matchMedia;
    const originalIntersectionObserver = window.IntersectionObserver;
    const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
    const observe = vi.fn();

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches:
          query.includes("pointer: coarse") ||
          query.includes("hover: none") ||
          query.includes("max-width"),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: class {
        observe() {
          observe();
        }
        unobserve() {
          return undefined;
        }
        disconnect() {
          return undefined;
        }
      },
    });

    try {
      render(<App />);

      await waitFor(() => {
        expect(document.querySelector(".hero-copy")).toHaveAttribute("data-scroll-reveal", "static");
      });

      expect(observe).not.toHaveBeenCalled();
      expect((document.querySelector(".hero-copy") as HTMLElement).style.getPropertyValue("--reveal-delay")).toBe("");
      expect(document.querySelector(".scene-copy")).toHaveAttribute("data-scroll-reveal", "static");
      expect(document.querySelector(".video-orbit-shell")).toHaveAttribute("data-scroll-reveal", "static");

      Object.defineProperty(window, "scrollY", {
        configurable: true,
        value: 900,
      });
      fireEvent.scroll(window);

      await new Promise((resolve) => window.setTimeout(resolve, 20));
      expect((document.querySelector(".page-shell") as HTMLElement).style.getPropertyValue("--page-progress")).toBe("0");
      expect((document.querySelector(".hero-scene") as HTMLElement).style.getPropertyValue("--scroll-shift")).toBe("0px");
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
      Object.defineProperty(window, "IntersectionObserver", {
        configurable: true,
        writable: true,
        value: originalIntersectionObserver,
      });
      if (originalScrollY) {
        Object.defineProperty(window, "scrollY", originalScrollY);
      }
    }
  });

  it("renders launch-facing legal pages without local mock placeholder wording", () => {
    window.history.pushState({}, "", "/legal/terms");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Terms" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Healthcare and advertising review/i })).toBeInTheDocument();
    expect(screen.getByText(/Online card payment is not enabled on this website/i)).toBeInTheDocument();
    expect(screen.getByText(/clinic, hospital, pharmacy, or partner placements/i)).toBeInTheDocument();

    const publicText = document.body.textContent || "";
    expect(publicText).not.toMatch(/mock-first|local site/i);
    expect(publicText).toContain("diagnosis, prescription drug consultation, or professional medical advice");
  });

  it("renders the public disclaimer as product education only", () => {
    window.history.pushState({}, "", "/legal/disclaimer");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Disclaimer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Not medical advice/i })).toBeInTheDocument();
    expect(screen.getByText(/does not replace pharmacists, doctors, clinic staff/i)).toBeInTheDocument();
    expect(screen.getByText(/does not make hospital, doctor, pharmacist, or institution endorsement claims/i)).toBeInTheDocument();
  });

  it("renders the VitaFlow ERP source scene as connected operational layers", () => {
    render(<App />);

    const visual = document.querySelector('[data-component="ErpOperationalLayersVisual"]');

    expect(screen.getByRole("heading", { name: /The source of truth stays behind every answer/i })).toBeInTheDocument();
    expect(visual).toBeInTheDocument();
    expect(within(visual as HTMLElement).getByRole("heading", { name: "Counter" })).toBeInTheDocument();
    expect(within(visual as HTMLElement).getByRole("heading", { name: "Back Office" })).toBeInTheDocument();
    expect(within(visual as HTMLElement).getByRole("heading", { name: "HQ & Buying" })).toBeInTheDocument();
    expect(within(visual as HTMLElement).getByText("POS Checkout")).toBeInTheDocument();
    expect(within(visual as HTMLElement).getByText("Customer Purchase History")).toBeInTheDocument();
    expect(within(visual as HTMLElement).getByText("Master Inventory")).toBeInTheDocument();
    expect(within(visual as HTMLElement).getByText("ONE SYSTEM. THREE OPERATIONAL LAYERS.")).toBeInTheDocument();
    expect(within(visual as HTMLElement).queryByText("Relief Balm")).not.toBeInTheDocument();
    expect(within(visual as HTMLElement).queryByText("Stock 18")).not.toBeInTheDocument();
    expect(within(visual as HTMLElement).queryByText("Promotion reviewed")).not.toBeInTheDocument();
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
    expect(showcase.querySelector('[data-component="DraggableTabletModel"]')).toHaveAttribute(
      "data-model-src",
      vitakioskTabletModel.src,
    );
    expect(showcase.querySelector('[data-component="DraggableTabletModel"]')).toHaveAttribute(
      "data-touch-rotate-enabled",
      "true",
    );
    expect(showcase.querySelector('[data-component="DraggableTabletModel"]')).toHaveAttribute(
      "data-mouse-rotate-enabled",
      "true",
    );
    expect(scope.getByLabelText(/Draggable 3D VitaKiosk tablet model/i)).toBeInTheDocument();

    await user.click(erpTab);
    expect(erpTab).toHaveAttribute("aria-pressed", "true");
    expect(scope.getByRole("heading", { name: /ERP remains the source of truth/i })).toBeInTheDocument();
    expect(showcase.querySelector('[data-component="ErpOrbitCarousel"]')).toBeInTheDocument();
    expect(scope.getAllByRole("button", { name: /ERP preview/i })).toHaveLength(3);
    expect(scope.getByRole("button", { name: /Reports screen ERP preview/i })).toBeInTheDocument();
    expect(scope.getByRole("button", { name: /POS Checkout screen ERP preview/i })).toBeInTheDocument();
    expect(scope.getByRole("button", { name: /HQ Live screen ERP preview/i })).toBeInTheDocument();

    await user.click(websiteTab);
    expect(websiteTab).toHaveAttribute("aria-pressed", "true");
    expect(scope.getByRole("heading", { name: /website becomes a growth surface/i })).toBeInTheDocument();
    expect(showcase.querySelector('[data-component="WebsiteAutomationVisual"]')).toBeInTheDocument();
    expect(scope.getByRole("heading", { name: /Business Funnel Automation/i })).toBeInTheDocument();
    expect(scope.getByText("One system. Every step. Real growth.")).toBeInTheDocument();
    expect(scope.getByText("Automate your growth. Scale with clarity.")).toBeInTheDocument();
    expect(scope.getByText("Unified Data")).toBeInTheDocument();
    expect(scope.getByText("Smart Automation")).toBeInTheDocument();
    expect(scope.getByText("Real-time Insights")).toBeInTheDocument();
    expect(scope.getByText("Secure & Reliable")).toBeInTheDocument();
    expect(scope.queryByText(/Dashboard placeholder/i)).not.toBeInTheDocument();

    await user.click(academyTab);
    expect(academyTab).toHaveAttribute("aria-pressed", "true");
    expect(scope.getByRole("heading", { name: /Teams learn the workflow/i })).toBeInTheDocument();
    expect(showcase.querySelector('[data-component="AcademyWorkflowVisual"]')).toBeInTheDocument();
    expect(scope.getByRole("heading", { name: /^AI Academy$/i })).toBeInTheDocument();
    expect(scope.getByText("Learn the workflow. Build with confidence.")).toBeInTheDocument();
    expect(scope.getByText("68% Complete")).toBeInTheDocument();
    expect(scope.getByText("In Progress")).toBeInTheDocument();
    expect(scope.getByText("AI Academy Practitioner")).toBeInTheDocument();
    expect(scope.queryByText(/Dashboard placeholder/i)).not.toBeInTheDocument();

    await user.click(kioskTab);
    expect(kioskTab).toHaveAttribute("aria-pressed", "true");
    expect(scope.getByRole("heading", { name: /large kiosk that feels alive/i })).toBeInTheDocument();
    expect(showcase.querySelector('[data-component="DraggableKioskModel"]')).toHaveAttribute(
      "data-model-src",
      vitakioskKioskModel.src,
    );
    expect(showcase.querySelector('[data-component="DraggableKioskModel"]')).toHaveAttribute(
      "data-touch-rotate-enabled",
      "true",
    );
    expect(showcase.querySelector('[data-component="DraggableKioskModel"]')).toHaveAttribute(
      "data-mouse-rotate-enabled",
      "true",
    );
    expect(scope.getByLabelText(/Draggable 3D VitaKiosk large kiosk model/i)).toBeInTheDocument();
  });

  it("keeps 3D model touch surfaces scroll-friendly on phones", () => {
    render(<App />);
    const showcase = screen.getByLabelText("VitaKiosk Asia system showcase");
    const scope = within(showcase);
    expect(scope.getByLabelText(/Draggable 3D VitaKiosk tablet model/i)).toHaveAttribute(
      "data-touch-scroll-mode",
      "pan-y",
    );
  });

  it("enlarges ERP orbit previews and keeps touch scroll separate from mouse drag", async () => {
    const user = userEvent.setup();
    render(<ErpOrbitCarousel images={demoAssets.vitaflow.orbitScreenshots} />);

    const carousel = screen.getByLabelText(/VitaFlow ERP screenshot orbit carousel/i);
    const posPreview = screen.getByRole("button", { name: /POS Checkout screen ERP preview/i });

    await user.click(posPreview);

    expect(posPreview).toHaveAttribute("aria-pressed", "true");
    expect(posPreview.getAttribute("style")).toContain("--erp-card-scale: 1.04");
    expect(posPreview.getAttribute("style")).toContain("--erp-card-width: var(--erp-card-base-width)");

    const dialog = screen.getByRole("dialog", { name: /POS Checkout screen enlarged ERP preview/i });
    expect(within(dialog).getByRole("img", { name: /POS Checkout screen/i })).toHaveAttribute(
      "src",
      demoAssets.vitaflow.orbitScreenshots[1].src,
    );
    expect(dialog.querySelector(".erp-orbit-card-label")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Close ERP preview/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Close ERP preview/i }));
    expect(posPreview).toHaveAttribute("aria-pressed", "false");

    expect(carousel).toHaveAttribute("data-swipe-enabled", "true");
    expect(carousel).toHaveAttribute("data-touch-drag-enabled", "true");
    expect(carousel).toHaveAttribute("data-mouse-drag-enabled", "true");

    dispatchPointerEvent(carousel, "pointerdown", {
      pointerType: "mouse",
      pointerId: 32,
      button: 0,
      clientX: 330,
      clientY: 180,
    });
    dispatchPointerEvent(carousel, "pointermove", {
      pointerType: "mouse",
      pointerId: 32,
      clientX: 120,
      clientY: 186,
    });

    await waitFor(() => {
      expect(carousel).toHaveAttribute("data-dragging", "true");
      expect(carousel).toHaveAttribute("data-paused", "true");
    });

    dispatchPointerEvent(carousel, "pointerup", {
      pointerType: "mouse",
      pointerId: 32,
      clientX: 120,
      clientY: 186,
    });

    await waitFor(() => {
      expect(carousel).toHaveAttribute("data-dragging", "false");
    });

    fireEvent.touchStart(carousel, {
      touches: [{ clientX: 330, clientY: 180 }],
      changedTouches: [{ clientX: 330, clientY: 180 }],
    });
    fireEvent.touchMove(carousel, {
      touches: [{ clientX: 326, clientY: 270 }],
      changedTouches: [{ clientX: 326, clientY: 270 }],
    });
    expect(carousel).toHaveAttribute("data-dragging", "false");
    fireEvent.touchEnd(carousel, {
      changedTouches: [{ clientX: 326, clientY: 270 }],
    });

    fireEvent.touchStart(carousel, {
      touches: [{ clientX: 330, clientY: 180 }],
      changedTouches: [{ clientX: 330, clientY: 180 }],
    });
    fireEvent.touchMove(carousel, {
      touches: [{ clientX: 128, clientY: 186 }],
      changedTouches: [{ clientX: 128, clientY: 186 }],
    });
    await waitFor(() => {
      expect(carousel).toHaveAttribute("data-dragging", "true");
    });
    fireEvent.touchEnd(carousel, {
      changedTouches: [{ clientX: 128, clientY: 186 }],
    });
  });

  it("opens and closes ERP orbit previews with touch controls on mobile", async () => {
    render(<ErpOrbitCarousel images={demoAssets.vitaflow.orbitScreenshots} />);

    const hqPreview = screen.getByRole("button", { name: /HQ Live screen ERP preview/i });

    fireEvent.touchStart(hqPreview, {
      touches: [{ clientX: 220, clientY: 180 }],
      changedTouches: [{ clientX: 220, clientY: 180 }],
    });
    fireEvent.touchEnd(hqPreview, {
      changedTouches: [{ clientX: 220, clientY: 180 }],
    });

    const dialog = await screen.findByRole("dialog", { name: /HQ Live screen enlarged ERP preview/i });
    expect(dialog.parentElement).toHaveClass("erp-preview-viewer");

    const closeButton = screen.getByRole("button", { name: /Close ERP preview/i });
    fireEvent.touchEnd(closeButton, {
      changedTouches: [{ clientX: 320, clientY: 80 }],
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /HQ Live screen enlarged ERP preview/i })).not.toBeInTheDocument();
    });
  });

  it("moves ERP orbit cards in the same horizontal direction as mouse drag", async () => {
    const renderOrbit = () => {
      const view = render(<ErpOrbitCarousel images={demoAssets.vitaflow.orbitScreenshots} />);
      const carousel = screen.getByLabelText(/VitaFlow ERP screenshot orbit carousel/i);
      const reportsPreview = screen.getByRole("button", { name: /Reports screen ERP preview/i });
      return { ...view, carousel, reportsPreview };
    };

    const left = renderOrbit();
    dispatchPointerEvent(left.carousel, "pointerdown", { pointerType: "mouse", pointerId: 41, button: 0, clientX: 330, clientY: 180 });
    dispatchPointerEvent(left.carousel, "pointermove", { pointerType: "mouse", pointerId: 41, clientX: 120, clientY: 186 });

    await waitFor(() => {
      const x = Number.parseFloat(left.reportsPreview.style.getPropertyValue("--erp-card-x") || "0");
      expect(x).toBeLessThan(0);
    });
    dispatchPointerEvent(left.carousel, "pointerup", { pointerType: "mouse", pointerId: 41, clientX: 120, clientY: 186 });
    left.unmount();

    const right = renderOrbit();
    fireEvent.touchStart(right.carousel, {
      touches: [{ clientX: 120, clientY: 180 }],
      changedTouches: [{ clientX: 120, clientY: 180 }],
    });
    fireEvent.touchMove(right.carousel, {
      touches: [{ clientX: 330, clientY: 186 }],
      changedTouches: [{ clientX: 330, clientY: 186 }],
    });

    await waitFor(() => {
      const x = Number.parseFloat(right.reportsPreview.style.getPropertyValue("--erp-card-x") || "0");
      expect(x).toBeGreaterThan(0);
    });
    fireEvent.touchEnd(right.carousel, {
      changedTouches: [{ clientX: 330, clientY: 186 }],
    });
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
    render(<InteractiveVitaKioskMiniApp />);
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

  it("renders the public demo stage as a high-fidelity image with the live demo link on port 5177", () => {
    window.history.pushState({}, "", "/vitakiosk");
    render(<App />);

    const demo = document.querySelector("#interactive-demo");

    expect(demo).toHaveAttribute("data-component", "VitaKioskDemoImage");
    expect(demo?.querySelector("img")).toHaveAttribute("src", approvedVitaKioskReference.src);
    expect(demo?.querySelector("iframe")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open live local demo if running/i })).toHaveAttribute(
      "href",
      "http://127.0.0.1:5177/",
    );
  });

  it("switches the mini app into mobile fullscreen panels for small screens", async () => {
    render(<InteractiveVitaKioskMiniApp />);
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
    render(<InteractiveVitaKioskMiniApp />);
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
    render(<InteractiveVitaKioskMiniApp />);
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
    render(<InteractiveVitaKioskMiniApp />);
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
    render(<InteractiveVitaKioskMiniApp />);
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

    await user.click(screen.getByRole("button", { name: /AI Academy Demo Capture/i }));

    expect(screen.getByRole("dialog", { name: /AI Academy full video viewer/i })).toBeInTheDocument();
    expect(screen.getAllByText(/practical operating workflows/i).length).toBeGreaterThan(0);
  });

  it("uses a compact orbit deck on phone-width screens", async () => {
    const originalMatchMedia = window.matchMedia;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    let rafId = 0;
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
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: (callback: FrameRequestCallback) => {
        rafId += 1;
        rafCallbacks.set(rafId, callback);
        return rafId;
      },
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      writable: true,
      value: (id: number) => {
        rafCallbacks.delete(id);
      },
    });

    try {
      render(<App />);

      const orbit = screen.getByLabelText(/Spherical video carousel/i);

      await waitFor(() => {
        expect(orbit).toHaveAttribute("data-layout-mode", "compact-deck");
      });
      expect(document.querySelectorAll('.video-orbit-card[data-visible="true"]').length).toBeLessThanOrEqual(3);
      expect(screen.getByRole("heading", { name: "Why VitaKiosk Asia ?" })).toBeInTheDocument();
      expect(document.querySelector(".video-orbit-card.is-active")).toHaveAttribute(
        "data-preview-policy",
        "poster-first",
      );
      expect(document.querySelectorAll(".video-orbit-card video")).toHaveLength(0);
      expect(orbit).toHaveAttribute("data-auto-rotate", "true");
      expect(orbit).toHaveAttribute("data-paused", "false");
      expect(orbit).toHaveAttribute("data-touch-drag-enabled", "true");

      fireEvent.touchStart(orbit, {
        touches: [{ clientX: 300, clientY: 260 }],
        changedTouches: [{ clientX: 300, clientY: 260 }],
      });
      fireEvent.touchMove(orbit, {
        touches: [{ clientX: 296, clientY: 340 }],
        changedTouches: [{ clientX: 296, clientY: 340 }],
      });
      expect(orbit).toHaveAttribute("data-touching", "false");
      expect(orbit).toHaveAttribute("data-dragging", "false");
      fireEvent.touchEnd(orbit, {
        changedTouches: [{ clientX: 296, clientY: 340 }],
      });

      fireEvent.touchStart(orbit, {
        touches: [{ clientX: 300, clientY: 260 }],
        changedTouches: [{ clientX: 300, clientY: 260 }],
      });
      fireEvent.touchMove(orbit, {
        touches: [{ clientX: 160, clientY: 264 }],
        changedTouches: [{ clientX: 160, clientY: 264 }],
      });
      expect(orbit).toHaveAttribute("data-touching", "true");
      expect(orbit).toHaveAttribute("data-dragging", "true");
      fireEvent.touchEnd(orbit, {
        changedTouches: [{ clientX: 160, clientY: 264 }],
      });

      const initialProgress = Number.parseFloat(orbit.getAttribute("data-orbital-progress") || "0");
      await act(async () => {
        for (let tick = 1; tick <= 48; tick += 1) {
          const callbacks = Array.from(rafCallbacks.values());
          rafCallbacks.clear();
          callbacks.forEach((callback) => callback(performance.now() + tick * 72));
        }
      });

      await waitFor(() => {
        expect(Number.parseFloat(orbit.getAttribute("data-orbital-progress") || "0")).toBeGreaterThan(initialProgress);
      });
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
      Object.defineProperty(window, "requestAnimationFrame", {
        configurable: true,
        writable: true,
        value: originalRequestAnimationFrame,
      });
      Object.defineProperty(window, "cancelAnimationFrame", {
        configurable: true,
        writable: true,
        value: originalCancelAnimationFrame,
      });
    }
  });

  it("rotates the spherical video carousel by drag instead of click-only navigation", () => {
    render(<App />);

    const orbit = screen.getByLabelText(/Spherical video carousel/i);
    expect(screen.getByTestId("orbit-active-title")).toHaveTextContent("AI Academy");

    dispatchPointerEvent(orbit, "pointerdown", { clientX: 520, clientY: 260, pointerId: 7, pointerType: "mouse" });
    dispatchPointerEvent(orbit, "pointermove", { clientX: 390, clientY: 260, pointerId: 7, pointerType: "mouse" });
    dispatchPointerEvent(orbit, "pointerup", { clientX: 390, clientY: 260, pointerId: 7, pointerType: "mouse" });

    expect(screen.getByTestId("orbit-active-title")).not.toHaveTextContent("AI Academy");
  });

  it("renders the video viewer above the carousel layer using a document-level portal", () => {
    render(<App />);

    const activeCard = document.querySelector(".video-orbit-card.is-active") as HTMLButtonElement;
    expect(activeCard).toBeInTheDocument();

    fireEvent.click(activeCard);

    const dialog = screen.getByRole("dialog", { name: /AI Academy full video viewer/i });
    expect(dialog.parentElement).toHaveClass("video-viewer-backdrop");
    expect(dialog.closest(".spherical-video-scene")).not.toBeInTheDocument();
    expect(dialog.closest(".video-orbit-shell")).not.toBeInTheDocument();

    dispatchPointerEvent(screen.getByRole("button", { name: /Close video viewer/i }), "pointerup", {
      pointerType: "touch",
      pointerId: 61,
      clientX: 340,
      clientY: 90,
    });

    expect(screen.queryByRole("dialog", { name: /AI Academy full video viewer/i })).not.toBeInTheDocument();
  });

  it("rotates the video carousel on horizontal touch swipe but leaves vertical touch scroll alone", () => {
    render(<App />);

    const orbit = screen.getByLabelText(/Spherical video carousel/i);
    expect(screen.getByTestId("orbit-active-title")).toHaveTextContent("AI Academy");

    fireEvent.touchStart(orbit, {
      touches: [{ clientX: 520, clientY: 260 }],
      changedTouches: [{ clientX: 520, clientY: 260 }],
    });
    fireEvent.touchMove(orbit, {
      touches: [{ clientX: 516, clientY: 332 }],
      changedTouches: [{ clientX: 516, clientY: 332 }],
    });

    expect(orbit).toHaveAttribute("data-touch-drag-enabled", "true");
    expect(orbit).toHaveAttribute("data-mouse-drag-enabled", "true");
    expect(orbit).toHaveAttribute("data-touching", "false");
    expect(orbit).toHaveAttribute("data-dragging", "false");

    fireEvent.touchEnd(orbit, {
      changedTouches: [{ clientX: 516, clientY: 332 }],
    });

    expect(screen.getByTestId("orbit-active-title")).toHaveTextContent("AI Academy");

    fireEvent.touchStart(orbit, {
      touches: [{ clientX: 520, clientY: 260 }],
      changedTouches: [{ clientX: 520, clientY: 260 }],
    });
    fireEvent.touchMove(orbit, {
      touches: [{ clientX: 390, clientY: 262 }],
      changedTouches: [{ clientX: 390, clientY: 262 }],
    });
    expect(orbit).toHaveAttribute("data-dragging", "true");
    fireEvent.touchEnd(orbit, {
      changedTouches: [{ clientX: 390, clientY: 262 }],
    });

    expect(screen.getByTestId("orbit-active-title")).not.toHaveTextContent("AI Academy");
  });

  it("supports iOS-style touch events for the media orbit without trapping vertical page scroll", () => {
    render(<App />);

    const orbit = screen.getByLabelText(/Spherical video carousel/i);
    expect(screen.getByTestId("orbit-active-title")).toHaveTextContent("AI Academy");

    fireEvent.touchStart(orbit, {
      touches: [{ clientX: 260, clientY: 260 }],
      changedTouches: [{ clientX: 260, clientY: 260 }],
    });
    fireEvent.touchMove(orbit, {
      touches: [{ clientX: 254, clientY: 344 }],
      changedTouches: [{ clientX: 254, clientY: 344 }],
    });
    expect(orbit).toHaveAttribute("data-touching", "false");
    expect(orbit).toHaveAttribute("data-dragging", "false");
    fireEvent.touchEnd(orbit, {
      changedTouches: [{ clientX: 254, clientY: 344 }],
    });

    fireEvent.touchStart(orbit, {
      touches: [{ clientX: 300, clientY: 260 }],
      changedTouches: [{ clientX: 300, clientY: 260 }],
    });
    fireEvent.touchMove(orbit, {
      touches: [{ clientX: 132, clientY: 264 }],
      changedTouches: [{ clientX: 132, clientY: 264 }],
    });
    expect(orbit).toHaveAttribute("data-touching", "true");
    expect(orbit).toHaveAttribute("data-dragging", "true");
    fireEvent.touchEnd(orbit, {
      changedTouches: [{ clientX: 132, clientY: 264 }],
    });

    expect(screen.getByTestId("orbit-active-title")).not.toHaveTextContent("AI Academy");
  });

  it("renders route pages as authored experiences instead of placeholders", () => {
    window.history.pushState({}, "", "/vitaflow");
    render(<App />);

    expect(screen.getByRole("heading", { name: /VitaFlow keeps facts grounded/i })).toBeInTheDocument();
    expect(screen.queryByText(/Route-ready page/i)).not.toBeInTheDocument();
  });

  it("validates forms before creating records", async () => {
    render(<App />);

    await userEvent.click(screen.getByRole("button", { name: /Submit Inquiry/i }));

    expect(screen.getByText(/Enter a contact name/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter a valid email/i)).toBeInTheDocument();
  });
});

describe("pricing config", () => {
  const byId = (id: string) => {
    const item = pricingItems.find((candidate) => candidate.id === id);
    expect(item).toBeDefined();
    return item!;
  };

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
    expect(getPricingByCategory("aiWebsite")).toHaveLength(4);
  });

  it("does not scatter payment modes outside known values", () => {
    const modes = new Set(pricingItems.map((item) => item.checkoutMode));
    expect([...modes].sort()).toEqual(["deposit", "one_time", "quote", "subscription"]);
  });

  it("uses the real listed prices from the structured pricing config", () => {
    expect(byId("vitaflow-starter-monthly").priceLabel).toBe("Free setup + RM199/month");
    expect(byId("vitaflow-growth-monthly").priceLabel).toBe("Free setup + RM399/month");
    expect(byId("vitaflow-enterprise").priceLabel).toBe("Free setup + custom quote from RM899/month");
    expect(byId("vitakiosk-local-edition").priceLabel).toBe("From RM500 setup + RM200/month maintenance");
    expect(byId("vitakiosk-clinic-partner-campaign").priceLabel).toBe("From RM1,500/campaign");
    expect(byId("landing-page-launch").priceLabel).toBe("From RM80");
    expect(byId("business-website").priceLabel).toBe("From RM200");
    expect(byId("ai-website-chatbot").priceLabel).toBe("From RM200 + RM150/month");
    expect(byId("custom-web-app").priceLabel).toBe("From RM300");
  });

  it("marks only the specified AI Academy packages as non-negotiable", () => {
    const nonNegotiableIds = pricingItems
      .filter((item) => item.nonNegotiableLabel === "Non-negotiable")
      .map((item) => item.id);

    expect(nonNegotiableIds).toEqual([
      "ai-pharmacy-workflow",
      "codex-website-coaching",
      "ai-content-video-workflow",
    ]);
    expect(byId("ai-pharmacy-workflow")).toMatchObject({
      priceLabel: "RM499",
      negotiable: false,
      nonNegotiableLabel: "Non-negotiable",
    });
    expect(byId("codex-website-coaching")).toMatchObject({
      priceLabel: "RM399/session",
      negotiable: false,
      nonNegotiableLabel: "Non-negotiable",
    });
    expect(byId("ai-content-video-workflow")).toMatchObject({
      priceLabel: "RM399/session",
      negotiable: false,
      nonNegotiableLabel: "Non-negotiable",
    });
  });

  it("drives the pricing UI from config and avoids public mock payment wording", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/pricing");
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "VitaFlow ERP" }));
    expect(screen.getAllByText("Free setup + RM199/month").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: "AI Academy" }));
    expect(screen.getAllByText("RM499").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Non-negotiable").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: "AI Website Studio" }));
    expect(screen.getAllByText("From RM200 + RM150/month").length).toBeGreaterThan(0);

    const publicText = document.body.textContent || "";
    expect(publicText).toContain("Manual payment and quotation are available");
    expect(publicText).toContain("Manual payment confirmation");
    expect(publicText).not.toMatch(/mock payment|mock checkout|mock provider|development payment|simulate payment|fake checkout|test checkout/i);
  });

  it("uses manual confirmation wording after form submission", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "site-test",
          status: "inquiry_submitted",
          reference_id: "VK-TEST-2026-0001",
          customer_message:
            "Your request has been submitted. We will contact you to confirm scope, schedule, and manual payment details.",
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );

    try {
      render(<App />);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/Full name/i), "Thomas Goh");
      await user.type(screen.getByLabelText(/Email/i), "thomas@example.com");
      await user.type(screen.getByLabelText(/Phone/i), "+60123456789");
      await user.type(screen.getByLabelText(/Message/i), "I want pricing details.");
      await user.click(screen.getByRole("button", { name: /Submit Inquiry/i }));

      await waitFor(() => {
        expect(screen.getByText(/Your request has been submitted/i)).toBeInTheDocument();
      });
      const statusOutput = document.querySelector("output.form-status.success");
      expect(statusOutput).toHaveTextContent(/manual payment details/i);
      expect(statusOutput).toHaveTextContent(/Reference: VK-TEST-2026-0001/i);
    } finally {
      fetchMock.mockRestore();
    }
  });
});

describe("asset manifest", () => {
  it("marks ERP captures as placeholders until safe assets exist", () => {
    expect(demoAssets.vitaflow.screenshots[0].kind).toBe("placeholder");
    expect(demoAssets.vitaflow.screenshots[0].notes).toMatch(/non-private ERP demo/i);
    expect(demoAssets.vitaflow.orbitScreenshots.map((asset) => asset.title)).toEqual([
      "Reports screen",
      "POS Checkout screen",
      "HQ Live screen",
    ]);
    expect(demoAssets.vitaflow.orbitScreenshots.every((asset) => asset.src.startsWith("/assets/demos/vitaflow/orbit/"))).toBe(
      true,
    );
  });

  it("keeps the approved VitaKiosk screenshot as reference only", () => {
    expect(approvedVitaKioskReference.kind).toBe("approved_reference");
    expect(approvedVitaKioskReference.channel).toBe("reference");
    expect(approvedVitaKioskReference.src).toBe("/assets/reference/vitakiosk-demo-approved.png");
    expect(approvedVitaKioskReference.notes).toMatch(/public website visual/i);
    expect(aiPharmacyAssistantAvatar.src).toBe("/assets/avatar/ai-pharmacy-assistant-avatar.png");
    expect(aiPharmacyAssistantAvatar.channel).toBe("avatar");
    expect(vitakioskTabletModel.src).toBe("/assets/3d/vitakiosk-tablet.glb");
    expect(vitakioskTabletModel.channel).toBe("model3d");
    expect(vitakioskKioskModel.src).toBe("/assets/3d/vitakiosk-kiosk.glb");
    expect(vitakioskKioskModel.channel).toBe("model3d");
  });

  it("uses manifest-driven generated video previews for the spherical carousel", () => {
    expect(videoHubItems.map((asset) => asset.title)).toEqual([
      "Clinic Queue Problem",
      "Pharmacy Partner Discovery",
      "Retail Pharmacy Promotion",
      "AI Academy",
    ]);
    expect(videoHubItems).toHaveLength(4);
    expect(videoHubItems.map((asset) => asset.id)).not.toEqual(
      expect.arrayContaining(["vitakiosk-interactive-demo", "vitaflow-source-of-truth", "ai-website-studio"]),
    );
    const clinicVideo = videoHubItems.find((asset) => asset.id === "clinic-queue-problem");
    const partnerVideo = videoHubItems.find((asset) => asset.id === "pharmacy-partner-discovery");
    const retailVideo = videoHubItems.find((asset) => asset.id === "retail-pharmacy-promotion");

    expect(clinicVideo?.previewSrc).toBe("/assets/videos/jimeng/clinic-queue-problem-storyboard.mp4");
    expect(clinicVideo?.fullSrc).toBe("/assets/videos/jimeng/clinic-queue-problem-storyboard.mp4");
    expect(clinicVideo?.poster).toBe("/assets/posters/jimeng/clinic-queue-problem-storyboard.jpg");
    expect(clinicVideo?.previewType).toBe("video/mp4");
    expect(clinicVideo?.fullType).toBe("video/mp4");
    expect(partnerVideo?.previewSrc).toBe("/assets/videos/jimeng/pharmacy-partner-discovery-15s.mp4");
    expect(partnerVideo?.fullSrc).toBe("/assets/videos/jimeng/pharmacy-partner-discovery-15s.mp4");
    expect(partnerVideo?.poster).toBe("/assets/posters/jimeng/pharmacy-partner-discovery-15s.jpg");
    expect(partnerVideo?.previewType).toBe("video/mp4");
    expect(partnerVideo?.fullType).toBe("video/mp4");
    expect(retailVideo?.previewSrc).toBe("/assets/videos/jimeng/retail-pharmacy-promotion-15s.mp4");
    expect(retailVideo?.fullSrc).toBe("/assets/videos/jimeng/retail-pharmacy-promotion-15s.mp4");
    expect(retailVideo?.poster).toBe("/assets/posters/jimeng/retail-pharmacy-promotion-15s.jpg");
    expect(retailVideo?.previewType).toBe("video/mp4");
    expect(retailVideo?.fullType).toBe("video/mp4");
    expect(videoHubItems.every((asset) => asset.previewType === "video/mp4")).toBe(true);
    expect(videoHubItems.every((asset) => asset.fullType === "video/mp4")).toBe(true);
  });

  it("keeps demo media under public asset roots instead of importing evidence paths", () => {
    const roots = Object.values(demoAssetRoots);
    const allAssets = [
      demoAssets.aiPharmacyAssistantAvatar,
      demoAssets.approvedVitaKioskReference,
      demoAssets.vitakioskTabletModel,
      demoAssets.vitakioskKioskModel,
      ...demoAssets.vitaflow.orbitScreenshots,
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

  it("selects manual payment by default and keeps live providers disabled", async () => {
    const manual = createPaymentProvider();
    await expect(
      manual.createCheckoutSession({
        mode: "deposit",
        itemId: "vitakiosk-local-edition",
        customerEmail: "demo@example.com",
        customerName: "Demo",
      }),
    ).resolves.toMatchObject({ provider: "manual", status: "manual_payment_pending" });

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
