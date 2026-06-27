export type DemoState =
  | "idle"
  | "listening"
  | "answering"
  | "fuzzy_match"
  | "product_enlarged"
  | "promotion_open"
  | "shelf_route"
  | "scan_product"
  | "pharmacist_handoff";

export type DemoMode = DemoState;
export type DemoLanguage = "en" | "zh" | "bm";

export const demoProduct = {
  name: "Relief Balm",
  sku: "MOCK-P001",
  price: "$12.50",
  stock: "18",
  branch: "SG-001",
  shelf: "A-03",
  source: "Mock VitaFlow",
  summary: "Cooling relief balm. Easy to apply. For external use only.",
  details: [
    ["Ingredient", "Menthol, camphor, herbal soothing ingredients"],
    ["How to use", "Apply externally to the affected area as needed."],
    ["Best for", "Muscle discomfort, shoulder tension, general soothing use."],
    ["Size", "30g"],
  ],
};

export const demoTranscriptStates = {
  idle: "Tap to Speak to ask about products, stock, promotions, or shelf location.",
  listening: "Listening... Where is Relief Balm?",
  answering: "Relief Balm is available at Shelf A-03. Product education and pharmacist assistance are available.",
  fuzzy_match: "Do you mean Relief Balm?",
  scan_product: "Packaging detected. Best match: Relief Balm.",
  pharmacist_handoff: "A pharmacist or staff member can assist you.",
};

export const demoLanguageLabels: Record<DemoLanguage, { ready: string; response: string; selected: string }> = {
  en: {
    ready: "Ready",
    response: "Product education and guidance only.",
    selected: "EN selected",
  },
  zh: {
    ready: "准备就绪",
    response: "仅提供产品教育与导购指引。",
    selected: "中文 selected",
  },
  bm: {
    ready: "Sedia",
    response: "Pendidikan produk dan panduan sahaja.",
    selected: "BM selected",
  },
};

export const demoHotspots = [
  { id: "voice", label: "Tap to Speak", mode: "listening" as DemoMode },
  { id: "product", label: "Product panel", mode: "product_enlarged" as DemoMode },
  { id: "promotion", label: "Promotion leaflet", mode: "promotion_open" as DemoMode },
  { id: "shelf", label: "Shelf navigation map", mode: "shelf_route" as DemoMode },
  { id: "scan", label: "Scan Product", mode: "scan_product" as DemoMode },
  { id: "assist", label: "Request assistance", mode: "pharmacist_handoff" as DemoMode },
];
