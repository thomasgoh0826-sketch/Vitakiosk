export type DemoMode =
  | "idle"
  | "listening"
  | "fuzzy"
  | "promotion"
  | "product"
  | "shelf"
  | "scan"
  | "assist";

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
  response: "Relief Balm is available at Shelf A-03. Product education only.",
  fuzzy: "Do you mean Relief Balm?",
  scan: "Packaging detected. Select a VitaFlow-backed candidate.",
  assist: "A pharmacist or staff member can assist you.",
};

export const demoHotspots = [
  { id: "voice", label: "Tap to Speak", mode: "listening" as DemoMode },
  { id: "product", label: "Product panel", mode: "product" as DemoMode },
  { id: "promotion", label: "Promotion leaflet", mode: "promotion" as DemoMode },
  { id: "shelf", label: "Shelf map", mode: "shelf" as DemoMode },
  { id: "scan", label: "Scan Product", mode: "scan" as DemoMode },
  { id: "assist", label: "Request assistance", mode: "assist" as DemoMode },
];
