export type DemoAssetKind = "approved_reference" | "placeholder" | "generated" | "concept";
export type DemoAssetChannel = "reference" | "poster" | "video" | "loop" | "screenshot" | "avatar" | "model3d";

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
  previewType?: "video/webm" | "video/mp4";
  fullType?: "video/webm" | "video/mp4";
  duration: string;
  summary: string;
  category: string;
  status: "Storyboard" | "Prompt Ready" | "Internal Lab Build" | "Placeholder" | "Demo Capture";
}

const media = {
  approvedKioskReference: "/assets/reference/vitakiosk-demo-approved.png",
  aiPharmacyAssistantAvatar: "/assets/avatar/ai-pharmacy-assistant-avatar.png",
  vitakioskTabletModel: "/assets/3d/vitakiosk-tablet.glb",
  vitakioskKioskModel: "/assets/3d/vitakiosk-kiosk.glb",
  vitaflowDashboard: "/assets/demos/vitaflow/dashboard.svg",
  vitaflowInventory: "/assets/demos/vitaflow/inventory.svg",
  vitaflowPurchase: "/assets/demos/vitaflow/purchase.svg",
  vitaflowPromotion: "/assets/demos/vitaflow/promotion.svg",
  vitaflowFollowUp: "/assets/demos/vitaflow/follow-up.svg",
  vitaflowPoster: "/assets/demos/vitaflow/poster.svg",
  vitaflowOrbitReports: "/assets/demos/vitaflow/orbit/reports.png",
  vitaflowOrbitPosCheckout: "/assets/demos/vitaflow/orbit/pos-checkout.png",
  vitaflowOrbitHqLive: "/assets/demos/vitaflow/orbit/hq-live.png",
  videoClinicQueuePoster: "/assets/posters/jimeng/clinic-queue-problem-storyboard.jpg",
  videoPartnerPoster: "/assets/posters/jimeng/pharmacy-partner-discovery-15s.jpg",
  videoRetailPoster: "/assets/posters/jimeng/retail-pharmacy-promotion-15s.jpg",
  videoKioskPoster: "/assets/posters/higgsfield/vitakiosk-interactive-demo.svg",
  videoVitaflowPoster: "/assets/posters/higgsfield/vitaflow-source-of-truth.svg",
  videoWebsitePoster: "/assets/posters/higgsfield/ai-website-studio.svg",
  videoAcademyPoster: "/assets/posters/jimeng/ai-academy-32s.jpg",
  videoClinicQueue: "/assets/videos/jimeng/clinic-queue-problem-storyboard.mp4",
  videoPartner: "/assets/videos/jimeng/pharmacy-partner-discovery-15s.mp4",
  videoRetail: "/assets/videos/jimeng/retail-pharmacy-promotion-15s.mp4",
  videoKiosk: "/assets/videos/higgsfield/vitakiosk-interactive-demo.webm",
  videoVitaflow: "/assets/videos/higgsfield/vitaflow-source-of-truth.webm",
  videoWebsite: "/assets/videos/higgsfield/ai-website-studio.webm",
  videoAcademy: "/assets/videos/jimeng/ai-academy-32s.mp4",
};

export const demoAssetRoots = {
  approvedReference: "/assets/reference/",
  avatars: "/assets/avatar/",
  vitaflow: "/assets/demos/vitaflow/",
  videos: "/assets/videos/higgsfield/",
  jimengVideos: "/assets/videos/jimeng/",
  posters: "/assets/posters/higgsfield/",
  jimengPosters: "/assets/posters/jimeng/",
  heroLoops: "/assets/loops/hero/",
  models: "/assets/3d/",
} as const;

export const aiPharmacyAssistantAvatar: DemoMedia = {
  id: "ai-pharmacy-assistant-avatar",
  title: "AI Pharmacy Assistant avatar",
  src: media.aiPharmacyAssistantAvatar,
  alt: "AI Pharmacy Assistant avatar in the VitaKiosk demo.",
  kind: "approved_reference",
  channel: "avatar",
  label: "Approved Avatar",
  notes: "User-approved avatar image for the public interactive VitaKiosk mini app.",
  aspect: "portrait",
  replacementPath: "apps/site/public/assets/avatar/ai-pharmacy-assistant-avatar.png",
};

export const approvedVitaKioskReference: DemoMedia = {
  id: "vitakiosk-approved-reference",
  title: "Approved VitaKiosk demo screenshot reference",
  src: media.approvedKioskReference,
  alt: "Approved local VitaKiosk UI screenshot reference showing the dark kiosk layout, product panel, shelf navigation, promotion cards, and assistance panel.",
  kind: "approved_reference",
  channel: "reference",
  label: "Approved Reference",
  notes: "Approved public website visual for the demo stage. The live interactive local demo opens separately from the 5177 link.",
  aspect: "landscape",
  replacementPath: "apps/site/public/assets/reference/vitakiosk-demo-approved.png",
};

export const vitakioskTabletModel: DemoMedia = {
  id: "vitakiosk-tablet-3d-model",
  title: "VitaKiosk tablet 3D model",
  src: media.vitakioskTabletModel,
  alt: "Draggable 3D tablet model showing the VitaKiosk AI Pharmacy Assistant interface.",
  kind: "generated",
  channel: "model3d",
  label: "3D Model",
  notes: "Meshy-generated GLB model for the Tablet showcase scene. Keep web exports optimized before replacing.",
  aspect: "landscape",
  replacementPath: "apps/site/public/assets/3d/vitakiosk-tablet.glb",
};

export const vitakioskKioskModel: DemoMedia = {
  id: "vitakiosk-kiosk-3d-model",
  title: "VitaKiosk large kiosk 3D model",
  src: media.vitakioskKioskModel,
  alt: "Draggable 3D large VitaKiosk model for waiting areas and campaign placements.",
  kind: "generated",
  channel: "model3d",
  label: "3D Model",
  notes: "Meshy-generated GLB model for the Large Kiosk showcase scene. Compress if mobile loading becomes slow.",
  aspect: "landscape",
  replacementPath: "apps/site/public/assets/3d/vitakiosk-kiosk.glb",
};


export const vitaflowAssets = {
  orbitScreenshots: [
    {
      id: "vitaflow-orbit-reports",
      title: "Reports screen",
      src: media.vitaflowOrbitReports,
      alt: "VitaFlow ERP reports screen with sales, profit, date filters, and report panels.",
      kind: "approved_reference",
      channel: "screenshot",
      label: "Reports",
      notes: "User-provided ERP screenshot for the website cylindrical media orbit.",
      aspect: "landscape",
      replacementPath: "apps/site/public/assets/demos/vitaflow/orbit/reports.png",
    },
    {
      id: "vitaflow-orbit-pos-checkout",
      title: "POS Checkout screen",
      src: media.vitaflowOrbitPosCheckout,
      alt: "VitaFlow POS checkout screen with basket controls, payment panel, and checkout summary.",
      kind: "approved_reference",
      channel: "screenshot",
      label: "POS Checkout",
      notes: "User-provided ERP screenshot for the website cylindrical media orbit.",
      aspect: "landscape",
      replacementPath: "apps/site/public/assets/demos/vitaflow/orbit/pos-checkout.png",
    },
    {
      id: "vitaflow-orbit-hq-live",
      title: "HQ Live screen",
      src: media.vitaflowOrbitHqLive,
      alt: "VitaFlow HQ Live screen with branch sales, margin, reservations, transfers, and weekly comparison.",
      kind: "approved_reference",
      channel: "screenshot",
      label: "HQ Live",
      notes: "User-provided ERP screenshot for the website cylindrical media orbit.",
      aspect: "landscape",
      replacementPath: "apps/site/public/assets/demos/vitaflow/orbit/hq-live.png",
    },
  ] satisfies DemoMedia[],
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
    previewType: "video/mp4",
    fullType: "video/mp4",
  },
  pharmacyPartner: {
    poster: media.videoPartnerPoster,
    previewSrc: media.videoPartner,
    fullSrc: media.videoPartner,
    previewType: "video/mp4",
    fullType: "video/mp4",
  },
  retailPromotion: {
    poster: media.videoRetailPoster,
    previewSrc: media.videoRetail,
    fullSrc: media.videoRetail,
    previewType: "video/mp4",
    fullType: "video/mp4",
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
    previewType: "video/mp4",
    fullType: "video/mp4",
  },
} as const;

export const demoAssets = {
  aiPharmacyAssistantAvatar,
  approvedVitaKioskReference,
  vitakioskTabletModel,
  vitakioskKioskModel,
  vitaflow: vitaflowAssets,
  videos: demoVideoAssets,
};
