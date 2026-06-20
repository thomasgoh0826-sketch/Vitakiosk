export type AvatarState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "pharmacist_escalation";

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
    | "shelf_location"
    | "unknown_product"
    | "red_flag";
  message: string;
  requires_pharmacist: boolean;
  product: Product | null;
  promotions: Promotion[];
  purchasing_query_id: string | null;
  escalation_id: string | null;
  safety_reason: string | null;
  source: string;
}

export interface TranscriptionResponse {
  transcript: string;
  provider: "mock_stt";
}

export interface ItemListResponse<T> {
  items: T[];
  source: string;
}

export interface ProductSearchResponse extends ItemListResponse<Product> {
  purchasing_query_id: string | null;
}

export interface MockActionResponse {
  id: string;
  status: string;
  source: "mock_memory";
}
