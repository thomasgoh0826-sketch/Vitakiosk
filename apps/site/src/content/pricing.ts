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
  packageName: string;
  category: PricingCategory;
  priceLabel: string;
  billingType: "subscription" | "campaign" | "lesson" | "training" | "project" | "deployment";
  cadence: string;
  negotiable: boolean;
  nonNegotiableLabel?: "Non-negotiable";
  ctaLabel: string;
  description: string;
  notes: string[];
  publicStatusLabel: "Pending confirmation" | "Manual payment pending" | "Confirmed" | "Completed";
  statusFlow: PricingStatus[];
  includes: string[];
  safetyNote?: string;
  checkoutMode: "subscription" | "deposit" | "one_time" | "quote";
}

export const manualPaymentNotice =
  "Payment will be confirmed manually after discussion. Online payment gateway is not enabled yet.";

export const negotiationNotice =
  "Manual payment and quotation are available. Prices are negotiable unless marked as Non-negotiable.";

export const legalPricingNotice =
  "Prices are starting prices in MYR and may change depending on scope, setup requirements, campaign content, integrations, location, and support needs. Manual payment confirmation is used at this stage.";

export const healthcareCampaignNotice =
  "Sponsored product education and campaign content must be reviewed before display. VitaKiosk does not provide diagnosis, prescription consultation, or medical advice.";

export const submissionSuccessMessage =
  "Your request has been submitted. We will contact you to confirm scope, schedule, and manual payment details.";

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
    packageName: "Starter",
    category: "vitaflow",
    priceLabel: "Free setup + RM199/month",
    billingType: "subscription",
    cadence: "Subscription product",
    negotiable: true,
    ctaLabel: "Request ERP Demo",
    description: "Entry ERP path for retail pharmacy operations.",
    notes: ["Manual onboarding", "Manual payment confirmation"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "subscription",
    statusFlow: manualStatusFlow,
    includes: ["Inventory", "Stock movement", "Branch product data", "Basic reports"],
  },
  {
    id: "vitaflow-growth-monthly",
    name: "Growth",
    packageName: "Growth",
    category: "vitaflow",
    priceLabel: "Free setup + RM399/month",
    billingType: "subscription",
    cadence: "Subscription product",
    negotiable: true,
    ctaLabel: "Start Subscription Inquiry",
    description: "Multi-branch ERP workflow for growing pharmacy teams.",
    notes: ["Manual onboarding", "Custom scope can be discussed"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "subscription",
    statusFlow: manualStatusFlow,
    includes: ["Multi-branch workflows", "Price monitoring", "Promotions", "Customer follow-up"],
  },
  {
    id: "vitaflow-enterprise",
    name: "Enterprise",
    packageName: "Enterprise",
    category: "vitaflow",
    priceLabel: "Free setup + custom quote from RM899/month",
    billingType: "subscription",
    cadence: "Reviewed deployment",
    negotiable: true,
    ctaLabel: "Start Subscription Inquiry",
    description: "Enterprise ERP planning for larger operating models.",
    notes: ["Manual onboarding", "Custom scope can be discussed"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: ["Advanced reports", "Analytics", "Role-aware operations", "Integration planning"],
  },
  {
    id: "vitakiosk-local-edition",
    name: "Local Edition",
    packageName: "Local Edition",
    category: "vitakiosk",
    priceLabel: "From RM500 setup + RM200/month maintenance",
    billingType: "deployment",
    cadence: "Manual quotation",
    negotiable: true,
    ctaLabel: "Request VitaKiosk Quote",
    description: "Tablet or kiosk-style product education setup.",
    notes: ["Installation, hardware, and scope may affect final price"],
    publicStatusLabel: "Manual payment pending",
    checkoutMode: "deposit",
    statusFlow: manualStatusFlow,
    includes: ["Product education", "Shelf guidance", "Promotion display", "Staff handoff"],
    safetyNote: healthcareCampaignNotice,
  },
  {
    id: "vitakiosk-clinic-partner-campaign",
    name: "Clinic Partner Campaign",
    packageName: "Clinic Partner Campaign",
    category: "vitakiosk",
    priceLabel: "From RM1,500/campaign",
    billingType: "campaign",
    cadence: "Manual quotation",
    negotiable: true,
    ctaLabel: "Discuss Campaign Placement",
    description: "Reviewed campaign placement for clinic/pharmacy partner discovery.",
    notes: ["Campaign content and placement subject to review and approval"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: ["Partner discovery", "QR direction", "Sponsored education label", "Review workflow"],
    safetyNote: healthcareCampaignNotice,
  },
  {
    id: "vitakiosk-enterprise-deployment",
    name: "Enterprise Deployment",
    packageName: "Enterprise Deployment",
    category: "vitakiosk",
    priceLabel: "Custom quote from RM3,000",
    billingType: "deployment",
    cadence: "Manual quotation",
    negotiable: true,
    ctaLabel: "Request VitaKiosk Quote",
    description: "Multi-site or large kiosk deployment planning.",
    notes: ["Installation, hardware, and scope may affect final price"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: ["Multi-site rollout", "Operations review", "Training", "Support planning"],
  },
  {
    id: "ai-basics-1to1",
    name: "AI Basics 1-to-1",
    packageName: "AI Basics 1-to-1",
    category: "aiLessons",
    priceLabel: "RM199",
    billingType: "lesson",
    cadence: "1-to-1 lesson",
    negotiable: true,
    ctaLabel: "Book AI Lesson",
    description: "Practical AI basics for business owners and working adults.",
    notes: ["Manual slot confirmation"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "one_time",
    statusFlow: manualStatusFlow,
    includes: ["AI basics", "Prompt workflow", "Use-case planning", "Next-step checklist"],
  },
  {
    id: "ai-pharmacy-workflow",
    name: "AI Pharmacy Workflow",
    packageName: "AI Pharmacy Workflow",
    category: "aiLessons",
    priceLabel: "RM499",
    billingType: "lesson",
    cadence: "Workflow lesson",
    negotiable: false,
    nonNegotiableLabel: "Non-negotiable",
    ctaLabel: "Book AI Lesson",
    description: "Pharmacy AI workflow training with safe human escalation rules.",
    notes: ["Non-negotiable"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "one_time",
    statusFlow: manualStatusFlow,
    includes: ["Pharmacy workflow", "ERP-safe practices", "Campaign operations", "Human handoff"],
  },
  {
    id: "codex-website-coaching",
    name: "Codex / Website Coaching",
    packageName: "Codex / Website Coaching",
    category: "aiLessons",
    priceLabel: "RM399/session",
    billingType: "lesson",
    cadence: "Coaching session",
    negotiable: false,
    nonNegotiableLabel: "Non-negotiable",
    ctaLabel: "Book AI Lesson",
    description: "Codex and website build coaching for practical project execution.",
    notes: ["Non-negotiable"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "one_time",
    statusFlow: manualStatusFlow,
    includes: ["Codex workflow", "Website build practice", "Iteration habits", "Launch checklist"],
  },
  {
    id: "ai-content-video-workflow",
    name: "AI Content & Video Workflow",
    packageName: "AI Content & Video Workflow",
    category: "aiLessons",
    priceLabel: "RM399/session",
    billingType: "lesson",
    cadence: "Creative workflow session",
    negotiable: false,
    nonNegotiableLabel: "Non-negotiable",
    ctaLabel: "Book AI Lesson",
    description: "AI content and video workflow training for repeatable output.",
    notes: ["Non-negotiable"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "one_time",
    statusFlow: manualStatusFlow,
    includes: ["Content planning", "Storyboard prompts", "Review workflow", "Publishing checklist"],
  },
  {
    id: "team-training-workshop",
    name: "Team Training / Corporate Workshop",
    packageName: "Team Training / Corporate Workshop",
    category: "aiLessons",
    priceLabel: "From RM1,500 half-day / RM2,800 full-day",
    billingType: "training",
    cadence: "Team training",
    negotiable: true,
    ctaLabel: "Reserve Training Slot",
    description: "Group AI workflow training for teams and corporate workshops.",
    notes: ["Manual schedule confirmation"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: ["Team workflow audit", "Role-based training", "Automation boards", "Workshop materials"],
  },
  {
    id: "landing-page-launch",
    name: "Landing Page Launch",
    packageName: "Landing Page Launch",
    category: "aiWebsite",
    priceLabel: "From RM80",
    billingType: "project",
    cadence: "Project inquiry",
    negotiable: true,
    ctaLabel: "Start Website Project",
    description: "Focused landing page for a service, product, or campaign.",
    notes: ["Final price depends on scope, content, integrations, and timeline"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "deposit",
    statusFlow: manualStatusFlow,
    includes: ["Landing page design", "Lead capture", "Launch checklist", "Maintenance option"],
  },
  {
    id: "business-website",
    name: "Business Website",
    packageName: "Business Website",
    category: "aiWebsite",
    priceLabel: "From RM200",
    billingType: "project",
    cadence: "Project inquiry",
    negotiable: true,
    ctaLabel: "Request Website Quote",
    description: "Business website for services, retail, education, or SME growth.",
    notes: ["Final price depends on scope, content, integrations, and timeline"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "deposit",
    statusFlow: manualStatusFlow,
    includes: ["Service pages", "SEO-ready structure", "Contact flow", "Launch support"],
  },
  {
    id: "ai-website-chatbot",
    name: "AI Website with Chatbot",
    packageName: "AI Website with Chatbot",
    category: "aiWebsite",
    priceLabel: "From RM200 + RM150/month",
    billingType: "project",
    cadence: "AI-ready build",
    negotiable: true,
    ctaLabel: "Start Website Project",
    description: "Website with chatbot, lead capture, and safe handoff planning.",
    notes: ["Final price depends on scope, content, integrations, and timeline"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "deposit",
    statusFlow: manualStatusFlow,
    includes: ["AI chatbot", "Lead generation", "Knowledge base planning", "Fallback rules"],
  },
  {
    id: "custom-web-app",
    name: "Custom Web App",
    packageName: "Custom Web App",
    category: "aiWebsite",
    priceLabel: "From RM300",
    billingType: "project",
    cadence: "Reviewed build",
    negotiable: true,
    ctaLabel: "Request Website Quote",
    description: "Custom web app prototype or workflow system.",
    notes: ["Final price depends on scope, content, integrations, and timeline"],
    publicStatusLabel: "Pending confirmation",
    checkoutMode: "quote",
    statusFlow: manualStatusFlow,
    includes: ["Custom workflow", "API plan", "Prototype roadmap", "Security review"],
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
  cta: item.ctaLabel,
  negotiable: item.negotiable,
  nonNegotiableLabel: item.nonNegotiableLabel,
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
