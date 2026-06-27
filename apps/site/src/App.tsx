import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ExternalLink,
  HandHeart,
  Languages,
  Mail,
  Menu,
  Mic,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { demoHotspots, demoProduct, demoTranscriptStates, DemoMode } from "./content/interactiveDemoStates";
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

function useJourneySceneController(sceneCount: number) {
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
    const updateIndex = (progress: number) => {
      const next = Math.min(sceneCount - 1, Math.max(0, Math.round(progress * (sceneCount - 1))));
      if (next !== lastIndex) {
        lastIndex = next;
        setActiveSceneIndex(next);
      }
      root.style.setProperty("--journey-progress", progress.toFixed(4));
    };

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: () => `+=${Math.max(sceneCount, 1) * window.innerHeight}`,
      pin: true,
      anticipatePin: 1,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: (self) => updateIndex(self.progress),
      snap: {
        snapTo: (value) => Math.round(value * (sceneCount - 1)) / (sceneCount - 1),
        duration: { min: 0.16, max: 0.38 },
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

function DemoHotspot({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button className={`demo-hotspot ${className}`} onClick={onClick}>
      <span>{label}</span>
    </button>
  );
}

function DemoTranscript({ mode }: { mode: DemoMode }) {
  const text =
    mode === "listening"
      ? demoTranscriptStates.listening
      : mode === "fuzzy"
        ? demoTranscriptStates.fuzzy
        : mode === "scan"
          ? demoTranscriptStates.scan
          : mode === "assist"
            ? demoTranscriptStates.assist
            : demoTranscriptStates.idle;

  return (
    <div className={`demo-transcript mode-${mode}`}>
      <span>AI subtitle</span>
      <strong>{text}</strong>
      <small>{mode === "listening" ? "Speaking animation active" : "Ready"}</small>
    </div>
  );
}

function DemoProductPanel({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="demo-product-panel" onClick={onOpen}>
      <span>Product summary</span>
      <strong>{demoProduct.name}</strong>
      <div className="demo-product-grid">
        {demoProduct.details.map(([label, value]) => (
          <small key={label}>
            <b>{label}</b>
            {value}
          </small>
        ))}
      </div>
    </button>
  );
}

function DemoPromotionLeaflet({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="demo-leaflet-stack" onClick={onOpen}>
      <article>
        <span>VitaKiosk</span>
        <strong>Relief Balm</strong>
        <small>Demo Offer</small>
      </article>
      <article>
        <span>VitaKiosk</span>
        <strong>Supplement</strong>
        <small>Savings Demo</small>
      </article>
    </button>
  );
}

function DemoShelfMap({ enlarged = false }: { enlarged?: boolean }) {
  return (
    <div className={enlarged ? "demo-shelf-map is-enlarged" : "demo-shelf-map"}>
      <span className="pharmacy-label">Pharmacy</span>
      <div className="aisle aisle-one">01</div>
      <div className="aisle aisle-two">02</div>
      <div className="aisle target">A-03</div>
      <div className="route-dot start" />
      <div className="route-path" />
      <div className="route-dot end" />
      <small>Route: Entrance &gt; Aisle 03 &gt; Shelf A-03</small>
    </div>
  );
}

function DemoScanProductOverlay({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="demo-overlay-content scan-overlay">
      <ScanLine size={32} />
      <h3>Packaging detected</h3>
      <p>Select the VitaFlow-backed candidate. No image guessing or medical advice.</p>
      <button className="button primary" onClick={onSelect}>
        Select Relief Balm
      </button>
    </div>
  );
}

function DemoPharmacistHandoff() {
  return (
    <div className="demo-overlay-content handoff-overlay">
      <HandHeart size={34} />
      <h3>A pharmacist or staff member can assist you.</h3>
      <p>Product education and guidance only. Not diagnosis, prescription consultation, or professional medical advice.</p>
    </div>
  );
}

function InteractiveVitaKioskDemo() {
  const [mode, setMode] = useState<DemoMode>("idle");
  const [sheetMode, setSheetMode] = useState<"summary" | "detail">("summary");

  useEffect(() => {
    if (mode !== "listening") {
      return;
    }
    const responseTimer = window.setTimeout(() => setMode("idle"), 2800);
    return () => window.clearTimeout(responseTimer);
  }, [mode]);

  const openMode = (next: DemoMode) => {
    setSheetMode("summary");
    setMode(next);
  };

  const closeOverlay = () => setMode("idle");

  return (
    <div className={`interactive-kiosk-demo mode-${mode}`} id="interactive-demo">
      <div className="demo-status-pill">Connected - Mock mode - No customer data</div>
      <DemoTranscript mode={mode} />
      <div className="demo-avatar-panel">
        <span>VitaKiosk Labs</span>
        <h3>AI Pharmacy Assistant</h3>
        <div className="avatar-hologram">
          <div className="avatar-core" />
          <div className="avatar-wave" />
        </div>
        <div className="voice-wave" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => <i key={index} />)}
        </div>
        <strong>{mode === "listening" ? "LISTENING" : "READY"}</strong>
      </div>
      <div className="demo-center-panel">
        <DemoProductPanel onOpen={() => openMode("product")} />
        <button className="demo-shelf-button" onClick={() => openMode("shelf")}>
          <DemoShelfMap />
        </button>
        <div className="demo-input-row">
          <button className="tap-to-speak" onClick={() => openMode("listening")}>
            <Mic size={23} />
            <span>Tap to Speak</span>
          </button>
          <button className="demo-chip" onClick={() => openMode("fuzzy")}>Relief Bomb</button>
          <button className="demo-chip" onClick={() => openMode("scan")}>
            <Camera size={16} />
            Scan Product
          </button>
        </div>
      </div>
      <div className="demo-right-rail">
        <DemoPromotionLeaflet onOpen={() => openMode("promotion")} />
        <div className="demo-provenance">
          <span>System provenance</span>
          <strong>VitaFlow ERP</strong>
          <small>Source: {demoProduct.source}</small>
          <small>Branch: {demoProduct.branch}</small>
          <small>Shelf: {demoProduct.shelf}</small>
        </div>
        <button className="demo-assist-panel" onClick={() => openMode("assist")}>
          <span>Clinical safety</span>
          <strong>Pharmacist assistance</strong>
          <small>In-store safety handoff only.</small>
        </button>
      </div>
      <div className="demo-language-rail">
        <Languages size={14} />
        <button>EN</button>
        <button>ZH</button>
        <button>BM</button>
      </div>
      {demoHotspots.map((hotspot) => (
        <DemoHotspot
          key={hotspot.id}
          label={hotspot.label}
          className={`hotspot-${hotspot.id}`}
          onClick={() => openMode(hotspot.mode)}
        />
      ))}
      {mode === "fuzzy" && (
        <div className="demo-state-bubble fuzzy-bubble">
          <span>Do you mean</span>
          <button onClick={() => setMode("idle")}>Relief Balm</button>
        </div>
      )}
      {mode !== "idle" && mode !== "listening" && mode !== "fuzzy" && (
        <div className="demo-cinematic-overlay" role="dialog" aria-modal="true" aria-label={`${mode} demo state`} onMouseDown={closeOverlay}>
          <div className={`demo-overlay-sheet state-${mode}`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button" onClick={closeOverlay}>
              <X size={18} />
              <span className="sr-only">Close demo state</span>
            </button>
            {mode === "promotion" && (
              <div className="demo-overlay-content promotion-overlay">
                <article className="enlarged-leaflet">
                  <span>VitaKiosk</span>
                  <strong>Relief Balm</strong>
                  <small>Demo Offer</small>
                  <p>Sponsored education must be labelled and reviewed before display.</p>
                </article>
              </div>
            )}
            {mode === "product" && (
              <button className="demo-overlay-content product-overlay" onClick={() => setSheetMode(sheetMode === "summary" ? "detail" : "summary")}>
                <span>{sheetMode === "summary" ? "Product summary" : "Product detail"}</span>
                <h3>{demoProduct.name}</h3>
                <p>{sheetMode === "summary" ? demoProduct.summary : "Menthol and camphor demo facts are fictional mock data from the marketing demo."}</p>
                <strong>{demoProduct.price}</strong>
                <small>Tap inside sheet to morph summary/detail.</small>
              </button>
            )}
            {mode === "shelf" && (
              <div className="demo-overlay-content shelf-overlay">
                <h3>Shelf navigation</h3>
                <DemoShelfMap enlarged />
              </div>
            )}
            {mode === "scan" && <DemoScanProductOverlay onSelect={() => setMode("idle")} />}
            {mode === "assist" && <DemoPharmacistHandoff />}
          </div>
        </div>
      )}
    </div>
  );
}

function VitaKioskDemoStage() {
  return (
    <section className="vitakiosk-demo-stage immersive-scene">
      <div className="scene-copy">
        <span>Interactive public demo</span>
        <h2>Click inside the kiosk. It responds.</h2>
        <p>Tap voice, product, shelf, promotion, scan, fuzzy match, or staff handoff. No backend, mic, or camera required.</p>
        <SmartLink href="http://127.0.0.1:5175" className="button secondary" ariaLabel="Open live local demo">
          Open Live Local Demo
          <ExternalLink size={16} />
        </SmartLink>
      </div>
      <InteractiveVitaKioskDemo />
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
          <b>{demoProduct.price}</b>
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
  const activeSceneIndex = useJourneySceneController(journeyStepCount);
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
  index,
  activeIndex,
  hovered,
  onHover,
  onOpen,
}: {
  video: (typeof videoHubItems)[number];
  index: number;
  activeIndex: number;
  hovered: boolean;
  onHover: (index: number | null) => void;
  onOpen: (trigger: HTMLButtonElement) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const total = videoHubItems.length;
  const raw = index - activeIndex;
  const relative = raw > total / 2 ? raw - total : raw < -total / 2 ? raw + total : raw;
  const abs = Math.abs(relative);
  const isActive = relative === 0;
  const isVisible = abs <= 3;
  const isInteractive = abs <= 2;
  const shouldLoad = isActive || hovered;

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
      onPointerEnter={() => onHover(index)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(index)}
      onBlur={() => onHover(null)}
      onClick={(event) => onOpen(event.currentTarget)}
      tabIndex={isInteractive ? 0 : -1}
      style={{
        "--orbit-angle": `${relative * 34}deg`,
        "--orbit-x": `${relative * 285}px`,
        "--orbit-z": `${440 - abs * 90}px`,
        "--orbit-scale": Math.max(0.54, 1 - abs * 0.16),
        "--orbit-opacity": isVisible ? Math.max(0.18, 1 - abs * 0.22) : 0,
        "--orbit-index": 20 - abs,
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
  const [activeIndex, setActiveIndex] = useState(3);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [openVideo, setOpenVideo] = useState<(typeof videoHubItems)[number] | null>(null);
  const dragStart = useRef<number | null>(null);
  const lastVideoTrigger = useRef<HTMLButtonElement | null>(null);
  const total = videoHubItems.length;
  const change = (delta: number) => setActiveIndex((current) => (current + delta + total) % total);

  const openViewer = (video: (typeof videoHubItems)[number], trigger?: HTMLButtonElement | null) => {
    lastVideoTrigger.current = trigger ?? null;
    setOpenVideo(video);
  };

  const closeViewer = () => {
    setOpenVideo(null);
    window.setTimeout(() => lastVideoTrigger.current?.focus(), 0);
  };

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      change(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      change(-1);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      openViewer(videoHubItems[activeIndex], document.activeElement as HTMLButtonElement | null);
    }
  }

  return (
    <section className="video-hub spherical-video-scene" id="video" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="section-heading">
        <span>Video-first content</span>
        <h2>A floating media orbit, not a scrolling row.</h2>
      </div>
      <div
        className="video-orbit-shell"
        aria-label="Spherical video carousel"
        onPointerDown={(event) => {
          dragStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (dragStart.current === null) {
            return;
          }
          const delta = event.clientX - dragStart.current;
          dragStart.current = null;
          if (Math.abs(delta) > 38) {
            change(delta < 0 ? 1 : -1);
          }
        }}
      >
        <button className="orbit-arrow left" onClick={() => change(-1)} aria-label="Previous video">
          <ArrowLeft size={20} />
        </button>
        <div className="video-orbit" aria-live="polite">
          {videoHubItems.map((video, index) => (
            <VideoPreviewCard
              key={video.id}
              video={video}
              index={index}
              activeIndex={activeIndex}
              hovered={hoveredIndex === index}
              onHover={setHoveredIndex}
              onOpen={(trigger) => openViewer(video, trigger)}
            />
          ))}
        </div>
        <button className="orbit-arrow right" onClick={() => change(1)} aria-label="Next video">
          <ArrowRight size={20} />
        </button>
      </div>
      <div className="orbit-caption">
        <span>{videoHubItems[activeIndex].status}</span>
        <strong>{videoHubItems[activeIndex].title}</strong>
        <small>Hover to preview silently. Click to open the viewer.</small>
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

function LegalPage({ title }: { title: string }) {
  return (
    <main className="page-shell route-page">
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
      <Header />
      <section className="route-hero">
        <Sparkles size={36} />
        <h1>{title}</h1>
        <p>
          Route-ready page for the VitaKiosk Asia flagship site. The page uses
          the same immersive system, central pricing config, demo asset manifest,
          and mock payment framework as the homepage.
        </p>
      </section>
      {(route === "/showcase" || route === "/solutions") && <ShowcaseSection />}
      {(route === "/vitaflow" || route === "/vitakiosk" || route === "/ai-website-studio" || route === "/ai-academy") && (
        <BusinessLinesSection />
      )}
      {(route === "/pricing" || route === "/order") && <PricingSection />}
      <SolutionsBand />
      <LeadConsole initialKind={kind} />
      <SafetyBand />
    </main>
  );
}

function HomePage() {
  const progress = useScrollProgress();
  return (
    <main className="page-shell" style={{ "--page-progress": progress } as React.CSSProperties}>
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
