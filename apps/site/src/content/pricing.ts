export type PricingCategory =
  | "vitaflow"
  | "vitakiosk"
  | "aiLessons"
  | "aiWebsite";

export type PricingStatus =
  | "inquiry_submitted"
  | "quote_requested"
  | "manual_payment_pending"
  | "manual_payment_received"
  | "confirmed"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "draft";

export interface PricingItem {
  id: string;
  name: string;
  category: PricingCategory;
  priceLabel: string;
  cadence: string;
  statusFlow: PricingStatus[];
  includes: string[];
  safetyNote?: string;
  checkoutMode: "subscription" | "deposit" | "one_time" | "quote";
}

export const manualPaymentNotice =
  "Online payment gateway is not enabled yet. Payment and onboarding are confirmed manually after discussion.";

export const manualStatusFlow: PricingStatus[] = [
  "inquiry_submitted",
  "quote_requested",
  "manual_payment_pending",
  "manual_payment_received",
  "confirmed",
  "scheduled",
  "completed",
  "cancelled",
];

export const pricingItems: PricingItem[] = [
  {
    id: "vitaflow-starter-monthly",
    name: "Starter",
    category: "vitaflow",
    priceLabel: "Request Demo",
    cadence: "Manual quote first",
    checkoutMode: "subscription",
    statusFlow: manualStatusFlow,
    includes: [
      "Retail pharmacy ERP foundation",
      "Inventory and stock movement",
      "Branch-aware product data",
      "Reports and promotion readiness",
    ],
  },
  {
    id: "vitaflow-growth-monthly",
    name: "Growth",
    category: "vitaflow",
    priceLabel: "Request Quote",
    cadence: "Manual quote first",
    checkoutMode: "subscription",
    statusFlow: manualStatusFlow,
    includes: [
      "Multi-branch operating workflows",
      "Price monitoring and promotions",
      "Customer follow-up workflows",
      "Future VitaKiosk data connection",
    ],
  },
  {
    id: "vitaflow-enterprise",
    name: "Enterprise",
    category: "vitaflow",
    priceLabel: "Request Quote",
    cadence: "Reviewed deployment",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: [
      "Enterprise reporting and analytics",
      "Role-aware operating model",
      "Deployment planning",
      "Read-only integration planning",
    ],
  },
  {
    id: "vitakiosk-local-edition",
    name: "Local Edition",
    category: "vitakiosk",
    priceLabel: "Request Quote",
    cadence: "Hardware and setup quote",
    checkoutMode: "deposit",
    statusFlow: manualStatusFlow,
    includes: [
      "iPad or kiosk-style demo setup",
      "Product education and shelf guidance",
      "Staff/pharmacist escalation",
      "Mock-first launch checklist",
    ],
    safetyNote:
      "General product education only. It does not diagnose, prescribe, or replace a pharmacist.",
  },
  {
    id: "vitakiosk-clinic-partner-campaign",
    name: "Clinic Partner Campaign",
    category: "vitakiosk",
    priceLabel: "Book Demo",
    cadence: "Reviewed placement",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: [
      "Partner placement inquiry",
      "Sponsored product education labels",
      "Where-to-buy and QR campaign direction",
      "Compliance review workflow",
    ],
    safetyNote:
      "No doctor endorsement or hospital recommendation is implied by partner placement.",
  },
  {
    id: "vitakiosk-enterprise-deployment",
    name: "Enterprise Deployment",
    category: "vitakiosk",
    priceLabel: "Request Quote",
    cadence: "Reviewed deployment",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: [
      "Large kiosk or multi-site rollout",
      "Branch-aware source-of-truth planning",
      "Security and operations review",
      "Support and training package",
    ],
  },
  {
    id: "ai-basics-1to1",
    name: "AI Basics 1-to-1",
    category: "aiLessons",
    priceLabel: "Reserve Lesson Slot",
    cadence: "One-time session",
    checkoutMode: "one_time",
    statusFlow: manualStatusFlow,
    includes: [
      "AI basics for business owners",
      "Prompt workflow foundations",
      "Practical next-step plan",
      "Manual booking confirmation record",
    ],
  },
  {
    id: "ai-pharmacy-workflow",
    name: "AI for Pharmacy Workflow",
    category: "aiLessons",
    priceLabel: "Book Lesson",
    cadence: "Workshop or 1-to-1",
    checkoutMode: "one_time",
    statusFlow: manualStatusFlow,
    includes: [
      "Pharmacy AI workflow mapping",
      "ERP-safe assistant practices",
      "Content and campaign operations",
      "Human escalation rules",
    ],
  },
  {
    id: "codex-website-coaching",
    name: "Codex / Website Build Coaching",
    category: "aiLessons",
    priceLabel: "Book Lesson",
    cadence: "Coaching package",
    checkoutMode: "one_time",
    statusFlow: manualStatusFlow,
    includes: [
      "Codex workflow setup",
      "AI website build practice",
      "Review and iteration habits",
      "Deployment checklist",
    ],
  },
  {
    id: "ai-content-video-workflow",
    name: "AI Content & Video Workflow",
    category: "aiLessons",
    priceLabel: "Book Lesson",
    cadence: "Creative workflow",
    checkoutMode: "one_time",
    statusFlow: manualStatusFlow,
    includes: [
      "AI video/content planning",
      "Storyboard prompt workflow",
      "Review-safe healthcare wording",
      "Publishing checklist",
    ],
  },
  {
    id: "team-training-workshop",
    name: "Team Training / Corporate Workshop",
    category: "aiLessons",
    priceLabel: "Request Quote",
    cadence: "Group training",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: [
      "Team workflow audit",
      "Role-based AI training",
      "Automation and content boards",
      "Workshop materials",
    ],
  },
  {
    id: "landing-page-launch",
    name: "Landing Page Launch",
    category: "aiWebsite",
    priceLabel: "Start Project Inquiry",
    cadence: "Project package",
    checkoutMode: "deposit",
    statusFlow: manualStatusFlow,
    includes: [
      "Landing page design",
      "Lead/contact capture",
      "Domain and launch checklist",
      "Maintenance option",
    ],
  },
  {
    id: "business-website",
    name: "Business Website",
    category: "aiWebsite",
    priceLabel: "Start Project Inquiry",
    cadence: "Project package",
    checkoutMode: "deposit",
    statusFlow: manualStatusFlow,
    includes: [
      "Service/business website",
      "SEO-ready structure",
      "Booking or contact flow",
      "Launch and maintenance plan",
    ],
  },
  {
    id: "ai-website-chatbot",
    name: "AI Website with Chatbot",
    category: "aiWebsite",
    priceLabel: "Start Project Inquiry",
    cadence: "AI-ready build",
    checkoutMode: "deposit",
    statusFlow: manualStatusFlow,
    includes: [
      "AI chatbot website",
      "Lead generation flow",
      "Content knowledge base planning",
      "Safe fallback and handoff rules",
    ],
  },
  {
    id: "booking-lead-generation-website",
    name: "Booking / Lead Generation Website",
    category: "aiWebsite",
    priceLabel: "Start Project Inquiry",
    cadence: "Conversion build",
    checkoutMode: "deposit",
    statusFlow: manualStatusFlow,
    includes: [
      "Booking/contact flow",
      "Lead intake dashboard concept",
      "Automated follow-up planning",
      "Launch support",
    ],
  },
  {
    id: "custom-web-app",
    name: "Custom Web App",
    category: "aiWebsite",
    priceLabel: "Start Project Inquiry",
    cadence: "Reviewed build",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: [
      "Custom product workflow",
      "API and integration plan",
      "Prototype-to-launch roadmap",
      "Security review",
    ],
  },
];

export const categoryLabels: Record<PricingCategory, string> = {
  vitaflow: "VitaFlow ERP",
  vitakiosk: "VitaKiosk",
  aiLessons: "AI Academy",
  aiWebsite: "AI Website Studio",
};

export function getPricingByCategory(category: PricingCategory): PricingItem[] {
  return pricingItems.filter((item) => item.category === category);
}

export function getPricingItem(id: string): PricingItem | undefined {
  return pricingItems.find((item) => item.id === id);
}

export const pricingPlans = pricingItems.map((item) => ({
  id: item.id.replace("-monthly", ""),
  group:
    item.category === "aiLessons"
      ? "academy"
      : item.category === "aiWebsite"
        ? "website"
        : item.category,
  name: item.name,
  priceLabel: item.priceLabel,
  billingKind: item.checkoutMode,
  cta: item.priceLabel,
}));

export function plansForGroup(group: "vitaflow" | "vitakiosk" | "academy" | "website") {
  return pricingPlans.filter((item) => item.group === group);
}

export function findPricingPlan(id: string) {
  const aliases: Record<string, string> = {
    "website-ai-chatbot": "ai-website-chatbot",
  };
  const targetId = aliases[id] || id;
  return pricingPlans.find((item) => item.id === targetId);
}
