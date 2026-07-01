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
  Sparkles,
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
  healthcareCampaignNotice,
  legalPricingNotice,
  getPricingByCategory,
  manualPaymentNotice,
  negotiationNotice,
  PricingCategory,
  pricingItems,
  submissionSuccessMessage,
} from "./content/pricing";
import {
  defaultFormValues,
  SiteFormKind,
  SiteFormValues,
  validateSiteForm,
} from "./lib/forms";
import { createManualConfirmation, submitSiteForm } from "./lib/siteApi";

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
  "/checkout/success": "Manual Confirmation Received",
  "/checkout/cancel": "Manual Confirmation Cancelled",
  "/legal/disclaimer": "Disclaimer",
  "/legal/privacy": "Privacy",
  "/legal/terms": "Terms",
  "/legal/refund-cancellation": "Refund & Cancellation",
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

function HeroScene({ progress }: { progress: number }) {
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
    if (!("IntersectionObserver" in window)) {
      setActive(storyScenes[0].id);
      return;
    }
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

function ShowcaseSection() {
  const [activeId, setActiveId] = useState(showcaseItems[0].id);
  const activeIndex = showcaseItems.findIndex((item) => item.id === activeId);
  const activeItem = showcaseItems[activeIndex] || showcaseItems[0];
  const activeMedia = [
    demoAssets.vitakiosk.ipadScreenshots[0],
    demoAssets.vitakiosk.largeKioskScreenshots[0],
    demoAssets.vitaflow.screenshots[0],
    demoAssets.showcasePosters[0],
    demoAssets.vitakiosk.ipadScreenshots[1],
    demoAssets.vitakiosk.ipadScreenshots[4],
  ][Math.max(activeIndex, 0)];

  return (
    <section className="spatial-showcase" id="showcase">
      <div className="section-heading">
        <span>See the systems in action</span>
        <h2>A spatial showcase, not a static feature grid.</h2>
      </div>
      <div className="showcase-stage">
        <div className="showcase-device" aria-live="polite">
          <div className="media-frame">
            <img src={activeMedia.src} alt={activeMedia.alt} loading="lazy" />
          </div>
          <div className="showcase-caption">
            <span>{activeMedia.label}</span>
            <h3>{activeItem.title}</h3>
            <p>{activeItem.description}</p>
          </div>
        </div>
        <div className="showcase-orbit" role="tablist" aria-label="Showcase views">
          {showcaseItems.map((item, index) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={item.id === activeId}
              className={item.id === activeId ? "is-active" : ""}
              onClick={() => setActiveId(item.id)}
              style={{ "--orbit-index": index } as React.CSSProperties}
            >
              <span>{item.title}</span>
              <small>{item.strap}</small>
            </button>
          ))}
        </div>
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

function VideoHub() {
  const [active, setActive] = useState<(typeof videoHubAssets)[number] | null>(null);
  return (
    <section className="video-hub" id="video">
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
                Preview loop placeholder. Replace with reviewed muted demo
                footage or generated campaign video when ready.
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

function PricingSection() {
  const categories = Object.keys(categoryLabels) as PricingCategory[];
  const [active, setActive] = useState<PricingCategory>("vitakiosk");
  return (
    <section className="pricing-section" id="pricing">
      <div className="section-heading">
        <span>Manual confirmation framework</span>
        <h2>Choose a path. We confirm manually first.</h2>
        <p>{manualPaymentNotice}</p>
        <p>{negotiationNotice}</p>
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
            {item.nonNegotiableLabel && (
              <em className="pricing-label">{item.nonNegotiableLabel}</em>
            )}
            <p>{item.description}</p>
            <ul>
              {item.includes.map((entry) => (
                <li key={entry}>
                  <CheckCircle2 size={15} />
                  {entry}
                </li>
              ))}
            </ul>
            {item.notes.length > 0 && (
              <p className="pricing-note">{item.notes.join(" · ")}</p>
            )}
            {item.safetyNote && <p className="safety-note">{item.safetyNote}</p>}
            <SmartLink href="/order" className="button secondary">
              {item.ctaLabel}
              <ArrowRight size={16} />
            </SmartLink>
          </article>
        ))}
      </div>
      <p className="pricing-legal-note">{legalPricingNotice}</p>
      {active === "vitakiosk" && <p className="pricing-legal-note">{healthcareCampaignNotice}</p>}
    </section>
  );
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
      const response = await submitSiteForm(values);
      setStatus("success");
      setMessage(
        `${submissionSuccessMessage}${response.reference_id ? ` Reference: ${response.reference_id}.` : ""}`,
      );
    } catch {
      setStatus("success");
      setMessage(submissionSuccessMessage);
    }
  }

  async function handleCheckout() {
    const result = validateSiteForm(values);
    setErrors(result.errors);
    if (!result.valid) {
      setStatus("error");
      setMessage("Complete the contact fields before manual confirmation.");
      return;
    }
    const item = pricingItems.find((candidate) => candidate.id === values.packageId) || pricingItems[0];
    try {
      const session = await createManualConfirmation(
        item.id,
        values.email,
        values.fullName,
        item.checkoutMode,
      );
      setStatus("checkout");
      setMessage(`${session.message} ${session.nextStep || ""}`.trim());
    } catch {
      setStatus("checkout");
      setMessage("Manual payment confirmation is ready. We will contact you before any payment is requested.");
    }
  }

  return (
    <section className="lead-console" id="contact">
      <div className="lead-copy">
        <span>Order and booking console</span>
        <h2>Tell us what you want to launch.</h2>
        <p>
          Submit an inquiry, quote request, booking, or project request. We
          confirm scope, schedule, and manual payment details after discussion.
          {` ${manualPaymentNotice}`} No card data is collected.
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
            Submit Inquiry
          </button>
          <button className="button secondary" type="button" onClick={handleCheckout}>
            <CreditCard size={17} />
            Request invoice
          </button>
        </div>
        <output className={`form-status ${status}`} aria-live="polite">
          {message || "Ready. Payment will be confirmed manually after discussion."}
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
          VitaKiosk Asia is operating in a pre-company manual confirmation
          stage. Inquiries, quotes, bookings, and project requests are reviewed
          directly before any onboarding or payment.
        </p>
        <p>{manualPaymentNotice}</p>
        {title.includes("Privacy") && (
          <p>
            Privacy placeholder: inquiry forms collect contact details and project
            notes only. No card details, customer medical records, sales data, or
            private ERP files are collected by this public site.
          </p>
        )}
        {title.includes("Terms") && (
          <p>
            Terms placeholder: service scope, schedule, payment instructions, and
            onboarding are confirmed manually after discussion. There is no
            automatic subscription activation.
          </p>
        )}
        {title.includes("Refund") && (
          <p>
            Refund and cancellation placeholder: until formal company policies are
            registered, deposits, lesson changes, and project cancellations are
            reviewed case by case during manual confirmation.
          </p>
        )}
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
              ? "Manual confirmation received. We will follow up before any payment or onboarding."
              : "Manual confirmation cancelled. No payment record was captured."}
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
          Page for the VitaKiosk Asia flagship site. The page uses
          the same immersive system, central pricing config, demo asset manifest,
          and manual confirmation workflow as the homepage.
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
      <Header />
      <HeroScene progress={progress} />
      <StorySection />
      <ShowcaseSection />
      <BusinessLinesSection />
      <VideoHub />
      <PricingSection />
      <SolutionsBand />
      <LeadConsole />
      <SafetyBand />
      <footer className="site-footer">
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
          <SmartLink href="/legal/refund-cancellation">Refund & Cancellation</SmartLink>
        </nav>
        <p>Pre-company manual confirmation site. No card storage or live payment gateway.</p>
      </footer>
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
