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
