import { vitaflowAssets } from "./demoAssets";

export interface ShowcaseScene {
  id: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  copy: string;
  cta: string;
  href: string;
  visual: "kiosk" | "tablet" | "erp" | "website" | "academy";
  accent: "cyan" | "violet" | "green" | "amber" | "blue";
  media?: string;
}

export const showcaseScenes: ShowcaseScene[] = [
  {
    id: "vitakiosk-ipad",
    title: "Product education before the counter.",
    shortTitle: "iPad",
    eyebrow: "VitaKiosk iPad",
    copy: "Tap, search, scan, enlarge, route, and request staff help inside a safe simulated kiosk flow.",
    cta: "Try the demo",
    href: "#interactive-demo",
    visual: "tablet",
    accent: "cyan",
  },
  {
    id: "vitakiosk-large",
    title: "A large kiosk that feels alive.",
    shortTitle: "Kiosk",
    eyebrow: "Large kiosk",
    copy: "The same product education surface expands for waiting areas, counters, and campaign placements.",
    cta: "Explore kiosk",
    href: "/vitakiosk",
    visual: "kiosk",
    accent: "violet",
  },
  {
    id: "vitaflow-erp",
    title: "ERP remains the source of truth.",
    shortTitle: "ERP",
    eyebrow: "VitaFlow ERP",
    copy: "Product, stock, shelf, price, and campaign facts stay tied to mock VitaFlow data until live connectors are reviewed.",
    cta: "View VitaFlow",
    href: "/vitaflow",
    visual: "erp",
    accent: "amber",
    media: vitaflowAssets.screenshots[0].src,
  },
  {
    id: "ai-website",
    title: "Your website becomes a growth surface.",
    shortTitle: "Website",
    eyebrow: "AI Website Studio",
    copy: "Lead capture, booking, chatbot, maintenance, and launch support sit in the same operating system.",
    cta: "Start website",
    href: "/ai-website-studio",
    visual: "website",
    accent: "blue",
  },
  {
    id: "ai-academy",
    title: "Teams learn the workflow, not just prompts.",
    shortTitle: "Academy",
    eyebrow: "AI Academy",
    copy: "Lessons cover Codex builds, prompt workflow, automation, content, and pharmacy AI operations.",
    cta: "Book lesson",
    href: "/ai-academy",
    visual: "academy",
    accent: "green",
  },
];
