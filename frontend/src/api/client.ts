import type {
  AIResponse,
  HealthResponse,
  ItemListResponse,
  Leaflet,
  MockActionResponse,
  Poster,
  ProductScanResponse,
  ProductSearchResponse,
  Promotion,
  RuntimeStatusResponse,
  ShelfMapResponse,
  TranscriptionResponse,
} from "../types";
import type { PreferredLanguage } from "../i18n";


const DEFAULT_API_BASE_URL = "http://localhost:8000";

export function resolveApiBaseUrl(value: string | undefined): string {
  if (value && value !== "auto") {
    return value;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_API_BASE_URL;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface VitaKioskApiClient {
  health?(): Promise<HealthResponse>;
  runtimeStatus?(): Promise<RuntimeStatusResponse>;
  transcribe(audio: Blob, sessionId: string): Promise<TranscriptionResponse>;
  respond(
    sessionId: string,
    text: string,
    branchId: string,
    preferredLanguage?: PreferredLanguage,
    currentProductId?: string,
  ): Promise<AIResponse>;
  synthesize(sessionId: string, text: string): Promise<Blob>;
  searchProducts(query: string, branchId: string): Promise<ProductSearchResponse>;
  scanProduct(image: Blob, branchId: string, mode?: string): Promise<ProductScanResponse>;
  matchPromotions(productId: string, branchId: string): Promise<ItemListResponse<Promotion>>;
  activeLeaflets?(branchId: string): Promise<ItemListResponse<Leaflet>>;
  idlePosters(branchId: string): Promise<ItemListResponse<Poster>>;
  shelfMap?(branchId: string): Promise<ShelfMapResponse>;
  createPurchasingQuery(query: string, branchId: string): Promise<MockActionResponse>;
  escalatePharmacist(reason: string, branchId: string, sessionId?: string): Promise<MockActionResponse>;
}

async function safeErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown; message?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    return typeof payload.message === "string" ? payload.message : "Request failed";
  } catch {
    return "Request failed";
  }
}

export class VitaKioskApi implements VitaKioskApiClient {
  constructor(private readonly baseUrl = DEFAULT_API_BASE_URL) {}

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      throw new ApiError(await safeErrorMessage(response), response.status);
    }
    return (await response.json()) as T;
  }

  health(): Promise<HealthResponse> {
    return this.json("/health");
  }

  runtimeStatus(): Promise<RuntimeStatusResponse> {
    return this.json("/api/runtime/status");
  }

  async transcribe(audio: Blob, sessionId: string): Promise<TranscriptionResponse> {
    const form = new FormData();
    form.append("session_id", sessionId);
    form.append("audio", audio, "voice.webm");
    return this.json("/api/voice/transcribe", { method: "POST", body: form });
  }

  respond(
    sessionId: string,
    text: string,
    branchId: string,
    preferredLanguage: PreferredLanguage = "auto",
    currentProductId?: string,
  ): Promise<AIResponse> {
    return this.json("/api/ai/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        text,
        branch_id: branchId,
        preferred_language: preferredLanguage,
        ...(currentProductId ? { current_product_id: currentProductId } : {}),
      }),
    });
  }

  async synthesize(sessionId: string, text: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, text }),
    });
    if (!response.ok) {
      throw new ApiError(await safeErrorMessage(response), response.status);
    }
    return response.blob();
  }

  searchProducts(query: string, branchId: string): Promise<ProductSearchResponse> {
    const params = new URLSearchParams({ query, branch_id: branchId });
    return this.json(`/api/products/search?${params}`);
  }

  async scanProduct(
    image: Blob,
    branchId: string,
    mode = "auto",
  ): Promise<ProductScanResponse> {
    const form = new FormData();
    form.append("branch_id", branchId);
    form.append("mode", mode);
    form.append("image", image, "product-scan.jpg");
    return this.json("/api/vision/scan-product", { method: "POST", body: form });
  }

  matchPromotions(productId: string, branchId: string): Promise<ItemListResponse<Promotion>> {
    const params = new URLSearchParams({ product_id: productId, branch_id: branchId });
    return this.json(`/api/promotions/match?${params}`);
  }

  activeLeaflets(branchId: string): Promise<ItemListResponse<Leaflet>> {
    const params = new URLSearchParams({ branch_id: branchId });
    return this.json(`/api/leaflets/active?${params}`);
  }

  idlePosters(branchId: string): Promise<ItemListResponse<Poster>> {
    const params = new URLSearchParams({ branch_id: branchId });
    return this.json(`/api/posters/idle?${params}`);
  }

  shelfMap(branchId: string): Promise<ShelfMapResponse> {
    const params = new URLSearchParams({ branch_id: branchId });
    return this.json(`/api/shelf-map?${params}`);
  }

  createPurchasingQuery(query: string, branchId: string): Promise<MockActionResponse> {
    return this.json("/api/purchasing-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, branch_id: branchId }),
    });
  }

  escalatePharmacist(
    reason: string,
    branchId: string,
    sessionId?: string,
  ): Promise<MockActionResponse> {
    return this.json("/api/escalate-pharmacist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, branch_id: branchId, session_id: sessionId }),
    });
  }
}

export const api = new VitaKioskApi(
  resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
);
