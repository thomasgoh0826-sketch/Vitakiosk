import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Mail,
  Menu,
  MessageSquareText,
  Pause,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { demoAssets, videoHubAssets } from "./content/demoAssets";
import {
  businessLines,
  ctas,
  formTypes,
  navLinks,
  safetyDisclaimers,
  showcaseItems,
  solutionCards,
  storyScenes,
} from "./content/siteContent";
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
        <div className="hero-device">
          <img
            src={demoAssets.vitakiosk.ipadScreenshots[0].src}
            alt=""
            loading="eager"
          />
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

function StorySection() {
  const [active, setActive] = useState(storyScenes[0].id);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-story-scene]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target instanceof HTMLElement) {
          setActive(visible.target.dataset.storyScene || storyScenes[0].id);
        }
      },
      { threshold: [0.42, 0.6, 0.78] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const activeScene = storyScenes.find((scene) => scene.id === active) || storyScenes[0];

  return (
    <section className="scroll-story" id="solutions">
      <div className="story-stage">
        <div className="story-sticky">
          <div className="story-visual-shell">
            <activeScene.Icon size={44} />
            <span>{activeScene.number}</span>
            <h2>{activeScene.title}</h2>
            <p>{activeScene.visual}</p>
            <div className="story-depth-lines" aria-hidden="true" />
          </div>
          <div className="story-progress" aria-hidden="true">
            {storyScenes.map((scene) => (
              <span
                key={scene.id}
                className={scene.id === active ? "is-active" : ""}
              />
            ))}
          </div>
        </div>
        <div className="story-scenes">
          {storyScenes.map((scene) => (
            <article
              key={scene.id}
              className="story-copy"
              data-story-scene={scene.id}
            >
              <span>{scene.number}</span>
              <h2>{scene.title}</h2>
              <p>{scene.summary}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const morphScenes = [
  {
    id: "slab",
    mode: "slab",
    number: "00",
    title: "A system wakes up.",
    strap: "Abstract lab slab",
    description: "The story starts as a single operating layer before splitting into kiosk, ERP, web, and training surfaces.",
    media: demoAssets.showcasePosters[1],
  },
  {
    id: "ipad",
    mode: "ipad",
    number: "01",
    title: "VitaKiosk iPad",
    strap: "Before the counter",
    description: showcaseItems[0].description,
    media: demoAssets.vitakiosk.ipadScreenshots[0],
  },
  {
    id: "kiosk",
    mode: "kiosk",
    number: "02",
    title: "Large Kiosk",
    strap: "Waiting-area presence",
    description: showcaseItems[1].description,
    media: demoAssets.vitakiosk.largeKioskScreenshots[0],
  },
  {
    id: "erp",
    mode: "erp",
    number: "03",
    title: "VitaFlow ERP Board",
    strap: "Source-of-truth layer",
    description: showcaseItems[2].description,
    media: demoAssets.vitaflow.screenshots[0],
  },
  {
    id: "split",
    mode: "split",
    number: "04",
    title: "Website + Academy Split",
    strap: "Growth and capability",
    description: "AI Website Studio captures demand while AI Academy turns the team into practical AI operators.",
    media: demoAssets.showcasePosters[0],
  },
] as const;

function DeviceMorphShell({ scene }: { scene: (typeof morphScenes)[number] }) {
  return (
    <div className={`device-morph-shell mode-${scene.mode}`} aria-live="polite">
      <div className="device-shadow" />
      <div className="screen-mask">
        <img src={scene.media.src} alt={scene.media.alt} loading="lazy" />
        <div className="screen-scan" />
      </div>
      <div className="morph-caption">
        <span>{scene.number} / {scene.media.label}</span>
        <h3>{scene.title}</h3>
        <p>{scene.description}</p>
      </div>
    </div>
  );
}

function PinnedShowcaseStage() {
  const [activeId, setActiveId] = useState<(typeof morphScenes)[number]["id"]>("slab");
  const activeScene = morphScenes.find((scene) => scene.id === activeId) || morphScenes[0];

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-morph-scene]"));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target instanceof HTMLElement) {
          setActiveId((visible.target.dataset.morphScene || "slab") as (typeof morphScenes)[number]["id"]);
        }
      },
      { threshold: [0.36, 0.55, 0.72] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="pinned-showcase-stage" id="showcase">
      <div className="section-heading">
        <span>See the systems in action</span>
        <h2>One device surface, five operating states.</h2>
      </div>
      <div className="morph-stage-grid">
        <div className="morph-sticky">
          <DeviceMorphShell scene={activeScene} />
          <div className="floating-scene-dock" aria-label="Showcase scene selector">
            {morphScenes.map((scene) => (
              <button
                key={scene.id}
                className={scene.id === activeId ? "is-active" : ""}
                onClick={() => setActiveId(scene.id)}
              >
                <span>{scene.number}</span>
                {scene.strap}
              </button>
            ))}
          </div>
        </div>
        <div className="morph-copy-rail">
          {morphScenes.map((scene) => (
            <article
              key={scene.id}
              data-morph-scene={scene.id}
              className={scene.id === activeId ? "is-active" : ""}
            >
              <span>{scene.number}</span>
              <h3>{scene.title}</h3>
              <p>{scene.description}</p>
              <small>{scene.media.notes}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection() {
  return <PinnedShowcaseStage />;
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
    <section className="clinic-partner-corridor" id="clinic-pharmacy-partners">
      <div className="corridor-copy">
        <span>Clinic / pharmacy partner model</span>
        <h2>Connect product interest to participating pharmacy partners without endorsement claims.</h2>
        <p>
          VitaKiosk can support general product education, QR direction,
          reviewed campaign redemption, availability guidance, and staff
          escalation while keeping product facts tied to approved data.
        </p>
      </div>
      <div className="corridor-stage" aria-label="Clinic to pharmacy partner flow">
        <div className="corridor-node clinic">
          <Stethoscope size={30} />
          <strong>Clinic waiting area</strong>
          <small>General product interest appears before the counter.</small>
        </div>
        <div className="corridor-line" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="corridor-kiosk">
          <img src={demoAssets.vitakiosk.ipadScreenshots[0].src} alt="VitaKiosk iPad product education screen" loading="lazy" />
          <strong>VitaKiosk education layer</strong>
          <small>Reviewed information, QR direction, and staff escalation.</small>
        </div>
        <div className="corridor-line" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="corridor-node pharmacy">
          <ShoppingBag size={30} />
          <strong>Participating pharmacy</strong>
          <small>Where-to-buy guidance and campaign redemption, clearly labelled.</small>
        </div>
      </div>
    </section>
  );
}

function VideoFilmStrip() {
  const [active, setActive] = useState<(typeof videoHubAssets)[number] | null>(null);
  return (
    <section className="video-hub video-film-strip" id="video">
      <div className="section-heading">
        <span>Video-first content</span>
        <h2>Motion concepts ready for real captures and generated campaign clips.</h2>
      </div>
      <div className="video-strip" aria-label="Video hub">
        {videoHubAssets.map((video, index) => (
          <button
            key={video.id}
            className="video-tile"
            onClick={() => setActive(video)}
            style={{ "--video-index": index } as React.CSSProperties}
          >
            <img src={video.poster} alt="" loading="lazy" />
            <span>{video.label}</span>
            <strong>{video.title}</strong>
            <small>{video.summary}</small>
          </button>
        ))}
      </div>
      {active && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${active.title} preview`}>
          <div className="video-modal">
            <button className="icon-button" onClick={() => setActive(null)}>
              <X size={18} />
              <span className="sr-only">Close preview</span>
            </button>
            <img src={active.poster} alt={`${active.title} preview poster`} />
            <div>
              <span>{active.duration}</span>
              <h3>{active.title}</h3>
              <p>{active.summary}</p>
            <p className="muted">
                Preview loop placeholder. Replace with muted autoplay demo
                footage or generated campaign video after review.
              </p>
              <button className="button secondary" onClick={() => setActive(null)}>
                <Pause size={16} />
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function VideoHub() {
  return <VideoFilmStrip />;
}

function PricingSection() {
  const categories = Object.keys(categoryLabels) as PricingCategory[];
  const [active, setActive] = useState<PricingCategory>("vitakiosk");
  return (
    <section className="pricing-section commerce-console" id="pricing">
      <div className="section-heading">
        <span>Mock commerce framework</span>
        <h2>A commerce console for subscriptions, deposits, bookings, and quotes.</h2>
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
      <div className="pricing-flow">
        {getPricingByCategory(active).map((item) => (
          <article key={item.id} className="pricing-node">
            <span>{item.cadence}</span>
            <h3>{item.name}</h3>
            <strong>{item.priceLabel}</strong>
            <ul>
              {item.includes.map((entry) => (
                <li key={entry}>
                  <CheckCircle2 size={15} />
                  {entry}
                </li>
              ))}
            </ul>
            {item.safetyNote && <p className="safety-note">{item.safetyNote}</p>}
            <SmartLink href="/order" className="button secondary">
              Start mock flow
              <ArrowRight size={16} />
            </SmartLink>
          </article>
        ))}
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
      <StorySection />
      <PinnedShowcaseStage />
      <ClinicPartnerCorridor />
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
