export type AvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "pharmacist_escalation";

export interface LocalizedProductText {
  en: string;
  zh?: string;
  ms?: string;
}

export interface ProductSummary {
  ingredient: LocalizedProductText;
  howToUse: LocalizedProductText;
  bestFor: LocalizedProductText;
  size: LocalizedProductText;
  description: LocalizedProductText;
}

export interface Product {
  id: string;
  name: string;
  aliases?: string[];
  branch_id: string;
  price: number | null;
  stock: number | null;
  shelf_location: string | null;
  source: "mock_vitaflow";
  unavailable_reason: string | null;
  productSummary?: Partial<ProductSummary>;
  barcode?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  images?: Array<{
    url: string;
    type: string;
    isPrimary: boolean;
    alt?: string | null;
  }>;
}

export interface ProductSearchCandidate {
  product: Product;
  confidence: number;
  match_reason: string;
  matched_text: string;
}

export interface ProductScanCandidate {
  product: Product;
  confidence: number;
  matchReason: string;
  matchedText: string | null;
}

export interface ProductScanResponse {
  ok: boolean;
  provider: string;
  scanSignals: {
    barcode: string | null;
    imageSimilarity: boolean;
    ocr: boolean;
  };
  candidates: ProductScanCandidate[];
  requiresConfirmation: boolean;
  message: string;
  barcodeResult: string | null;
  ocrText: string | null;
  correctedText: string | null;
}

export interface Promotion {
  id: string;
  title: string;
  branch_id: string;
  product_ids?: string[];
  active: boolean;
  valid_from: string;
  valid_to: string;
  source: "mock_vitaflow";
}

export type LeafletKind = "promotion" | "campaign";

export interface Leaflet {
  id: string;
  kind: LeafletKind;
  title: string;
  description: string;
  branch_id: string;
  active: boolean;
  valid_from: string;
  valid_to: string;
  image_url: string;
  product_ids: string[];
  category_tags: string[];
  display_priority: number;
  source: "mock_vitaflow";
}

export type UiAction =
  | { type: "SHOW_PRODUCT"; productId: string }
  | { type: "SHOW_PROMOTION_LEAFLET"; promotionId: string }
  | { type: "OPEN_PROMOTION_LEAFLET"; promotionId: string }
  | { type: "OPEN_PROMOTION_MODAL"; promotionId: string }
  | { type: "SHOW_CAMPAIGN_LEAFLET"; campaignId: string }
  | { type: "OPEN_CAMPAIGN_LEAFLET"; campaignId: string }
  | { type: "OPEN_CAMPAIGN_MODAL"; campaignId: string }
  | { type: "SHOW_PROMOTION_GALLERY" }
  | { type: "SHOW_CAMPAIGN_GALLERY" }
  | { type: "SHOW_LEAFLET_GALLERY" }
  | { type: "ASK_PHARMACIST_CONFIRMATION" }
  | { type: "REQUEST_PHARMACIST_ASSISTANCE" }
  | { type: "RESET_KIOSK" };

export interface Poster {
  id: string;
  title: string;
  branch_id: string;
  promotion_id: string;
  asset_path: string;
  source: "mock_vitaflow";
}

export interface AvatarStateEvent {
  type: "avatar_state";
  session_id: string;
  state: AvatarState;
  detail: string;
}

export interface AIResponse {
  intent:
    | "product_search"
    | "product_counselling"
    | "price_check"
    | "stock_check"
    | "promotion_check"
    | "campaign_check"
    | "shelf_location"
    | "unknown_product"
    | "red_flag";
  message: string;
  requires_pharmacist: boolean;
  product: Product | null;
  product_candidates: ProductSearchCandidate[];
  promotions: Promotion[];
  leaflets: Leaflet[];
  ui_actions: UiAction[];
  purchasing_query_id: string | null;
  escalation_id: string | null;
  safety_reason: string | null;
  source: string;
}

export interface ProviderSummary {
  stt: string;
  tts: string;
  ai: string;
  vitaflow: string;
  vision: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  provider_mode: string;
  provider_summary: ProviderSummary;
}

export interface RuntimeStatusResponse {
  stt_provider: string;
  ai_provider: string;
  tts_provider: string;
  vitaflow_provider: string;
  vision_provider: string;
  ollama_reachable: boolean;
  model: string;
}

export type TranscriptionLanguage =
  | "english"
  | "chinese"
  | "malay"
  | "mixed"
  | "unknown";

export interface TranscriptionResponse {
  transcript: string;
  provider: "mock_stt" | "openai_whisper" | "faster_whisper";
  language: TranscriptionLanguage;
  confidence: number | null;
  clarification_needed: boolean;
  corrected_transcript: string;
  detected_terms: string[];
  possible_product_matches: Array<{
    id: string | null;
    name: string;
    kind: string;
    confidence: number;
    source: string;
  }>;
}

export interface ItemListResponse<T> {
  items: T[];
  source: string;
}

export interface ProductSearchResponse extends ItemListResponse<Product> {
  candidates: ProductSearchCandidate[];
  purchasing_query_id: string | null;
}

export interface MockActionResponse {
  id: string;
  status: string;
  source: "mock_memory";
}
