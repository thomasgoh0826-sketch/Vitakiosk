export type PricingCategory =
  | "vitaflow"
  | "vitakiosk"
  | "aiLessons"
  | "aiWebsite";

export type PricingStatus =
  | "draft"
  | "checkout_created"
  | "pending_payment"
  | "active"
  | "past_due"
  | "cancelled"
  | "manual_review"
  | "quote_requested"
  | "deposit_pending"
  | "deposit_paid"
  | "scheduled"
  | "installed"
  | "completed"
  | "requested"
  | "payment_pending"
  | "paid"
  | "confirmed"
  | "rescheduled"
  | "inquiry"
  | "quote_sent"
  | "in_design"
  | "in_development"
  | "review"
  | "launched";

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

export const pricingItems: PricingItem[] = [
  {
    id: "vitaflow-starter-monthly",
    name: "Starter",
    category: "vitaflow",
    priceLabel: "Subscription inquiry",
    cadence: "Monthly framework",
    checkoutMode: "subscription",
    statusFlow: [
      "draft",
      "checkout_created",
      "pending_payment",
      "active",
      "past_due",
      "cancelled",
      "manual_review",
    ],
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
    priceLabel: "Subscription inquiry",
    cadence: "Monthly framework",
    checkoutMode: "subscription",
    statusFlow: [
      "draft",
      "checkout_created",
      "pending_payment",
      "active",
      "past_due",
      "cancelled",
      "manual_review",
    ],
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
    priceLabel: "Custom quote",
    cadence: "Reviewed deployment",
    checkoutMode: "quote",
    statusFlow: ["draft", "quote_requested", "manual_review", "active"],
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
    priceLabel: "Deposit framework",
    cadence: "Hardware and setup quote",
    checkoutMode: "deposit",
    statusFlow: [
      "draft",
      "quote_requested",
      "deposit_pending",
      "deposit_paid",
      "scheduled",
      "installed",
      "completed",
      "cancelled",
    ],
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
    priceLabel: "Campaign quote",
    cadence: "Reviewed placement",
    checkoutMode: "quote",
    statusFlow: ["draft", "quote_requested", "manual_review", "scheduled"],
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
    priceLabel: "Custom quote",
    cadence: "Reviewed deployment",
    checkoutMode: "quote",
    statusFlow: ["draft", "quote_requested", "manual_review", "scheduled"],
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
    priceLabel: "Lesson booking",
    cadence: "One-time session",
    checkoutMode: "one_time",
    statusFlow: [
      "requested",
      "payment_pending",
      "paid",
      "confirmed",
      "completed",
      "rescheduled",
      "cancelled",
    ],
    includes: [
      "AI basics for business owners",
      "Prompt workflow foundations",
      "Practical next-step plan",
      "Mock checkout and booking record",
    ],
  },
  {
    id: "ai-pharmacy-workflow",
    name: "AI for Pharmacy Workflow",
    category: "aiLessons",
    priceLabel: "Lesson booking",
    cadence: "Workshop or 1-to-1",
    checkoutMode: "one_time",
    statusFlow: [
      "requested",
      "payment_pending",
      "paid",
      "confirmed",
      "completed",
      "rescheduled",
      "cancelled",
    ],
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
    priceLabel: "Lesson booking",
    cadence: "Coaching package",
    checkoutMode: "one_time",
    statusFlow: [
      "requested",
      "payment_pending",
      "paid",
      "confirmed",
      "completed",
      "rescheduled",
      "cancelled",
    ],
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
    priceLabel: "Lesson booking",
    cadence: "Creative workflow",
    checkoutMode: "one_time",
    statusFlow: [
      "requested",
      "payment_pending",
      "paid",
      "confirmed",
      "completed",
      "rescheduled",
      "cancelled",
    ],
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
    priceLabel: "Team quote",
    cadence: "Group training",
    checkoutMode: "quote",
    statusFlow: ["requested", "quote_sent", "manual_review", "confirmed"],
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
    priceLabel: "Deposit framework",
    cadence: "Project package",
    checkoutMode: "deposit",
    statusFlow: [
      "inquiry",
      "quote_sent",
      "deposit_pending",
      "deposit_paid",
      "in_design",
      "in_development",
      "review",
      "launched",
      "completed",
      "cancelled",
    ],
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
    priceLabel: "Project quote",
    cadence: "Project package",
    checkoutMode: "deposit",
    statusFlow: [
      "inquiry",
      "quote_sent",
      "deposit_pending",
      "deposit_paid",
      "in_design",
      "in_development",
      "review",
      "launched",
      "completed",
      "cancelled",
    ],
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
    priceLabel: "Project quote",
    cadence: "AI-ready build",
    checkoutMode: "deposit",
    statusFlow: [
      "inquiry",
      "quote_sent",
      "deposit_pending",
      "deposit_paid",
      "in_design",
      "in_development",
      "review",
      "launched",
      "completed",
      "cancelled",
    ],
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
    priceLabel: "Project quote",
    cadence: "Conversion build",
    checkoutMode: "deposit",
    statusFlow: [
      "inquiry",
      "quote_sent",
      "deposit_pending",
      "deposit_paid",
      "in_design",
      "in_development",
      "review",
      "launched",
      "completed",
      "cancelled",
    ],
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
    priceLabel: "Custom quote",
    cadence: "Reviewed build",
    checkoutMode: "quote",
    statusFlow: ["inquiry", "quote_sent", "manual_review", "in_design"],
    includes: [
      "Custom product workflow",
      "API and integration plan",
      "Prototype-to-launch roadmap",
      "Security review",
    ],
  },
];

export const categoryLabels: Record<PricingCategory, string> = {
  vitaflow: "VitaFlow ERP Subscription",
  vitakiosk: "VitaKiosk Order",
  aiLessons: "AI Lessons",
  aiWebsite: "AI Website Development",
};

export function getPricingByCategory(category: PricingCategory): PricingItem[] {
  return pricingItems.filter((item) => item.category === category);
}

export function getPricingItem(id: string): PricingItem | undefined {
  return pricingItems.find((item) => item.id === id);
}
