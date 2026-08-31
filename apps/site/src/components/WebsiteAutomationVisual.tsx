import {
  Activity,
  BarChart3,
  CalendarCheck,
  CreditCard,
  Database,
  Mail,
  Magnet,
  MessageSquare,
  Rocket,
  ShieldCheck,
  UserRound,
  UsersRound,
  Zap,
} from "lucide-react";

const funnelSteps = [
  {
    number: "01",
    title: "ATTRACT",
    copy: "Bring the right people in.",
    Icon: Magnet,
  },
  {
    number: "02",
    title: "CAPTURE",
    copy: "Capture leads that matter.",
    Icon: UserRound,
  },
  {
    number: "03",
    title: "NURTURE",
    copy: "Engage and build trust automatically.",
    Icon: Mail,
  },
  {
    number: "04",
    title: "CONVERT",
    copy: "Turn leads into paying customers.",
    Icon: CreditCard,
  },
  {
    number: "05",
    title: "ANALYZE",
    copy: "Measure, learn, and optimize.",
    Icon: BarChart3,
  },
];

const trustPills = [
  { label: "Unified Data", Icon: Database },
  { label: "Smart Automation", Icon: Zap },
  { label: "Real-time Insights", Icon: Activity },
  { label: "Secure & Reliable", Icon: ShieldCheck },
];

export function WebsiteAutomationVisual() {
  return (
    <div
      className="website-automation-visual"
      data-component="WebsiteAutomationVisual"
      aria-label="Business Funnel Automation visual"
    >
      <div className="automation-orbit orbit-a" aria-hidden="true" />
      <div className="automation-orbit orbit-b" aria-hidden="true" />
      <div className="automation-orbit orbit-c" aria-hidden="true" />

      <article className="automation-floating-card card-leads" aria-label="Lead Capture statistics">
        <header>
          <UsersRound size={15} />
          <span>Lead Capture</span>
        </header>
        <strong>248</strong>
        <p>New Leads</p>
        <small>+24% vs last 7 days</small>
      </article>

      <article className="automation-floating-card card-booking" aria-label="Booking System statistics">
        <header>
          <CalendarCheck size={15} />
          <span>Booking System</span>
        </header>
        <strong>15</strong>
        <p>Bookings This Week</p>
        <small>Next: Demo Call</small>
      </article>

      <article className="automation-floating-card card-chatbot" aria-label="AI Chatbot statistics">
        <header>
          <MessageSquare size={15} />
          <span>AI Chatbot</span>
        </header>
        <strong>32</strong>
        <p>Conversations This Week</p>
        <small>Top intent: Pricing Info</small>
      </article>

      <article className="automation-floating-card card-maintenance" aria-label="Maintenance health">
        <header>
          <ShieldCheck size={15} />
          <span>Maintenance</span>
        </header>
        <strong>All Systems Healthy</strong>
        <small>Last check: 2m ago</small>
      </article>

      <article className="automation-floating-card card-analytics" aria-label="Analytics statistics">
        <header>
          <BarChart3 size={15} />
          <span>Analytics</span>
        </header>
        <strong>12.4K Visitors</strong>
        <svg viewBox="0 0 180 52" role="img" aria-label="Visitors trend line">
          <path d="M4 44 C22 34 30 42 44 29 C58 17 70 28 86 16 C105 0 116 22 132 12 C150 2 156 14 176 6" />
          <path className="chart-fill" d="M4 44 C22 34 30 42 44 29 C58 17 70 28 86 16 C105 0 116 22 132 12 C150 2 156 14 176 6 L176 52 L4 52 Z" />
        </svg>
      </article>

      <article className="automation-floating-card card-launch" aria-label="Launch Support status">
        <header>
          <Rocket size={15} />
          <span>Launch Support</span>
        </header>
        <strong>Ready to go!</strong>
        <div className="launch-progress" aria-label="Launch progress 100 percent">
          <span />
        </div>
        <small>100%</small>
      </article>

      <section className="automation-main-panel" aria-labelledby="automation-title">
        <div className="automation-panel-topline">
          <span className="automation-brand-dot" aria-hidden="true" />
          <span>VitaKiosk Labs</span>
        </div>
        <h3 id="automation-title">Business Funnel Automation</h3>
        <p>One system. Every step. Real growth.</p>

        <div className="automation-funnel-flow" aria-label="Five step business funnel flow">
          {funnelSteps.map(({ number, title, copy, Icon }) => (
            <div className="automation-step" key={title}>
              <span className="automation-step-number">{number}</span>
              <span className="automation-step-icon">
                <Icon size={24} aria-hidden="true" />
              </span>
              <strong>{title}</strong>
              <small>{copy}</small>
            </div>
          ))}
        </div>

        <div className="automation-base">
          <strong>Automate your growth. Scale with clarity.</strong>
          <div className="automation-trust-pills">
            {trustPills.map(({ label, Icon }) => (
              <span key={label}>
                <Icon size={13} aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
