import {
  BarChart3,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  Building2,
  CalendarCheck,
  Contact,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Handshake,
  LayoutTemplate,
  MessageSquareText,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  TabletSmartphone,
  Workflow,
} from "lucide-react";

export const navLinks = [
  { label: "Showcase", href: "/showcase" },
  { label: "Solutions", href: "/solutions" },
  { label: "VitaFlow", href: "/vitaflow" },
  { label: "VitaKiosk", href: "/vitakiosk" },
  { label: "Studio", href: "/ai-website-studio" },
  { label: "Academy", href: "/ai-academy" },
  { label: "Pricing", href: "/pricing" },
];

export const ctas = [
  { label: "Explore Showcase", href: "/showcase", variant: "primary" },
  { label: "View Pricing", href: "/pricing", variant: "secondary" },
  { label: "Book Demo", href: "/book", variant: "secondary" },
  { label: "Contact Sales", href: "/contact", variant: "ghost" },
] as const;

export const businessLines = [
  {
    id: "vitaflow",
    title: "VitaFlow ERP",
    phrase: "Product data hub",
    Icon: BarChart3,
    href: "/vitaflow",
    copy:
      "Inventory, stock movement, branch-aware product data, price monitoring, promotions, customer follow-up, purchasing, reports, and analytics.",
  },
  {
    id: "vitakiosk",
    title: "VitaKiosk AI Kiosk",
    phrase: "Product education",
    Icon: TabletSmartphone,
    href: "/vitakiosk",
    copy:
      "Supplement/product information, where-to-buy guidance, promotion display, shelf guidance, queue support, and staff escalation.",
  },
  {
    id: "studio",
    title: "AI Website Studio",
    phrase: "Digital growth",
    Icon: LayoutTemplate,
    href: "/ai-website-studio",
    copy:
      "AI-ready websites, landing pages, chatbot sites, booking/contact flows, lead generation, domain setup, launch, and maintenance.",
  },
  {
    id: "academy",
    title: "AI Academy",
    phrase: "Practical training",
    Icon: GraduationCap,
    href: "/ai-academy",
    copy:
      "AI basics, Codex workflow, prompts, automation, AI website building, video/content workflow, pharmacy AI workflow, and team lessons.",
  },
];

export const storyScenes = [
  {
    id: "queue",
    number: "01",
    title: "The front desk is busy.",
    summary:
      "Customers often need simple product education, promotion direction, or shelf guidance while staff are handling the counter.",
    visual: "Clinic queue, retail aisle pressure, and unanswered product questions.",
    Icon: Building2,
  },
  {
    id: "education",
    number: "02",
    title: "VitaKiosk answers before the counter.",
    summary:
      "The kiosk explains general product information, shows reviewed promotion material, guides to shelf or QR, and escalates to staff when needed.",
    visual: "Tablet and large kiosk mode with mock product facts.",
    Icon: Bot,
  },
  {
    id: "source",
    number: "03",
    title: "VitaFlow remains the source of truth.",
    summary:
      "Stock, product facts, shelf location, prices, promotions, purchasing queries, reports, and analytics come from ERP or approved mock data.",
    visual: "ERP provenance and branch-aware operations.",
    Icon: ShieldCheck,
  },
  {
    id: "growth",
    number: "04",
    title: "AI Website Studio grows the digital front door.",
    summary:
      "Businesses can launch websites that explain services, capture leads, support bookings, and connect campaigns to the real operation.",
    visual: "Website, chatbot, booking flow, and lead capture.",
    Icon: ExternalLink,
  },
  {
    id: "training",
    number: "05",
    title: "AI Academy turns tools into workflow.",
    summary:
      "Owners, clinic teams, pharmacy teams, staff, students, and working adults learn AI as practical operating habits.",
    visual: "Prompt workflow, Codex build, automation board, and content calendar.",
    Icon: BookOpenCheck,
  },
  {
    id: "cta",
    number: "06",
    title: "Choose the next deployment path.",
    summary:
      "Start with a demo, a quote, a lesson, a website project, or a mock checkout flow. Live payments are not enabled.",
    visual: "Pricing, order, booking, and lead workflow.",
    Icon: CalendarCheck,
  },
];

export const showcaseItems = [
  {
    id: "tablet",
    title: "VitaKiosk Tablet",
    strap: "Counter-adjacent product education",
    description:
      "Shows the current public demo as a tablet experience with product facts, promotions, shelf guidance, and staff escalation.",
  },
  {
    id: "large",
    title: "VitaKiosk Large Kiosk",
    strap: "Waiting-area or retail floor presence",
    description:
      "Large landscape mode for clinic waiting areas, pharmacy desks, and campaign displays.",
  },
  {
    id: "erp",
    title: "VitaFlow ERP",
    strap: "Branch-aware source of truth",
    description:
      "Replaceable ERP dashboard capture lane for inventory, purchasing, promotions, and reporting.",
  },
  {
    id: "partner",
    title: "Clinic Partner Flow",
    strap: "Where-to-buy guidance",
    description:
      "Partner campaigns can show participating pharmacy information, QR direction, and reviewed redemption guidance.",
  },
  {
    id: "studio",
    title: "AI Website Studio",
    strap: "Lead-ready web presence",
    description:
      "Website, chatbot, booking/contact, deployment, domain, and maintenance workflow for pharmacies, clinics, SMEs, restaurants, education centres, and service businesses.",
  },
  {
    id: "academy",
    title: "AI Academy",
    strap: "AI as daily operating skill",
    description:
      "1-to-1 lessons and team training for prompts, Codex, automation, websites, AI video/content, and pharmacy AI workflow.",
  },
];

export const solutionCards = [
  {
    title: "Retail pharmacy",
    Icon: ShoppingBag,
    points: ["Stock movement", "Shelf guidance", "Promotion discovery", "Staff escalation"],
  },
  {
    title: "Clinic-linked pharmacy",
    Icon: Stethoscope,
    points: ["Waiting area education", "Where-to-buy guidance", "Partner campaign review", "No endorsement claims"],
  },
  {
    title: "Modern business",
    Icon: Workflow,
    points: ["AI website", "Booking/contact flow", "Lead capture", "Team training"],
  },
  {
    title: "Partner campaign",
    Icon: Handshake,
    points: ["Reviewed sponsored education", "QR redemption", "Participating pharmacy direction", "Compliance wording"],
  },
];

export const formTypes = [
  { id: "lead", label: "Contact / lead form", Icon: Contact },
  { id: "vitaflow", label: "VitaFlow subscription inquiry", Icon: BarChart3 },
  { id: "vitakiosk", label: "VitaKiosk order form", Icon: TabletSmartphone },
  { id: "partner", label: "Clinic/hospital partner placement inquiry", Icon: Handshake },
  { id: "lesson", label: "AI lesson booking form", Icon: GraduationCap },
  { id: "website", label: "AI website project intake form", Icon: MessageSquareText },
  { id: "checkout", label: "Mock checkout framework", Icon: CreditCard },
  { id: "unknown", label: "Purchasing query instead of product guess", Icon: PackageSearch },
  { id: "automation", label: "AI workflow and automation", Icon: BrainCircuit },
];

export const safetyDisclaimers = [
  "VitaKiosk provides general product education, where-to-buy guidance, and staff/pharmacist escalation. It does not provide diagnosis, prescription drug consultation, or professional medical advice.",
  "Sponsored product education must be clearly labelled and reviewed before display. Real deployment must follow local healthcare advertising and institutional compliance rules.",
  "Missing authoritative data is shown as unavailable. Product facts, stock, price, promotions, and shelf location must not be invented.",
];
