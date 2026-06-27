export type DemoAssetKind = "approved_reference" | "placeholder" | "generated" | "concept";
export type DemoAssetChannel = "reference" | "poster" | "video" | "loop" | "screenshot";

export interface DemoMedia {
  id: string;
  title: string;
  src: string;
  alt: string;
  kind: DemoAssetKind;
  channel: DemoAssetChannel;
  label: string;
  notes: string;
  aspect: "landscape" | "portrait" | "square";
  replacementPath: string;
}

export interface DemoVideoMedia extends Omit<DemoMedia, "channel" | "src"> {
  channel: "video";
  poster: string;
  previewSrc: string;
  fullSrc: string;
  duration: string;
  summary: string;
  category: string;
  status: "Storyboard" | "Prompt Ready" | "Internal Lab Build" | "Placeholder" | "Demo Capture";
}

const media = {
  approvedKioskReference: "/assets/reference/vitakiosk-demo-approved.png",
  vitaflowDashboard: "/assets/demos/vitaflow/dashboard.svg",
  vitaflowInventory: "/assets/demos/vitaflow/inventory.svg",
  vitaflowPurchase: "/assets/demos/vitaflow/purchase.svg",
  vitaflowPromotion: "/assets/demos/vitaflow/promotion.svg",
  vitaflowFollowUp: "/assets/demos/vitaflow/follow-up.svg",
  vitaflowPoster: "/assets/demos/vitaflow/poster.svg",
  videoClinicQueuePoster: "/assets/posters/higgsfield/clinic-queue-problem.svg",
  videoPartnerPoster: "/assets/posters/higgsfield/pharmacy-partner-discovery.svg",
  videoRetailPoster: "/assets/posters/higgsfield/retail-pharmacy-promotion.svg",
  videoKioskPoster: "/assets/posters/higgsfield/vitakiosk-interactive-demo.svg",
  videoVitaflowPoster: "/assets/posters/higgsfield/vitaflow-source-of-truth.svg",
  videoWebsitePoster: "/assets/posters/higgsfield/ai-website-studio.svg",
  videoAcademyPoster: "/assets/posters/higgsfield/ai-academy.svg",
  videoClinicQueue: "/assets/videos/higgsfield/clinic-queue-problem.webm",
  videoPartner: "/assets/videos/higgsfield/pharmacy-partner-discovery.webm",
  videoRetail: "/assets/videos/higgsfield/retail-pharmacy-promotion.webm",
  videoKiosk: "/assets/videos/higgsfield/vitakiosk-interactive-demo.webm",
  videoVitaflow: "/assets/videos/higgsfield/vitaflow-source-of-truth.webm",
  videoWebsite: "/assets/videos/higgsfield/ai-website-studio.webm",
  videoAcademy: "/assets/videos/higgsfield/ai-academy.webm",
};

export const demoAssetRoots = {
  approvedReference: "/assets/reference/",
  vitaflow: "/assets/demos/vitaflow/",
  videos: "/assets/videos/higgsfield/",
  posters: "/assets/posters/higgsfield/",
  heroLoops: "/assets/loops/hero/",
} as const;

export const approvedVitaKioskReference: DemoMedia = {
  id: "vitakiosk-approved-reference",
  title: "Approved VitaKiosk demo screenshot reference",
  src: media.approvedKioskReference,
  alt: "Approved local VitaKiosk UI screenshot reference showing the dark kiosk layout, product panel, shelf navigation, promotion cards, and assistance panel.",
  kind: "approved_reference",
  channel: "reference",
  label: "Approved Reference",
  notes: "Visual reference only. The public site demo is implemented as interactive React UI and must not depend on this image as a flat screen.",
  aspect: "landscape",
  replacementPath: "apps/site/public/assets/reference/vitakiosk-demo-approved.png",
};

export const vitaflowAssets = {
  screenshots: [
    {
      id: "vitaflow-dashboard-placeholder",
      title: "VitaFlow ERP dashboard",
      src: media.vitaflowDashboard,
      alt: "Placeholder VitaFlow ERP dashboard surface awaiting safe demo capture.",
      kind: "placeholder",
      channel: "screenshot",
      label: "Placeholder",
      notes: "Replace only with safe, non-private ERP demo data.",
      aspect: "landscape",
      replacementPath: "apps/site/public/assets/demos/vitaflow/dashboard.svg",
    },
    {
      id: "vitaflow-inventory-placeholder",
      title: "Inventory and stock movement",
      src: media.vitaflowInventory,
      alt: "Placeholder VitaFlow inventory and stock movement interface.",
      kind: "placeholder",
      channel: "screenshot",
      label: "Placeholder",
      notes: "Safe conceptual placeholder for branch-aware stock movement.",
      aspect: "landscape",
      replacementPath: "apps/site/public/assets/demos/vitaflow/inventory.svg",
    },
    {
      id: "vitaflow-purchase-placeholder",
      title: "Purchase workflow",
      src: media.vitaflowPurchase,
      alt: "Placeholder VitaFlow purchase workflow interface.",
      kind: "placeholder",
      channel: "screenshot",
      label: "Placeholder",
      notes: "Safe conceptual placeholder for purchase workflow.",
      aspect: "landscape",
      replacementPath: "apps/site/public/assets/demos/vitaflow/purchase.svg",
    },
    {
      id: "vitaflow-promotion-placeholder",
      title: "Promotion and price monitor",
      src: media.vitaflowPromotion,
      alt: "Placeholder VitaFlow promotion and price monitoring interface.",
      kind: "placeholder",
      channel: "screenshot",
      label: "Placeholder",
      notes: "Safe conceptual placeholder for reviewed promotions.",
      aspect: "landscape",
      replacementPath: "apps/site/public/assets/demos/vitaflow/promotion.svg",
    },
    {
      id: "vitaflow-follow-up-placeholder",
      title: "Customer follow-up",
      src: media.vitaflowFollowUp,
      alt: "Placeholder VitaFlow customer follow-up interface.",
      kind: "placeholder",
      channel: "screenshot",
      label: "Placeholder",
      notes: "Safe conceptual placeholder; replace only with demo data.",
      aspect: "landscape",
      replacementPath: "apps/site/public/assets/demos/vitaflow/follow-up.svg",
    },
  ] satisfies DemoMedia[],
  poster: {
    id: "vitaflow-poster-placeholder",
    title: "VitaFlow source-of-truth poster",
    src: media.vitaflowPoster,
    alt: "Placeholder VitaFlow source-of-truth poster.",
    kind: "placeholder",
    channel: "poster",
    label: "Placeholder",
    notes: "Use until a safe ERP poster or capture is approved.",
    aspect: "landscape",
    replacementPath: "apps/site/public/assets/demos/vitaflow/poster.svg",
  } satisfies DemoMedia,
};

export const demoVideoAssets = {
  clinicQueue: {
    poster: media.videoClinicQueuePoster,
    previewSrc: media.videoClinicQueue,
    fullSrc: media.videoClinicQueue,
  },
  pharmacyPartner: {
    poster: media.videoPartnerPoster,
    previewSrc: media.videoPartner,
    fullSrc: media.videoPartner,
  },
  retailPromotion: {
    poster: media.videoRetailPoster,
    previewSrc: media.videoRetail,
    fullSrc: media.videoRetail,
  },
  vitakioskInteractive: {
    poster: media.videoKioskPoster,
    previewSrc: media.videoKiosk,
    fullSrc: media.videoKiosk,
  },
  vitaflowSource: {
    poster: media.videoVitaflowPoster,
    previewSrc: media.videoVitaflow,
    fullSrc: media.videoVitaflow,
  },
  aiWebsite: {
    poster: media.videoWebsitePoster,
    previewSrc: media.videoWebsite,
    fullSrc: media.videoWebsite,
  },
  aiAcademy: {
    poster: media.videoAcademyPoster,
    previewSrc: media.videoAcademy,
    fullSrc: media.videoAcademy,
  },
} as const;

export const demoAssets = {
  approvedVitaKioskReference,
  vitaflow: vitaflowAssets,
  videos: demoVideoAssets,
};
