export type AvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "pharmacist_escalation";

export type AvatarExpressionState =
  | "neutral_idle"
  | "friendly_explaining"
  | "happy_highlight"
  | "focused_guidance"
  | "safety_alert";

export type AvatarFocusTarget =
  | "center"
  | "product"
  | "promotion"
  | "shelf"
  | "pharmacist";

export interface AvatarPresentation {
  expression: AvatarExpressionState;
  focusTarget: AvatarFocusTarget;
  gesture: "none" | "present_product" | "present_promotion" | "guide_shelf" | "safety_handoff";
}

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
  source: "mock_vitaflow" | "vitaflow_erp";
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
  location?: ProductLocation | null;
}

export interface ProductLocation {
  regionName: string | null;
  areaZone: string | null;
  shelfRackBay: string | null;
  rowLevel: string | null;
  binPosition: string | null;
  locationCode: string | null;
  locationNote: string | null;
  pinX: number | null;
  pinY: number | null;
}

export interface ShelfMapPoint {
  x: number;
  y: number;
  label: string;
}

export interface ShelfMapRegion {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string | null;
  color?: string | null;
  shape?: "rounded" | "square" | "pill";
  rotation?: number;
  z_index?: number;
  layer_kind?: string | null;
}

export interface BranchShelfMap {
  branch_id: string;
  map_id: string;
  name: string;
  source: "mock_vitaflow" | "vitaflow_erp";
  image_url: string | null;
  entrance: ShelfMapPoint | null;
  regions: ShelfMapRegion[];
  unavailable_reason: string | null;
}

export interface ShelfMapResponse {
  map: BranchShelfMap | null;
  source: string;
  unavailable_reason: string | null;
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
  purchasingQueryId: string | null;
  purchasingRequestStatus: string | null;
}

export interface Promotion {
  id: string;
  title: string;
  branch_id: string;
  product_ids?: string[];
  active: boolean;
  valid_from: string;
  valid_to: string;
  source: "mock_vitaflow" | "vitaflow_erp";
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
  source: "mock_vitaflow" | "vitaflow_erp";
}

export type UiAction =
  | { type: "SHOW_PRODUCT"; productId: string }
  | { type: "HIGHLIGHT_PRODUCT"; productId: string }
  | { type: "OPEN_PRODUCT_DETAIL"; productId: string }
  | { type: "OPEN_PRODUCT_SUMMARY"; productId: string }
  | { type: "SHOW_PROMOTION_LEAFLET"; promotionId: string }
  | { type: "HIGHLIGHT_PROMOTION"; productId?: string; promotionId?: string }
  | { type: "OPEN_PROMOTION_LEAFLET"; promotionId: string }
  | { type: "OPEN_PROMOTION_MODAL"; productId?: string; promotionId?: string }
  | { type: "SHOW_CAMPAIGN_LEAFLET"; campaignId: string }
  | { type: "OPEN_CAMPAIGN_LEAFLET"; campaignId: string }
  | { type: "OPEN_CAMPAIGN_MODAL"; campaignId: string }
  | { type: "SHOW_PROMOTION_GALLERY" }
  | { type: "SHOW_CAMPAIGN_GALLERY" }
  | { type: "SHOW_LEAFLET_GALLERY" }
  | { type: "HIGHLIGHT_SHELF_ROUTE"; productId: string; shelf?: string | null }
  | { type: "OPEN_SHELF_MAP"; productId: string; shelf?: string | null }
  | { type: "OPEN_PRODUCT_SCAN" }
  | { type: "START_PRODUCT_SCAN" }
  | { type: "ASK_PHARMACIST_CONFIRMATION" }
  | { type: "REQUEST_PHARMACIST_ASSISTANCE"; reason?: string | null }
  | { type: "CLOSE_ACTIVE_OVERLAY" }
  | { type: "RESET_KIOSK" };

export interface Poster {
  id: string;
  title: string;
  branch_id: string;
  promotion_id: string;
  asset_path: string;
  source: "mock_vitaflow" | "vitaflow_erp";
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
    | "greeting"
    | "general_conversation"
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
  agnes_reachable: boolean;
  vitaflow_reachable: boolean;
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
  purchasing_request_status?: string | null;
  message?: string | null;
}

export interface MockActionResponse {
  id: string;
  status: string;
  source: "mock_memory" | "vitaflow_erp";
}
