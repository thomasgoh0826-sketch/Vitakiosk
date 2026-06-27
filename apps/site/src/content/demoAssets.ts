import kioskIpadHome from "../../../../reports/evidence/dark-neon-kiosk-ipad-landscape.png?url";
import kioskLarge from "../../../../reports/evidence/responsive-kiosk-1366x768.png?url";
import productDetail from "../../../../reports/evidence/product-summary-transform-1024x768.png?url";
import leafletEnlarged from "../../../../reports/evidence/leaflet-overlay-1024x768-foreground.png?url";
import shelfMap from "../../../../reports/evidence/shelf-map-ipad-landscape.png?url";
import avatarVrm from "../../../../reports/evidence/vrm-avatar-vita-new-1024x768.png?url";
import kioskConcept from "../../../../assets/design/vitakiosk-kiosk-concept.png?url";

export type DemoAssetKind = "real_capture" | "placeholder" | "concept";

export interface DemoMedia {
  id: string;
  title: string;
  src: string;
  alt: string;
  kind: DemoAssetKind;
  label: string;
  notes: string;
  aspect: "landscape" | "portrait" | "square";
}

const erpPlaceholder =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720' viewBox='0 0 1280 720'%3E%3Crect width='1280' height='720' fill='%2306121c'/%3E%3Cpath d='M80 540 C260 420 360 480 520 330 C700 160 860 240 1120 130' fill='none' stroke='%2334f4e7' stroke-width='8' stroke-linecap='round' opacity='.72'/%3E%3Crect x='120' y='110' width='1040' height='500' rx='24' fill='%23091420' stroke='%2328c7d7' stroke-width='2'/%3E%3Ctext x='170' y='190' font-family='Arial' font-size='40' font-weight='700' fill='%23eff8ff'%3EVitaFlow ERP%3C/text%3E%3Ctext x='170' y='246' font-family='Arial' font-size='24' fill='%239ee9e6'%3EPlaceholder dashboard - replace with safe ERP demo capture%3C/text%3E%3Crect x='170' y='310' width='220' height='110' rx='12' fill='%230d2432' stroke='%2328c7d7'/%3E%3Crect x='430' y='310' width='220' height='110' rx='12' fill='%230d2432' stroke='%2328c7d7'/%3E%3Crect x='690' y='310' width='220' height='110' rx='12' fill='%230d2432' stroke='%2328c7d7'/%3E%3Crect x='170' y='460' width='740' height='50' rx='8' fill='%230a1a28' stroke='%23145369'/%3E%3C/svg%3E";

export const demoAssets = {
  vitakiosk: {
    ipadScreenshots: [
      {
        id: "kiosk-ipad-home",
        title: "VitaKiosk iPad home",
        src: kioskIpadHome,
        alt: "Current VitaKiosk iPad landscape mock demo with VRM assistant, product panel, shelf map, promotion leaflet, and pharmacist assistance.",
        kind: "real_capture",
        label: "Internal Lab Build",
        notes: "Captured from the existing 5175 kiosk mock demo with fictional mock data.",
        aspect: "landscape",
      },
      {
        id: "kiosk-product-detail",
        title: "Product detail enlarge",
        src: productDetail,
        alt: "VitaKiosk enlarged product detail and summary state for a fictional Relief Balm mock product.",
        kind: "real_capture",
        label: "Internal Lab Build",
        notes: "Shows the current product detail interaction with mock VitaFlow facts.",
        aspect: "landscape",
      },
      {
        id: "kiosk-leaflet-enlarged",
        title: "Promotion leaflet enlarged",
        src: leafletEnlarged,
        alt: "VitaKiosk enlarged fictional promotion leaflet overlay using no medical claim.",
        kind: "real_capture",
        label: "Internal Lab Build",
        notes: "Fictional branch-valid leaflet evidence from the existing demo.",
        aspect: "landscape",
      },
      {
        id: "kiosk-shelf-route",
        title: "Shelf navigation",
        src: shelfMap,
        alt: "VitaKiosk shelf navigation route from entrance to Aisle 03 and Shelf A-03.",
        kind: "real_capture",
        label: "Internal Lab Build",
        notes: "Route guidance display from the current kiosk mock.",
        aspect: "landscape",
      },
      {
        id: "kiosk-avatar-vrm",
        title: "VRM assistant",
        src: avatarVrm,
        alt: "VitaKiosk VRM assistant inside the current dark neon kiosk interface.",
        kind: "real_capture",
        label: "Internal Lab Build",
        notes: "Avatar renderer proof with mock mode and no customer data.",
        aspect: "landscape",
      },
    ] satisfies DemoMedia[],
    largeKioskScreenshots: [
      {
        id: "kiosk-large-dashboard",
        title: "Large kiosk layout",
        src: kioskLarge,
        alt: "Large landscape VitaKiosk demo layout with assistant, product facts, promotion, ERP provenance, and staff escalation.",
        kind: "real_capture",
        label: "Internal Lab Build",
        notes: "Responsive current kiosk capture for large-format presentation.",
        aspect: "landscape",
      },
    ] satisfies DemoMedia[],
    videos: [] as DemoMedia[],
  },
  vitaflow: {
    screenshots: [
      {
        id: "vitaflow-dashboard-placeholder",
        title: "VitaFlow ERP dashboard",
        src: erpPlaceholder,
        alt: "Placeholder VitaFlow ERP dashboard surface awaiting safe demo capture.",
        kind: "placeholder",
        label: "Placeholder",
        notes: "Replace only with safe, non-private ERP demo data. Do not use customer, sales, or protected release files.",
        aspect: "landscape",
      },
    ] satisfies DemoMedia[],
    videos: [] as DemoMedia[],
  },
  showcasePosters: [
    {
      id: "kiosk-concept-poster",
      title: "VitaKiosk concept poster",
      src: kioskConcept,
      alt: "Cinematic VitaKiosk kiosk concept artwork used as a product showcase wrapper.",
      kind: "concept",
      label: "Concept",
      notes: "Concept wrapper only; real demo screens are managed separately.",
      aspect: "landscape",
    },
  ] satisfies DemoMedia[],
};

export const videoHubAssets = [
  {
    id: "clinic-queue-problem",
    title: "Clinic Queue Problem",
    poster: erpPlaceholder,
    category: "problem",
    label: "Storyboard Placeholder",
    duration: "20s concept",
    summary: "A busy front desk becomes a product education handoff before the counter.",
  },
  {
    id: "pharmacy-partner-discovery",
    title: "Pharmacy Partner Discovery",
    poster: kioskConcept,
    category: "partner",
    label: "Prompt Ready",
    duration: "20s concept",
    summary: "Connect product interest to participating pharmacy partners without endorsement claims.",
  },
  {
    id: "retail-pharmacy-promotion",
    title: "Retail Pharmacy Promotion",
    poster: leafletEnlarged,
    category: "retail",
    label: "Internal Lab Build",
    duration: "20s concept",
    summary: "Turn silent promotions into guided product discovery with reviewed sponsored education.",
  },
  {
    id: "vitakiosk-in-action",
    title: "VitaKiosk in Action",
    poster: kioskLarge,
    category: "demo",
    label: "Internal Lab Build",
    duration: "Capture target",
    summary: "Voice, fuzzy search, product detail, shelf path, and pharmacist escalation.",
  },
  {
    id: "vitaflow-dashboard",
    title: "VitaFlow Dashboard",
    poster: erpPlaceholder,
    category: "erp",
    label: "Placeholder",
    duration: "Capture target",
    summary: "Replace with safe demo dashboard footage only.",
  },
  {
    id: "ai-website-studio",
    title: "AI Website Studio",
    poster: erpPlaceholder,
    category: "growth",
    label: "Storyboard Placeholder",
    duration: "20s concept",
    summary: "Outdated site transforms into a lead-ready AI website.",
  },
  {
    id: "ai-academy",
    title: "AI Academy",
    poster: kioskConcept,
    category: "training",
    label: "Storyboard Placeholder",
    duration: "20s concept",
    summary: "Random AI use becomes a practical business workflow.",
  },
];
