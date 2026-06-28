import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Mail,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { InteractiveVitaKioskMiniApp } from "./components/InteractiveVitaKioskMiniApp";
import { demoProduct } from "./content/interactiveDemoStates";
import { ShowcaseScene, showcaseScenes } from "./content/showcaseScenes";
import {
  businessLines,
  ctas,
  formTypes,
  navLinks,
  safetyDisclaimers,
  solutionCards,
} from "./content/siteContent";
import { videoHubItems } from "./content/videoHub";
import {
  categoryLabels,
  getPricingByCategory,
  PricingCategory,
  pricingItems,
} from "./content/pricing";
import {
  defaultFormValues,
  SiteFormKind,
  SiteFormValues,
  validateSiteForm,
} from "./lib/forms";
import { createMockCheckout, submitSiteForm } from "./lib/siteApi";

const routeTitles: Record<string, string> = {
  "/showcase": "Immersive Showcase",
  "/solutions": "Solutions",
  "/vitaflow": "VitaFlow ERP",
  "/vitakiosk": "VitaKiosk AI Kiosk",
  "/clinic-pharmacy-partners": "Clinic & Pharmacy Partners",
  "/ai-website-studio": "AI Website Studio",
  "/ai-academy": "AI Academy / AI Lessons",
  "/pricing": "Pricing Framework",
  "/order": "Order",
  "/book": "Book Demo",
  "/contact": "Contact",
  "/about": "About VitaKiosk Asia",
  "/checkout/success": "Mock Checkout Success",
  "/checkout/cancel": "Mock Checkout Cancelled",
  "/legal/disclaimer": "Disclaimer",
  "/legal/privacy": "Privacy",
  "/legal/terms": "Terms",
};

type RouteVisualKind = "showcase" | "solutions" | "vitaflow" | "vitakiosk" | "studio" | "academy" | "commerce" | "contact";

const routeExperiences: Partial<Record<string, {
  label: string;
  title: string;
  copy: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  secondaryHref: string;
  visual: RouteVisualKind;
  pulses: string[];
}>> = {
  "/showcase": {
    label: "Spatial product lab",
    title: "Move through the systems in action.",
    copy: "Kiosk, ERP, websites, training, and partner flows staged as one connected operating environment.",
    primaryCta: "Try kiosk demo",
    primaryHref: "#interactive-demo",
    secondaryCta: "View pricing",
    secondaryHref: "/pricing",
    visual: "showcase",
    pulses: ["iPad mode", "Large kiosk", "ERP board", "AI website", "AI lessons"],
  },
  "/solutions": {
    label: "Operating scenes",
    title: "AI support for queues, shelves, campaigns, and growth.",
    copy: "Retail pharmacy, clinic-linked pharmacy, partner campaign, and SME growth flows stay connected to safe data rules.",
    primaryCta: "Book a walkthrough",
    primaryHref: "/book",
    secondaryCta: "Contact sales",
    secondaryHref: "/contact",
    visual: "solutions",
    pulses: ["Queue support", "Shelf guidance", "Campaign review", "Lead capture"],
  },
  "/vitaflow": {
    label: "Source of truth",
    title: "VitaFlow keeps facts grounded.",
    copy: "Inventory, price, branch, shelf, promotion, purchase, reports, and analytics remain the trusted operational layer.",
    primaryCta: "Start ERP inquiry",
    primaryHref: "/order",
    secondaryCta: "See kiosk link",
    secondaryHref: "/vitakiosk",
    visual: "vitaflow",
    pulses: ["Stock movement", "Branch data", "Price monitor", "Reports"],
  },
  "/vitakiosk": {
    label: "Interactive kiosk",
    title: "Product education before the counter.",
    copy: "A simulated public demo with voice, fuzzy match, product sheet, shelf route, scan, promotion, and staff handoff.",
    primaryCta: "Click the demo",
    primaryHref: "#interactive-demo",
    secondaryCta: "Order framework",
    secondaryHref: "/order",
    visual: "vitakiosk",
    pulses: ["Voice", "Scan", "Shelf A-03", "Staff handoff"],
  },
  "/clinic-pharmacy-partners": {
    label: "Clinic / pharmacy corridor",
    title: "Connect product interest to partner discovery.",
    copy: "General product education, QR direction, participating pharmacy guidance, and staff escalation without endorsement claims.",
    primaryCta: "Request partner flow",
    primaryHref: "/contact",
    secondaryCta: "View kiosk demo",
    secondaryHref: "/vitakiosk",
    visual: "solutions",
    pulses: ["Clinic queue", "Product education", "QR route", "Pharmacist handoff"],
  },
  "/ai-website-studio": {
    label: "AI Website Studio",
    title: "Websites that explain, capture, and convert.",
    copy: "Launch premium websites with chatbot readiness, booking/contact flow, domain setup, lead capture, and maintenance.",
    primaryCta: "Start website project",
    primaryHref: "/contact",
    secondaryCta: "Mock checkout",
    secondaryHref: "/pricing",
    visual: "studio",
    pulses: ["Landing", "Chatbot", "Booking", "Lead dashboard"],
  },
  "/ai-academy": {
    label: "AI Academy",
    title: "Learn AI as a practical workflow.",
    copy: "Codex, prompts, automation, content/video, websites, and pharmacy AI operations taught as hands-on business systems.",
    primaryCta: "Book AI lesson",
    primaryHref: "/book",
    secondaryCta: "View packages",
    secondaryHref: "/pricing",
    visual: "academy",
    pulses: ["Prompt flow", "Codex build", "Automation", "Content calendar"],
  },
  "/pricing": {
    label: "Mock commerce",
    title: "Choose a path without live payment.",
    copy: "Subscriptions, kiosk orders, lesson bookings, and website deposits stay provider-neutral until payment review.",
    primaryCta: "Open console",
    primaryHref: "#pricing",
    secondaryCta: "Contact sales",
    secondaryHref: "/contact",
    visual: "commerce",
    pulses: ["Mock", "Stripe skeleton", "Billplz skeleton", "Manual transfer"],
  },
  "/order": {
    label: "Order console",
    title: "Quote, deposit, schedule, install.",
    copy: "VitaFlow subscriptions, kiosk deployments, lessons, and website projects start with safe mock records.",
    primaryCta: "Start order",
    primaryHref: "#contact",
    secondaryCta: "View pricing",
    secondaryHref: "/pricing",
    visual: "commerce",
    pulses: ["Quote", "Deposit", "Schedule", "Review"],
  },
  "/book": {
    label: "Book a walkthrough",
    title: "Pick the first deployment path.",
    copy: "Use the mock form to request a demo, lesson, website project, ERP subscription, or kiosk order.",
    primaryCta: "Open form",
    primaryHref: "#contact",
    secondaryCta: "Explore showcase",
    secondaryHref: "/showcase",
    visual: "contact",
    pulses: ["Demo", "Lesson", "Website", "Kiosk"],
  },
  "/contact": {
    label: "Contact sales",
    title: "Tell us what you want to launch.",
    copy: "The form creates a mock local record and keeps payments, customer data, and provider calls disabled.",
    primaryCta: "Open form",
    primaryHref: "#contact",
    secondaryCta: "Book demo",
    secondaryHref: "/book",
    visual: "contact",
    pulses: ["Lead", "Partner", "Project", "Training"],
  },
  "/about": {
    label: "VitaKiosk Labs",
    title: "AI systems and experience lab.",
    copy: "We design practical AI systems, websites, and training for pharmacies, clinics, and modern businesses.",
    primaryCta: "Explore solutions",
    primaryHref: "/solutions",
    secondaryCta: "Contact sales",
    secondaryHref: "/contact",
    visual: "showcase",
    pulses: ["Systems", "Experience", "Training", "Growth"],
  },
};

function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return progress;
}

function resolveRoute(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return window.location.pathname;
}

function SmartLink({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <a href={href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <SmartLink href="/" className="brand-lockup">
        <span className="brand-mark">V</span>
        <span>
          <strong>VitaKiosk Asia</strong>
          <small>VitaKiosk Labs | AI Systems & Experience Lab</small>
        </span>
      </SmartLink>
      <button className="icon-button mobile-only" onClick={() => setOpen(!open)}>
        {open ? <X size={18} /> : <Menu size={18} />}
        <span className="sr-only">Toggle navigation</span>
      </button>
      <nav className={open ? "nav-links is-open" : "nav-links"} aria-label="Main">
        {navLinks.map((link) => (
          <SmartLink key={link.href} href={link.href}>
            {link.label}
          </SmartLink>
        ))}
      </nav>
      <div className="header-actions">
        <SmartLink href="/book" className="button compact primary">
          <CalendarCheck size={16} />
          Book Demo
        </SmartLink>
        <SmartLink href="/contact" className="button compact secondary">
          Contact Sales
        </SmartLink>
      </div>
    </header>
  );
}

function GlobalStageBackground({ progress }: { progress: number }) {
  return (
    <div className="global-stage-background" aria-hidden="true">
      <span className="stage-beam beam-one" style={{ "--beam-offset": progress } as React.CSSProperties} />
      <span className="stage-beam beam-two" style={{ "--beam-offset": 1 - progress } as React.CSSProperties} />
      <span className="stage-noise" />
    </div>
  );
}

function GlobalGlowBackdrop({ progress }: { progress: number }) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const activeRipplesRef = useRef<HTMLSpanElement[]>([]);
  const rippleTimersRef = useRef<number[]>([]);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
    layerRef.current?.style.setProperty("--glow-depth", progress.toFixed(3));
  }, [progress]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) {
      return;
    }

    layer.dataset.effect = "pointer-glow-ripple";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lowPerformance =
      (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4) ||
      ("deviceMemory" in navigator && Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) <= 4);
    const maxRipples = lowPerformance ? 12 : 16;
    const moveRippleThrottleMs = lowPerformance ? 180 : 150;
    layer.dataset.performance = lowPerformance ? "low" : "standard";
    layer.dataset.maxRipples = String(maxRipples);
    layer.dataset.rippleThrottleMs = String(moveRippleThrottleMs);
    layer.style.setProperty("--glow-depth", progressRef.current.toFixed(3));
    if (reducedMotion.matches) {
      layer.dataset.reducedMotion = "true";
      return;
    }

    let frame = 0;
    let paused = document.visibilityState === "hidden";
    let lastMoveRipple = 0;
    const pendingPointer = { x: 0.5, y: 0.42, intensity: 0.18, dirty: false };
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const removeRipple = (ripple: HTMLSpanElement) => {
      ripple.remove();
      activeRipplesRef.current = activeRipplesRef.current.filter((item) => item !== ripple);
    };

    const registerTimer = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        rippleTimersRef.current = rippleTimersRef.current.filter((item) => item !== timer);
        callback();
      }, delay);
      rippleTimersRef.current.push(timer);
    };

    const addRipple = (clientX: number, clientY: number, kind: "move" | "splash" | "splash-secondary") => {
      while (activeRipplesRef.current.length >= maxRipples) {
        removeRipple(activeRipplesRef.current[0]);
      }
      const ripple = document.createElement("span");
      ripple.className = `global-ripple is-${kind}`;
      ripple.style.setProperty("--ripple-x", `${clientX.toFixed(1)}px`);
      ripple.style.setProperty("--ripple-y", `${clientY.toFixed(1)}px`);
      ripple.style.setProperty("--ripple-size", kind === "move" ? (lowPerformance ? "72px" : "82px") : "164px");
      ripple.style.setProperty("--ripple-opacity", kind === "move" ? (lowPerformance ? "0.11" : "0.14") : "0.2");
      ripple.addEventListener("animationend", () => removeRipple(ripple), { once: true });
      registerTimer(() => {
        if (ripple.isConnected) {
          removeRipple(ripple);
        }
      }, kind === "move" ? 2100 : 2500);
      activeRipplesRef.current.push(ripple);
      layer.appendChild(ripple);
    };

    const flushPointer = () => {
      frame = 0;
      if (!pendingPointer.dirty || paused) {
        return;
      }
      pendingPointer.dirty = false;
      layer.style.setProperty("--glow-x", `${(pendingPointer.x * 100).toFixed(2)}%`);
      layer.style.setProperty("--glow-y", `${(pendingPointer.y * 100).toFixed(2)}%`);
      layer.style.setProperty("--glow-inverse-x", `${((1 - pendingPointer.x) * 100).toFixed(2)}%`);
      layer.style.setProperty("--glow-secondary-y", `${((0.32 + pendingPointer.y * 0.36) * 100).toFixed(2)}%`);
      layer.style.setProperty("--glow-intensity", pendingPointer.intensity.toFixed(4));
    };

    const getEventPoint = (event: PointerEvent) => {
      const fallbackX = pendingPointer.x * Math.max(window.innerWidth, 1);
      const fallbackY = pendingPointer.y * Math.max(window.innerHeight, 1);
      return {
        clientX: Number.isFinite(event.clientX) ? event.clientX : fallbackX,
        clientY: Number.isFinite(event.clientY) ? event.clientY : fallbackY,
      };
    };

    const queuePointer = (clientX: number, clientY: number, strength = 1) => {
      if (paused) {
        return;
      }
      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      const nextX = clamp(clientX / width, 0, 1);
      const nextY = clamp(clientY / height, 0, 1);
      const speed = Math.hypot(nextX - pendingPointer.x, nextY - pendingPointer.y);
      pendingPointer.x = nextX;
      pendingPointer.y = nextY;
      pendingPointer.intensity = clamp(0.11 + speed * 2.4 * strength, 0.11, lowPerformance ? 0.23 : 0.3);
      pendingPointer.dirty = true;
      document.documentElement.style.setProperty("--pointer-x", pendingPointer.x.toFixed(4));
      document.documentElement.style.setProperty("--pointer-y", pendingPointer.y.toFixed(4));
      if (frame === 0) {
        frame = window.requestAnimationFrame(flushPointer);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const { clientX, clientY } = getEventPoint(event);
      queuePointer(clientX, clientY, event.pointerType === "touch" ? 0.75 : 1);
      const now = performance.now();
      if (now - lastMoveRipple >= moveRippleThrottleMs) {
        lastMoveRipple = now;
        addRipple(clientX, clientY, "move");
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const { clientX, clientY } = getEventPoint(event);
      queuePointer(clientX, clientY, event.pointerType === "touch" ? 0.75 : 1);
      addRipple(clientX, clientY, "splash");
      if (!lowPerformance) {
        registerTimer(() => addRipple(clientX, clientY, "splash-secondary"), 80);
      }
    };
    const onVisibilityChange = () => {
      paused = document.visibilityState === "hidden";
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      rippleTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      rippleTimersRef.current = [];
      activeRipplesRef.current.forEach((ripple) => ripple.remove());
      activeRipplesRef.current = [];
    };
  }, []);

  return <div ref={layerRef} className="global-glow-backdrop" data-testid="global-glow-backdrop" aria-hidden="true" />;
}

function OrbitRibbon() {
  return (
    <div className="business-orbit" aria-label="VitaKiosk Asia business lines">
      <svg className="connection-map" viewBox="0 0 1000 220" role="img" aria-label="Animated light path connecting the four business lines">
        <path d="M80 150 C220 50 360 210 500 110 C640 15 770 185 925 85" />
      </svg>
      {businessLines.map((line, index) => (
        <SmartLink
          key={line.id}
          href={line.href}
          className={`orbit-node orbit-${index + 1}`}
        >
          <line.Icon size={20} />
          <span>{line.title}</span>
          <small>{line.phrase}</small>
        </SmartLink>
      ))}
    </div>
  );
}

function HeroPrologueScene({ progress }: { progress: number }) {
  const heroShift = Math.round(progress * 180);
  return (
    <section className="hero-scene" style={{ "--scroll-shift": `${heroShift}px` } as React.CSSProperties}>
      <div className="hero-lab" aria-hidden="true">
        <div className="lab-grid" />
        <div className="light-path path-a" />
        <div className="light-path path-b" />
        <div className="hero-device hero-device-code">
          <div className="hero-device-panel avatar-mini" />
          <div className="hero-device-panel product-mini" />
          <div className="hero-device-panel map-mini" />
          <div className="hero-device-panel promo-mini" />
          <div className="device-glass" />
        </div>
        <div className="floating-panel panel-top">
          <span>Mock mode</span>
          <strong>No customer data</strong>
        </div>
        <div className="floating-panel panel-right">
          <span>Source</span>
          <strong>VitaFlow-ready</strong>
        </div>
      </div>
      <div className="hero-copy">
        <h1>Build smarter pharmacies, clinics, and AI-powered businesses.</h1>
        <p>
          From ERP to AI kiosks, AI websites, and training - we design practical
          AI systems that improve operations, customer experience, and digital
          growth.
        </p>
        <div className="hero-actions" aria-label="Primary actions">
          {ctas.map((cta) => (
            <SmartLink
              key={cta.href}
              href={cta.href}
              className={`button ${cta.variant}`}
            >
              {cta.label}
              <ArrowRight size={17} />
            </SmartLink>
          ))}
        </div>
      </div>
      <OrbitRibbon />
      <div className="scroll-cue">
        <span />
        Scroll into the lab
      </div>
    </section>
  );
}

function useScrollSceneController(sceneCount: number) {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compactViewport = window.matchMedia("(max-width: 980px)").matches;
    const root = document.querySelector<HTMLElement>(".authored-journey");
    if (!root || reduceMotion || compactViewport) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    let lastIndex = 0;
    let lastProgress = 0;
    const labels = Array.from({ length: sceneCount }, (_, index) => index / Math.max(sceneCount - 1, 1));
    const updateIndex = (progress: number, direction: number) => {
      const raw = progress * Math.max(sceneCount - 1, 1);
      const rounded = Math.min(sceneCount - 1, Math.max(0, Math.round(raw)));
      const next = direction >= 0 ? Math.max(lastIndex, rounded) : Math.min(lastIndex, rounded);
      if (next !== lastIndex) {
        lastIndex = next;
        setActiveSceneIndex(next);
      }
      root.style.setProperty("--journey-progress", progress.toFixed(4));
    };

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: () => `+=${Math.max(sceneCount - 1, 1) * window.innerHeight * 0.76}`,
      pin: true,
      anticipatePin: 1,
      scrub: 0.48,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const direction = self.direction || (self.progress >= lastProgress ? 1 : -1);
        lastProgress = self.progress;
        updateIndex(self.progress, direction);
      },
      snap: {
        snapTo: (value) =>
          labels.reduce((closest, label) => (Math.abs(label - value) < Math.abs(closest - value) ? label : closest), labels[0]),
        duration: { min: 0.12, max: 0.28 },
        delay: 0.02,
        ease: "power2.out",
      },
    });

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const images = Array.from(root.querySelectorAll("img"));
    images.forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", refresh, { once: true });
      }
    });

    return () => {
      images.forEach((image) => image.removeEventListener("load", refresh));
      window.removeEventListener("load", refresh);
      trigger.kill();
    };
  }, [sceneCount]);

  return activeSceneIndex;
}

function ScrollSceneController({
  sceneCount,
  children,
}: {
  sceneCount: number;
  children: (activeSceneIndex: number) => React.ReactNode;
}) {
  const activeSceneIndex = useScrollSceneController(sceneCount);
  return <>{children(activeSceneIndex)}</>;
}

function AbstractDeviceVisual({ scene }: { scene: ShowcaseScene }) {
  return (
    <div className={`abstract-device-visual accent-${scene.accent} visual-${scene.visual}`} aria-hidden="true">
      <div className="device-orbit-rings" />
      <div className="device-core">
        <span />
        <span />
        <span />
      </div>
      <div className="device-side-panel side-a" />
      <div className="device-side-panel side-b" />
      {scene.media && <img src={scene.media} alt="" loading="lazy" />}
    </div>
  );
}

function SystemShowcaseStage({ activeSceneIndex }: { activeSceneIndex?: number }) {
  const [localIndex, setLocalIndex] = useState(0);
  const activeIndex = activeSceneIndex ?? localIndex;
  const activeScene = showcaseScenes[activeIndex % showcaseScenes.length];

  return (
    <section className="system-showcase-stage" id="showcase" aria-label="VitaKiosk Asia system showcase">
      <div className="scene-copy">
        <span>{activeScene.eyebrow}</span>
        <h2>{activeScene.title}</h2>
        <p>{activeScene.copy}</p>
        <SmartLink href={activeScene.href} className="button primary">
          {activeScene.cta}
          <ArrowRight size={16} />
        </SmartLink>
      </div>
      <div className="system-orbit-stage">
        <AbstractDeviceVisual scene={activeScene} />
        <div className="showcase-orbit-controls" aria-label="Showcase scenes">
          {showcaseScenes.map((scene, index) => (
            <button
              key={scene.id}
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => setLocalIndex(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {scene.shortTitle}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection() {
  return <SystemShowcaseStage />;
}

function VitaKioskDemoStage() {
  return (
    <section className="vitakiosk-demo-stage immersive-scene">
      <div className="scene-copy">
        <span>Interactive public demo</span>
        <h2>Click inside the kiosk. It responds.</h2>
        <p>Tap voice, product, shelf, promotion, scan, fuzzy match, or staff handoff. No backend, mic, or camera required.</p>
        <SmartLink href="http://127.0.0.1:5175" className="demo-dev-link" ariaLabel="Open live local demo if running">
          Open live local demo, if running
          <ExternalLink size={16} />
        </SmartLink>
      </div>
      <InteractiveVitaKioskMiniApp />
    </section>
  );
}

function VitaFlowSourceScene() {
  return (
    <section className="vitaflow-source-scene immersive-scene" id="vitaflow-source">
      <div className="scene-copy">
        <span>VitaFlow ERP</span>
        <h2>The source of truth stays behind every answer.</h2>
        <p>Stock, shelf, price, promotion, and branch facts come from approved data only.</p>
        <SmartLink href="/vitaflow" className="button primary">
          View ERP layer
          <ArrowRight size={16} />
        </SmartLink>
      </div>
      <div className="erp-hologram">
        <div className="erp-core-board">
          <span>Product</span>
          <strong>{demoProduct.name}</strong>
          <small>{demoProduct.sku}</small>
          <b>{`$${demoProduct.price.toFixed(2)}`}</b>
        </div>
        {["Stock 18", "Shelf A-03", "Branch SG-001", "Promotion reviewed"].map((label, index) => (
          <div key={label} className={`erp-node node-${index + 1}`}>{label}</div>
        ))}
        <div className="erp-light-path" />
      </div>
    </section>
  );
}

function AISplitScene() {
  return (
    <section className="ai-split-scene immersive-scene">
      <div className="scene-copy">
        <span>Growth + capability</span>
        <h2>Websites capture demand. Lessons teach the workflow.</h2>
        <p>AI Website Studio and AI Academy turn the same operating logic into growth and team capability.</p>
      </div>
      <div className="ai-split-stage">
        <article>
          <span>AI Website Studio</span>
          <h3>Explain, capture, book.</h3>
          <SmartLink href="/ai-website-studio">Start Website Project <ArrowRight size={14} /></SmartLink>
        </article>
        <article>
          <span>AI Academy</span>
          <h3>Codex, prompts, automation.</h3>
          <SmartLink href="/ai-academy">Book AI Lesson <ArrowRight size={14} /></SmartLink>
        </article>
      </div>
    </section>
  );
}

function ImmersiveJourney() {
  const showcaseStepCount = showcaseScenes.length;
  const journeyStepCount = showcaseStepCount + 4;

  return (
    <ScrollSceneController sceneCount={journeyStepCount}>
      {(activeSceneIndex) => {
        const isShowcaseActive = activeSceneIndex < showcaseStepCount;
        const showcaseIndex = Math.min(activeSceneIndex, showcaseStepCount - 1);
        const demoIndex = showcaseStepCount;
        const erpIndex = demoIndex + 1;
        const partnerIndex = erpIndex + 1;
        const aiIndex = partnerIndex + 1;

        return (
          <section className="authored-journey" aria-label="VitaKiosk Asia immersive journey">
            <div className="journey-scene" data-active={isShowcaseActive}>
              <SystemShowcaseStage activeSceneIndex={showcaseIndex} />
            </div>
            <div className="journey-scene" data-active={activeSceneIndex === demoIndex}>
              <VitaKioskDemoStage />
            </div>
            <div className="journey-scene" data-active={activeSceneIndex === erpIndex}>
              <VitaFlowSourceScene />
            </div>
            <div className="journey-scene" data-active={activeSceneIndex === partnerIndex}>
              <ClinicPartnerCorridor />
            </div>
            <div className="journey-scene" data-active={activeSceneIndex === aiIndex}>
              <AISplitScene />
            </div>
          </section>
        );
      }}
    </ScrollSceneController>
  );
}

function BusinessLinesSection() {
  return (
    <section className="business-lines">
      {businessLines.map((line) => (
        <article key={line.id} className="line-panel">
          <line.Icon size={28} />
          <h2>{line.title}</h2>
          <strong>{line.phrase}</strong>
          <p>{line.copy}</p>
          <SmartLink href={line.href}>
            Explore <ChevronRight size={16} />
          </SmartLink>
        </article>
      ))}
    </section>
  );
}

function ClinicPartnerCorridor() {
  return (
    <section className="clinic-partner-corridor immersive-scene" id="clinic-pharmacy-partners">
      <div className="corridor-copy">
        <span>Clinic / pharmacy partner model</span>
        <h2>Product interest becomes guided discovery.</h2>
        <p>General education, QR direction, and staff escalation. No endorsement claims.</p>
      </div>
      <div className="corridor-stage" aria-label="Clinic to pharmacy partner flow">
        <div className="corridor-node clinic">
          <Stethoscope size={30} />
          <strong>Front desk pressure</strong>
          <small>One visitor needs product information.</small>
        </div>
        <div className="corridor-line" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="corridor-kiosk">
          <div className="mini-kiosk-surface" aria-hidden="true">
            <span />
            <strong>VK</strong>
            <small>Product education</small>
          </div>
          <strong>VitaKiosk guidance</strong>
          <small>Reviewed information and handoff.</small>
        </div>
        <div className="corridor-line" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="corridor-node pharmacy">
          <ShoppingBag size={30} />
          <strong>Partner pharmacy</strong>
          <small>Where-to-buy and campaign redemption.</small>
        </div>
      </div>
    </section>
  );
}

function VideoPreviewCard({
  video,
  logicalIndex,
  activeVideoIndex,
  orbitalProgress,
  total,
  hovered,
  dragging,
  compact,
  onHover,
  onOpen,
}: {
  video: (typeof videoHubItems)[number];
  logicalIndex: number;
  activeVideoIndex: number;
  orbitalProgress: number;
  total: number;
  hovered: boolean;
  dragging: boolean;
  compact: boolean;
  onHover: (id: string | null) => void;
  onOpen: (trigger: HTMLButtonElement | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const relative = (((logicalIndex - orbitalProgress + total / 2) % total) + total) % total - total / 2;
  const abs = Math.abs(relative);
  const isActive = logicalIndex === activeVideoIndex;
  const isVisible = compact ? abs <= 1.16 : abs <= 2.28;
  const isInteractive = (compact ? abs <= 0.64 : abs <= 1.34) && !dragging;
  const shouldLoad = isActive || hovered;
  const direction = relative === 0 ? 0 : relative > 0 ? 1 : -1;
  const positionAbs = Math.min(abs, compact ? 1.16 : 2.28);
  const sidePush = compact ? 0 : Math.max(0, positionAbs - 0.72) * 120;
  const x = compact
    ? direction * Math.pow(positionAbs, 0.92) * 185
    : direction * (Math.pow(positionAbs, 0.9) * 540 + sidePush);
  const z = compact ? 0 : 150 - positionAbs * 210;
  const scale = compact ? Math.max(0.72, 1 - positionAbs * 0.24) : Math.max(0.45, 1 - positionAbs * 0.36);
  const tiltAngle = compact ? direction * Math.min(12, positionAbs * 10) : direction * Math.min(54, positionAbs * 24);
  const opacity = isVisible ? (compact ? Math.max(0.34, 1 - positionAbs * 0.54) : Math.max(0.1, 1 - positionAbs * 0.34)) : 0;
  const orbitDistance = isActive ? "center" : abs <= (compact ? 1.16 : 1.44) ? "side" : abs <= 2.28 ? "far" : "hidden";

  useEffect(() => {
    const el = videoRef.current;
    if (!el) {
      return;
    }
    if (hovered) {
      try {
        const playResult = el.play();
        if (playResult && "catch" in playResult) {
          playResult.catch(() => undefined);
        }
      } catch {
        // Poster-only fallback covers browsers or test environments without media playback.
      }
    } else {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        // Keep the card stable when preview media is unavailable.
      }
    }
  }, [hovered]);

  return (
    <button
      className={`video-orbit-card ${isActive ? "is-active" : ""}`}
      aria-label={`${video.title} ${video.status}`}
      aria-hidden={!isInteractive}
      data-active={isActive}
      data-logical-index={logicalIndex}
      data-orbit-slot={video.id}
      data-orbit-relative={relative.toFixed(3)}
      data-orbit-distance={orbitDistance}
      data-visible={isVisible}
      onPointerEnter={() => !dragging && onHover(video.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(video.id)}
      onBlur={() => onHover(null)}
      onClick={(event) => {
        const isKeyboardClick = event.detail === 0;
        if (!isKeyboardClick) {
          event.currentTarget.blur();
        }
        onOpen(isKeyboardClick ? event.currentTarget : null);
      }}
      tabIndex={isInteractive ? 0 : -1}
      style={{
        "--orbit-angle": `${tiltAngle}deg`,
        "--orbit-x": `${x}px`,
        "--orbit-z": `${z}px`,
        "--orbit-scale": scale,
        "--orbit-opacity": opacity,
        "--orbit-index": Math.round((isActive ? 160 : 90) - abs * 20),
        pointerEvents: isInteractive ? "auto" : "none",
      } as React.CSSProperties}
    >
      <img src={video.poster} alt="" loading="lazy" />
      {shouldLoad && (
        <video ref={videoRef} muted playsInline preload="metadata" loop aria-hidden="true">
          <source src={video.previewSrc} type="video/webm" />
        </video>
      )}
      <span>{video.status}</span>
      <strong>{video.title}</strong>
      <small>{video.summary}</small>
    </button>
  );
}

function VideoViewerModal({
  video,
  onClose,
}: {
  video: (typeof videoHubItems)[number];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop video-viewer-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="video-viewer-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${video.title} full video viewer`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button" onClick={onClose}>
          <X size={18} />
          <span className="sr-only">Close video viewer</span>
        </button>
        <video controls autoPlay playsInline poster={video.poster}>
          <source src={video.fullSrc} type="video/webm" />
        </video>
        <div>
          <span>{video.label} / {video.status}</span>
          <h3>{video.title}</h3>
          <p>{video.summary}</p>
        </div>
      </div>
    </div>
  );
}

function SphericalVideoCarousel() {
  const initialVideoIndex = 3;
  const [orbitalProgress, setOrbitalProgress] = useState(initialVideoIndex);
  const [isCompactOrbit, setIsCompactOrbit] = useState(false);
  const [hoveredCardKey, setHoveredCardKey] = useState<string | null>(null);
  const [openVideo, setOpenVideo] = useState<(typeof videoHubItems)[number] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    startRotation: initialVideoIndex,
    moved: false,
  });
  const rotationRef = useRef(initialVideoIndex);
  const autoStateRef = useRef({
    isUserInteracting: false,
  });
  const pointerInsideRef = useRef(false);
  const wheelVelocityRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const suppressNextClick = useRef(false);
  const lastVideoTrigger = useRef<HTMLButtonElement | null>(null);
  const total = videoHubItems.length;
  const safeClientX = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
  const normalizeProgress = (value: number) => {
    const safe = Number.isFinite(value) ? value : initialVideoIndex;
    return ((safe % total) + total) % total;
  };
  const wrapIndex = (index: number) => {
    const safe = Number.isFinite(index) ? Math.round(index) : 0;
    return ((safe % total) + total) % total;
  };
  const activeVideoIndex = wrapIndex(orbitalProgress);
  const isModalOpen = Boolean(openVideo);
  const isUserInteracting =
    isHoveringCarousel || isTouching || isDragging || hasFocusWithin || hoveredCardKey !== null || isModalOpen;

  const setOrbitalProgressValue = (value: number) => {
    const next = normalizeProgress(value);
    rotationRef.current = next;
    setOrbitalProgress(next);
  };

  const pauseAuto = (delay = 2200) => {
    pauseUntilRef.current = performance.now() + delay;
  };

  useEffect(() => {
    const compactQuery = window.matchMedia("(max-width: 767px)");
    const updateCompactOrbit = () => setIsCompactOrbit(compactQuery.matches);
    updateCompactOrbit();
    compactQuery.addEventListener("change", updateCompactOrbit);
    return () => compactQuery.removeEventListener("change", updateCompactOrbit);
  }, []);

  useEffect(() => {
    autoStateRef.current.isUserInteracting = isUserInteracting;
  }, [isUserInteracting]);

  useEffect(() => {
    rotationRef.current = orbitalProgress;
  }, [orbitalProgress]);

  useEffect(() => {
    pointerInsideRef.current = isHoveringCarousel || isTouching;
  }, [isHoveringCarousel, isTouching]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      return;
    }

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(72, Math.max(0, now - last)) / 1000;
      last = now;
      const paused = autoStateRef.current.isUserInteracting || now < pauseUntilRef.current || document.visibilityState === "hidden";
      const wheelVelocity = wheelVelocityRef.current;
      const wheelDelta = Math.abs(wheelVelocity) > 0.0004 ? wheelVelocity * delta * 60 : 0;
      if (!paused) {
        setOrbitalProgressValue(rotationRef.current + delta * 0.11 + wheelDelta);
      } else if (wheelDelta) {
        setOrbitalProgressValue(rotationRef.current + wheelDelta);
      }
      if (Math.abs(wheelVelocity) > 0.0004) {
        wheelVelocityRef.current *= Math.pow(0.86, delta * 60);
      } else {
        wheelVelocityRef.current = 0;
      }
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (!pointerInsideRef.current || isModalOpen) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const rawDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;
      const clampedDelta = Math.max(-110, Math.min(110, rawDelta));
      wheelVelocityRef.current += clampedDelta * 0.00085;
      wheelVelocityRef.current = Math.max(-0.55, Math.min(0.55, wheelVelocityRef.current));
      pauseAuto(600);
    };

    shell.addEventListener("wheel", handleWheel, { passive: false });
    return () => shell.removeEventListener("wheel", handleWheel);
  }, [isModalOpen]);

  const snapToNearest = (value = rotationRef.current) => {
    setOrbitalProgressValue(Math.round(value));
  };

  const rotateBy = (delta: number) => {
    pauseAuto();
    snapToNearest(rotationRef.current + delta);
  };

  const openViewer = (video: (typeof videoHubItems)[number], trigger?: HTMLButtonElement | null) => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    pauseAuto(999999);
    lastVideoTrigger.current = trigger ?? null;
    setOpenVideo(video);
  };

  const closeViewer = () => {
    setOpenVideo(null);
    pauseAuto();
    window.setTimeout(() => lastVideoTrigger.current?.focus(), 0);
  };

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotateBy(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotateBy(-1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      openViewer(videoHubItems[activeVideoIndex], document.activeElement as HTMLButtonElement | null);
    }
  }

  const endDrag = (target: HTMLElement | null) => {
    const drag = dragRef.current;
    if (drag.pointerId === -1) {
      return;
    }
    const didMove = drag.moved || Math.abs(drag.startX - drag.lastX) > 8;
    const projected = rotationRef.current - (drag.velocity * 55) / 190;
    if (didMove) {
      suppressNextClick.current = true;
      window.setTimeout(() => {
        suppressNextClick.current = false;
      }, 80);
    }
    if (target && typeof target.releasePointerCapture === "function") {
      try {
        if (typeof target.hasPointerCapture !== "function" || target.hasPointerCapture(drag.pointerId)) {
          target.releasePointerCapture(drag.pointerId);
        }
      } catch {
        // Some browsers release capture automatically on pointerup.
      }
    }
    if (didMove) {
      snapToNearest(projected);
      if (target?.contains(document.activeElement)) {
        (document.activeElement as HTMLElement | null)?.blur();
      }
    }
    pauseAuto();
    dragRef.current = {
      pointerId: -1,
      startX: 0,
      lastX: 0,
      lastTime: 0,
      velocity: 0,
      startRotation: rotationRef.current,
      moved: false,
    };
    setIsDragging(false);
    setHoveredCardKey(null);
    target?.classList.remove("is-dragging");
  };

  return (
    <section className="video-hub spherical-video-scene" id="video" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="section-heading">
        <span>Video-first content</span>
        <h2>Drag the media orbit through the product films.</h2>
      </div>
      <div
        ref={shellRef}
        className="video-orbit-shell"
        aria-label="Spherical video carousel"
        data-auto-rotate="true"
        data-dragging={isDragging}
        data-paused={isUserInteracting}
        data-hovering={isHoveringCarousel}
        data-touching={isTouching}
        data-focused={hasFocusWithin}
        data-modal-open={isModalOpen}
        data-layout-mode={isCompactOrbit ? "compact-deck" : "cylindrical-orbit"}
        data-hovered-video={hoveredCardKey ?? ""}
        data-orbital-progress={orbitalProgress.toFixed(3)}
        data-render-buffer={videoHubItems.length}
        onPointerEnter={() => {
          setIsHoveringCarousel(true);
          pauseAuto();
        }}
        onPointerLeave={() => {
          pointerInsideRef.current = false;
          setIsHoveringCarousel(false);
          setHoveredCardKey(null);
          if (!isDragging && !isModalOpen) {
            pauseAuto(0);
          }
        }}
        onFocusCapture={() => {
          setHasFocusWithin(true);
          pauseAuto(2400);
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setHasFocusWithin(false);
            pauseAuto(2400);
          }
        }}
        onPointerDown={(event) => {
          if (typeof event.button === "number" && event.button !== 0) {
            return;
          }
          pointerInsideRef.current = true;
          pauseAuto();
          if (event.pointerType !== "mouse") {
            setIsTouching(true);
          }
          const pointerId = event.pointerId || 1;
          const clientX = safeClientX(event.clientX);
          const now = performance.now();
          dragRef.current = {
            pointerId,
            startX: clientX,
            lastX: clientX,
            lastTime: now,
            velocity: 0,
            startRotation: rotationRef.current,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const pointerId = event.pointerId || drag.pointerId;
          if (drag.pointerId !== pointerId) {
            return;
          }
          const clientX = safeClientX(event.clientX, drag.lastX);
          const now = performance.now();
          const dt = Math.max(now - drag.lastTime, 16);
          const dx = clientX - drag.lastX;
          const totalDelta = clientX - drag.startX;
          drag.velocity = Math.max(-2.4, Math.min(2.4, dx / dt));
          drag.lastX = clientX;
          drag.lastTime = now;
          drag.moved = Math.abs(totalDelta) > 5;
          setOrbitalProgressValue(drag.startRotation - totalDelta / 190);
          if (drag.moved && typeof event.currentTarget.setPointerCapture === "function") {
            try {
              event.currentTarget.setPointerCapture(pointerId);
            } catch {
              // Drag still works without pointer capture in constrained browser/test environments.
            }
          }
          if (drag.moved) {
            setIsDragging(true);
            event.currentTarget.classList.add("is-dragging");
          }
          if (drag.moved) {
            setHoveredCardKey(null);
          }
        }}
        onPointerUp={(event) => {
          endDrag(event.currentTarget);
          if (event.pointerType !== "mouse") {
            pointerInsideRef.current = false;
            setIsTouching(false);
            setIsHoveringCarousel(false);
            setHoveredCardKey(null);
          }
        }}
        onPointerCancel={(event) => {
          endDrag(event.currentTarget);
          if (event.pointerType !== "mouse") {
            pointerInsideRef.current = false;
            setIsTouching(false);
            setIsHoveringCarousel(false);
            setHoveredCardKey(null);
          }
        }}
        onLostPointerCapture={(event) => {
          pointerInsideRef.current = false;
          setIsTouching(false);
          endDrag(event.currentTarget);
        }}
      >
        <div className="video-orbit" aria-live="polite">
          {videoHubItems.map((video, logicalIndex) => (
            <VideoPreviewCard
              key={video.id}
              video={video}
              logicalIndex={logicalIndex}
              activeVideoIndex={activeVideoIndex}
              orbitalProgress={orbitalProgress}
              total={total}
              hovered={hoveredCardKey === video.id}
              dragging={isDragging}
              compact={isCompactOrbit}
              onHover={(nextIndex) => {
                setHoveredCardKey(nextIndex);
                pauseAuto(nextIndex === null ? 1800 : 2600);
              }}
              onOpen={(trigger) => openViewer(video, trigger)}
            />
          ))}
        </div>
      </div>
      <div className="orbit-caption">
        <span>{videoHubItems[activeVideoIndex].status}</span>
        <strong data-testid="orbit-active-title">{videoHubItems[activeVideoIndex].title}</strong>
        <small>Drag or swipe to rotate. Hover previews silently. Click opens the viewer.</small>
      </div>
      {openVideo && <VideoViewerModal video={openVideo} onClose={closeViewer} />}
    </section>
  );
}

function VideoHub() {
  return <SphericalVideoCarousel />;
}

function PricingSection() {
  const categories = Object.keys(categoryLabels) as PricingCategory[];
  const [active, setActive] = useState<PricingCategory>("vitakiosk");
  const plans = getPricingByCategory(active);
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0].id);
  const selected = plans.find((plan) => plan.id === selectedPlanId) || plans[0];

  useEffect(() => {
    const nextPlans = getPricingByCategory(active);
    setSelectedPlanId(nextPlans[0].id);
  }, [active]);

  return (
    <section className="pricing-section commerce-console" id="pricing">
      <div className="section-heading">
        <span>Mock commerce framework</span>
        <h2>Choose a path. No live payment runs.</h2>
      </div>
      <div className="segment-control" role="tablist" aria-label="Pricing categories">
        {categories.map((category) => (
          <button
            key={category}
            role="tab"
            aria-selected={active === category}
            className={active === category ? "is-active" : ""}
            onClick={() => setActive(category)}
          >
            {categoryLabels[category]}
          </button>
        ))}
      </div>
      <div className="commerce-console-grid">
        <div className="commerce-plan-rail">
          {plans.map((item) => (
            <button
              key={item.id}
              className={item.id === selected.id ? "is-active" : ""}
              onClick={() => setSelectedPlanId(item.id)}
            >
              <span>{item.cadence}</span>
              <strong>{item.name}</strong>
              <small>{item.priceLabel}</small>
            </button>
          ))}
        </div>
        <article className="commerce-active-panel">
          <span>{categoryLabels[active]}</span>
          <h3>{selected.name}</h3>
          <strong>{selected.priceLabel}</strong>
          <ul>
            {selected.includes.slice(0, 3).map((entry) => (
              <li key={entry}>
                <CheckCircle2 size={15} />
                {entry}
              </li>
            ))}
          </ul>
          {selected.safetyNote && <p className="safety-note">{selected.safetyNote}</p>}
          <SmartLink href="/order" className="button primary">
            Start mock flow
            <ArrowRight size={16} />
          </SmartLink>
        </article>
        <div className="commerce-orbit-meter" aria-hidden="true">
          <CreditCard size={34} />
          <span>Mock provider</span>
          <small>No card storage</small>
        </div>
      </div>
    </section>
  );
}

function CommerceConsole() {
  return <PricingSection />;
}

function LeadConsole({ initialKind = "lead" }: { initialKind?: SiteFormKind }) {
  const [values, setValues] = useState<SiteFormValues>({
    ...defaultFormValues,
    kind: initialKind,
  });
  const [errors, setErrors] = useState<ReturnType<typeof validateSiteForm>["errors"]>({});
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "checkout" | "error">("idle");
  const [message, setMessage] = useState("");

  const selectedType = formTypes.find((type) => type.id === values.kind);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateSiteForm(values);
    setErrors(result.errors);
    if (!result.valid) {
      setStatus("error");
      setMessage("Check the highlighted fields before sending.");
      return;
    }
    setStatus("saving");
    try {
      await submitSiteForm(values);
      setStatus("success");
      setMessage("Mock record created. We will reply with next steps.");
    } catch {
      setStatus("success");
      setMessage("Local mock confirmation shown. Backend API can store this when running on 8001.");
    }
  }

  async function handleCheckout() {
    const result = validateSiteForm(values);
    setErrors(result.errors);
    if (!result.valid) {
      setStatus("error");
      setMessage("Complete the contact fields before creating checkout.");
      return;
    }
    const item = pricingItems.find((candidate) => candidate.id === values.packageId) || pricingItems[0];
    try {
      const session = await createMockCheckout(
        item.id,
        values.email,
        values.fullName,
        item.checkoutMode,
      );
      setStatus("checkout");
      setMessage(session.message);
    } catch {
      setStatus("checkout");
      setMessage("Mock checkout preview created locally. No live payment was attempted.");
    }
  }

  return (
    <section className="lead-console" id="contact">
      <div className="lead-copy">
        <span>Order and booking console</span>
        <h2>Tell us what you want to launch.</h2>
        <p>
          Forms validate locally, create mock records through the site API when
          available, and can open a mock checkout session. No card data is
          stored and no live payment provider is enabled.
        </p>
        <div className="form-type-rail" aria-label="Form type">
          {formTypes.slice(0, 6).map((type) => (
            <button
              key={type.id}
              className={values.kind === type.id ? "is-active" : ""}
              onClick={() =>
                setValues((current) => ({
                  ...current,
                  kind: type.id as SiteFormKind,
                }))
              }
            >
              <type.Icon size={16} />
              {type.label}
            </button>
          ))}
        </div>
      </div>
      <form className="premium-form" onSubmit={handleSubmit} noValidate>
        <div className="form-header">
          {selectedType && <selectedType.Icon size={24} />}
          <div>
            <span>Selected flow</span>
            <strong>{selectedType?.label}</strong>
          </div>
        </div>
        <label>
          Full name
          <input
            value={values.fullName}
            onChange={(event) => setValues({ ...values, fullName: event.target.value })}
            aria-invalid={Boolean(errors.fullName)}
            placeholder="Your name"
          />
          {errors.fullName && <small>{errors.fullName}</small>}
        </label>
        <label>
          Email
          <input
            value={values.email}
            onChange={(event) => setValues({ ...values, email: event.target.value })}
            aria-invalid={Boolean(errors.email)}
            placeholder="name@business.com"
          />
          {errors.email && <small>{errors.email}</small>}
        </label>
        <label>
          Phone
          <input
            value={values.phone}
            onChange={(event) => setValues({ ...values, phone: event.target.value })}
            aria-invalid={Boolean(errors.phone)}
            placeholder="+60 12 345 6789"
          />
          {errors.phone && <small>{errors.phone}</small>}
        </label>
        <label>
          Business type
          <select
            value={values.businessType}
            onChange={(event) => setValues({ ...values, businessType: event.target.value })}
          >
            <option>Pharmacy</option>
            <option>Clinic</option>
            <option>SME</option>
            <option>Restaurant</option>
            <option>Education centre</option>
            <option>Retail</option>
            <option>Service business</option>
          </select>
        </label>
        <label>
          Package
          <select
            value={values.packageId}
            onChange={(event) => setValues({ ...values, packageId: event.target.value })}
          >
            {pricingItems.map((item) => (
              <option key={item.id} value={item.id}>
                {categoryLabels[item.category]} - {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Message
          <textarea
            value={values.message}
            onChange={(event) => setValues({ ...values, message: event.target.value })}
            aria-invalid={Boolean(errors.message)}
            placeholder="Tell us about your branch, clinic, campaign, website, lesson, or AI workflow."
          />
          {errors.message && <small>{errors.message}</small>}
        </label>
        <div className="form-actions">
          <button className="button primary" type="submit">
            <Mail size={17} />
            Send inquiry
          </button>
          <button className="button secondary" type="button" onClick={handleCheckout}>
            <CreditCard size={17} />
            Create mock checkout
          </button>
        </div>
        <output className={`form-status ${status}`} aria-live="polite">
          {message || "Ready. Mock provider only."}
        </output>
      </form>
    </section>
  );
}

function SafetyBand() {
  return (
    <section className="safety-band" id="disclaimer">
      <ShieldCheck size={34} />
      <div>
        <h2>Healthcare safety wording is part of the product.</h2>
        {safetyDisclaimers.map((copy) => (
          <p key={copy}>{copy}</p>
        ))}
      </div>
    </section>
  );
}

function BookingFinale() {
  return (
    <section className="booking-finale" id="book">
      <div className="booking-stage-copy">
        <span>Booking finale</span>
        <h2>Choose the first real-world deployment path.</h2>
        <p>
          Start with a demo, a pharmacy ERP subscription inquiry, a kiosk
          placement/order, an AI website project, or practical AI training.
          The local flow creates mock records only.
        </p>
        <div className="booking-paths" aria-label="Booking paths">
          <SmartLink href="/showcase">Showcase</SmartLink>
          <SmartLink href="/pricing">Pricing</SmartLink>
          <SmartLink href="/order">Order</SmartLink>
          <SmartLink href="/contact">Sales</SmartLink>
        </div>
      </div>
      <LeadConsole initialKind="lead" />
    </section>
  );
}

function LegalShelf() {
  return (
    <footer className="site-footer legal-shelf">
      <div className="brand-lockup">
        <span className="brand-mark">V</span>
        <span>
          <strong>VitaKiosk Asia</strong>
          <small>VitaKiosk Labs</small>
        </span>
      </div>
      <nav aria-label="Footer">
        {navLinks.map((link) => (
          <SmartLink key={link.href} href={link.href}>
            {link.label}
          </SmartLink>
        ))}
        <SmartLink href="/legal/disclaimer">Disclaimer</SmartLink>
        <SmartLink href="/legal/privacy">Privacy</SmartLink>
        <SmartLink href="/legal/terms">Terms</SmartLink>
      </nav>
      <p>Mock-first local site. No live payment, no real customer data.</p>
    </footer>
  );
}

function SolutionsBand() {
  return (
    <section className="solutions-band">
      {solutionCards.map((card) => (
        <article key={card.title}>
          <card.Icon size={26} />
          <h3>{card.title}</h3>
          <ul>
            {card.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

function RouteExperienceVisual({
  visual,
  pulses,
}: {
  visual: RouteVisualKind;
  pulses: string[];
}) {
  return (
    <div className={`route-experience-visual visual-${visual}`} aria-hidden="true">
      <div className="route-visual-orbit">
        {pulses.map((pulse, index) => (
          <span key={pulse} className={`route-pulse pulse-${index + 1}`}>
            {pulse}
          </span>
        ))}
      </div>
      {visual === "vitakiosk" ? (
        <div className="route-kiosk-device">
          <div className="route-kiosk-native-screen">
            <span className="route-kiosk-avatar" />
            <span className="route-kiosk-subtitle" />
            <span className="route-kiosk-product" />
            <span className="route-kiosk-map" />
            <span className="route-kiosk-promo" />
          </div>
          <span className="route-device-scan" />
        </div>
      ) : visual === "vitaflow" ? (
        <div className="route-erp-constellation">
          <strong>VitaFlow</strong>
          <span>Product</span>
          <span>Stock</span>
          <span>Price</span>
          <span>Shelf</span>
        </div>
      ) : visual === "studio" ? (
        <div className="route-browser-stack">
          <span />
          <strong>AI Website</strong>
          <small>Lead / booking / chatbot</small>
        </div>
      ) : visual === "academy" ? (
        <div className="route-learning-core">
          <strong>AI Academy</strong>
          <span>Prompt</span>
          <span>Codex</span>
          <span>Automation</span>
        </div>
      ) : visual === "commerce" ? (
        <div className="route-commerce-core">
          <CreditCard size={34} />
          <strong>Mock provider</strong>
          <small>No live charge</small>
        </div>
      ) : (
        <div className="route-lab-core">
          <Sparkles size={38} />
          <strong>VitaKiosk Asia</strong>
          <small>AI Systems & Experience Lab</small>
        </div>
      )}
    </div>
  );
}

function RouteExperienceHero({
  content,
}: {
  content: NonNullable<(typeof routeExperiences)[string]>;
}) {
  return (
    <section className="route-experience-hero">
      <div className="route-experience-copy">
        <span>{content.label}</span>
        <h1>{content.title}</h1>
        <p>{content.copy}</p>
        <div className="hero-actions">
          <SmartLink href={content.primaryHref} className="button primary">
            {content.primaryCta}
            <ArrowRight size={16} />
          </SmartLink>
          <SmartLink href={content.secondaryHref} className="button secondary">
            {content.secondaryCta}
          </SmartLink>
        </div>
      </div>
      <RouteExperienceVisual visual={content.visual} pulses={content.pulses} />
    </section>
  );
}

function RouteExperienceBody({ route, kind }: { route: string; kind: SiteFormKind }) {
  if (route === "/showcase") {
    return (
      <>
        <SystemShowcaseStage />
        <VitaKioskDemoStage />
        <VideoHub />
      </>
    );
  }

  if (route === "/solutions" || route === "/clinic-pharmacy-partners") {
    return (
      <>
        <ClinicPartnerCorridor />
        <VitaFlowSourceScene />
        <AISplitScene />
      </>
    );
  }

  if (route === "/vitaflow") {
    return (
      <>
        <VitaFlowSourceScene />
        <CommerceConsole />
        <LeadConsole initialKind={kind} />
      </>
    );
  }

  if (route === "/vitakiosk") {
    return (
      <>
        <VitaKioskDemoStage />
        <ClinicPartnerCorridor />
        <VideoHub />
        <LeadConsole initialKind={kind} />
      </>
    );
  }

  if (route === "/ai-website-studio" || route === "/ai-academy") {
    return (
      <>
        <AISplitScene />
        <CommerceConsole />
        <LeadConsole initialKind={kind} />
      </>
    );
  }

  if (route === "/pricing" || route === "/order") {
    return (
      <>
        <CommerceConsole />
        <LeadConsole initialKind={kind} />
      </>
    );
  }

  return <LeadConsole initialKind={kind} />;
}

function LegalPage({ title }: { title: string }) {
  return (
    <main className="page-shell route-page">
      <GlobalGlowBackdrop progress={0.2} />
      <GlobalStageBackground progress={0.2} />
      <Header />
      <section className="route-hero compact-route">
        <h1>{title}</h1>
        <p>
          VitaKiosk Asia uses mock-first product content on this local site. Real
          deployments must complete local healthcare advertising, privacy,
          security, payment, and institutional compliance review.
        </p>
      </section>
      <SafetyBand />
    </main>
  );
}

function RoutePage({ route }: { route: string }) {
  const title = routeTitles[route] || "VitaKiosk Asia";
  const kind = useMemo<SiteFormKind>(() => {
    if (route.includes("book") || route.includes("academy")) return "lesson";
    if (route.includes("website")) return "website";
    if (route.includes("vitaflow")) return "vitaflow";
    if (route.includes("partner")) return "partner";
    if (route.includes("order") || route.includes("vitakiosk")) return "vitakiosk";
    return "lead";
  }, [route]);

  if (route.startsWith("/legal")) {
    return <LegalPage title={title} />;
  }

  if (route === "/checkout/success" || route === "/checkout/cancel") {
    return (
      <main className="page-shell route-page">
        <GlobalGlowBackdrop progress={0.2} />
        <GlobalStageBackground progress={0.2} />
        <Header />
        <section className="route-hero checkout-state">
          {route === "/checkout/success" ? (
            <CheckCircle2 size={48} />
          ) : (
            <X size={48} />
          )}
          <h1>{title}</h1>
          <p>
            {route === "/checkout/success"
              ? "Mock checkout completed. No live payment was charged."
              : "Mock checkout cancelled. No payment record was captured."}
          </p>
          <SmartLink href="/pricing" className="button primary">
            Return to pricing
            <ArrowRight size={16} />
          </SmartLink>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell route-page">
      <GlobalGlowBackdrop progress={0.35} />
      <GlobalStageBackground progress={0.35} />
      <Header />
      <RouteExperienceHero content={routeExperiences[route] || routeExperiences["/about"]!} />
      <RouteExperienceBody route={route} kind={kind} />
      <SafetyBand />
      <LegalShelf />
    </main>
  );
}

function HomePage() {
  const progress = useScrollProgress();
  return (
    <main className="page-shell" style={{ "--page-progress": progress } as React.CSSProperties}>
      <GlobalGlowBackdrop progress={progress} />
      <GlobalStageBackground progress={progress} />
      <Header />
      <HeroPrologueScene progress={progress} />
      <ImmersiveJourney />
      <VideoHub />
      <CommerceConsole />
      <BookingFinale />
      <SafetyBand />
      <LegalShelf />
    </main>
  );
}

export function App() {
  const route = resolveRoute();
  if (route !== "/") {
    return <RoutePage route={route} />;
  }
  return <HomePage />;
}
