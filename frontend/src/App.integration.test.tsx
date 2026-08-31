import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App, {
  followupLeafletQuery,
  getAvatarPresentationForActions,
  isAffirmativeLeafletFollowup,
} from "./App";
import { ApiError } from "./api/client";
import {
  getCenteredScanCrop,
  scoreScanFrameQuality,
} from "./components/CameraScanOverlay";

const hookMocks = vi.hoisted(() => ({
  socket: vi.fn(),
  voice: vi.fn(),
  escalate: vi.fn(),
  health: vi.fn(),
  runtimeStatus: vi.fn(),
  activeLeaflets: vi.fn(),
  scanProduct: vi.fn(),
}));

vi.mock("./api/client", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
  api: {
    escalatePharmacist: hookMocks.escalate,
    health: hookMocks.health,
    runtimeStatus: hookMocks.runtimeStatus,
    activeLeaflets: hookMocks.activeLeaflets,
    scanProduct: hookMocks.scanProduct,
  },
}));
vi.mock("./hooks/useKioskSocket", () => ({ default: hookMocks.socket }));
vi.mock("./hooks/useVoiceInteraction", () => ({ default: hookMocks.voice }));

describe("avatar presentation action mapping", () => {
  it.each([
    [
      "product detail",
      [{ type: "OPEN_PRODUCT_DETAIL", productId: "MOCK-P001" }],
      "friendly_explaining",
      "product",
      "present_product",
    ],
    [
      "product summary",
      [{ type: "OPEN_PRODUCT_SUMMARY", productId: "MOCK-P001" }],
      "friendly_explaining",
      "product",
      "present_product",
    ],
    [
      "promotion leaflet",
      [{ type: "OPEN_PROMOTION_MODAL", promotionId: "MOCK-LF-PROMO-001" }],
      "happy_highlight",
      "promotion",
      "present_promotion",
    ],
    [
      "shelf route",
      [{ type: "OPEN_SHELF_MAP", productId: "MOCK-P001", shelf: "A-03" }],
      "focused_guidance",
      "shelf",
      "guide_shelf",
    ],
    [
      "pharmacist handoff",
      [{ type: "ASK_PHARMACIST_CONFIRMATION" }],
      "safety_alert",
      "pharmacist",
      "safety_handoff",
    ],
  ] as const)(
    "maps %s UI action to an expressive avatar presentation",
    (_label, actions, expression, focusTarget, gesture) => {
      expect(getAvatarPresentationForActions("speaking", actions)).toEqual({
        expression,
        focusTarget,
        gesture,
      });
    },
  );

  it("returns to neutral center presentation after speaking even when UI actions remain", () => {
    expect(getAvatarPresentationForActions("idle", [
      { type: "SHOW_PROMOTION_GALLERY" },
      { type: "OPEN_PROMOTION_MODAL", promotionId: "MOCK-LF-PROMO-001" },
    ])).toEqual({
      expression: "neutral_idle",
      focusTarget: "center",
      gesture: "none",
    });
  });
});

describe("leaflet follow-up wording", () => {
  it("recognizes affirmative promotion follow-ups across kiosk languages", () => {
    expect(isAffirmativeLeafletFollowup("yes interested")).toBe(true);
    expect(isAffirmativeLeafletFollowup("可以给我看")).toBe(true);
    expect(isAffirmativeLeafletFollowup("saya nak tengok")).toBe(true);
    expect(isAffirmativeLeafletFollowup("buffered c")).toBe(false);
  });

  it("routes campaign wording to the campaign gallery prompt", () => {
    expect(followupLeafletQuery("yes interested")).toBe("show active branch promotions");
    expect(followupLeafletQuery("show campaign")).toBe("show active branch campaigns");
    expect(followupLeafletQuery("我要看健康活动")).toBe("show active branch campaigns");
  });
});

describe("camera scan framing", () => {
  it("crops the submitted frame to the visible center reticle", () => {
    expect(getCenteredScanCrop(1_000, 500)).toEqual({
      x: 250,
      y: 125,
      width: 500,
      height: 250,
    });
  });

  it("prefers a clear, well-exposed label frame over a flat dark frame", () => {
    const darkFlat = new Uint8ClampedArray([
      8, 8, 8, 255,
      8, 8, 8, 255,
      8, 8, 8, 255,
      8, 8, 8, 255,
    ]);
    const clearLabel = new Uint8ClampedArray([
      35, 35, 35, 255,
      220, 220, 220, 255,
      45, 45, 45, 255,
      230, 230, 230, 255,
    ]);

    expect(scoreScanFrameQuality(clearLabel, 2, 2))
      .toBeGreaterThan(scoreScanFrameQuality(darkFlat, 2, 2));
  });
});

describe("integrated kiosk panels", () => {
  const startRecording = vi.fn();
  const stopRecording = vi.fn();
  const submitText = vi.fn();
  const adoptConfirmedProduct = vi.fn();
  const resetVoice = vi.fn();
  const sendState = vi.fn();
  const stopCameraTrack = vi.fn();
  const pauseCameraPreview = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    startRecording.mockReset();
    stopRecording.mockReset();
    submitText.mockReset();
    adoptConfirmedProduct.mockReset();
    resetVoice.mockReset();
    sendState.mockReset();
    hookMocks.health.mockReset();
    hookMocks.runtimeStatus.mockReset();
    hookMocks.activeLeaflets.mockReset();
    hookMocks.scanProduct.mockReset();
    stopCameraTrack.mockReset();
    pauseCameraPreview.mockReset();
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopCameraTrack }],
        }),
      },
    });
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback: BlobCallback) => {
      callback(new Blob(["IMAGE:MOCK-P001"], { type: "image/jpeg" }));
    });
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = pauseCameraPreview;
    hookMocks.health.mockResolvedValue({
      status: "ok",
      service: "vitakiosk-api",
      provider_mode: "mock",
      provider_summary: {
        stt: "mock",
        tts: "mock",
        ai: "mock",
        vitaflow: "mock",
        vision: "mock",
      },
    });
    hookMocks.runtimeStatus.mockResolvedValue({
      stt_provider: "mock",
      ai_provider: "mock",
      tts_provider: "mock",
      vitaflow_provider: "mock",
      vision_provider: "mock",
      ollama_reachable: false,
      model: "qwen2.5:7b",
    });
    hookMocks.scanProduct.mockResolvedValue({
      ok: true,
      provider: "mock",
      scanSignals: {
        barcode: null,
        imageSimilarity: true,
        ocr: false,
      },
      candidates: [
        {
          product: {
            id: "MOCK-P001",
            name: "Relief Balm",
            branch_id: "SG-001",
            price: 12.5,
            stock: 18,
            shelf_location: "A-03",
            source: "mock_vitaflow",
            unavailable_reason: null,
          },
          confidence: 0.93,
          matchReason: "product_image_similarity",
          matchedText: null,
        },
      ],
      requiresConfirmation: true,
      message: "Do you mean this item?",
      barcodeResult: null,
      ocrText: null,
      correctedText: null,
    });
    hookMocks.escalate.mockReset();
    hookMocks.escalate.mockResolvedValue({
      id: "ESC-0099",
      status: "waiting_for_pharmacist",
      source: "mock_memory",
    });
    hookMocks.socket.mockReturnValue({
      connected: true,
      state: "idle",
      sendState,
    });
    hookMocks.voice.mockReturnValue({
      state: "idle",
      audioActivity: 0,
      product: {
        id: "MOCK-P001",
        name: "Relief Balm",
        branch_id: "SG-001",
        price: 12.5,
        stock: 18,
        shelf_location: "A-03",
        source: "mock_vitaflow",
        unavailable_reason: null,
      },
      promotions: [
        {
          id: "MOCK-PR001",
          title: "Relief Balm Demo Offer",
          branch_id: "SG-001",
          active: true,
          valid_from: "2025-01-01T00:00:00Z",
          valid_to: "2030-12-31T00:00:00Z",
          source: "mock_vitaflow",
        },
      ],
      leaflets: [
        {
          id: "MOCK-LF-PROMO-001",
          kind: "promotion",
          title: "Relief Balm Demo Leaflet",
          description: "Active branch promotion for Relief Balm.",
          branch_id: "SG-001",
          active: true,
          valid_from: "2025-01-01T00:00:00Z",
          valid_to: "2030-12-31T23:59:00Z",
          image_url: "/assets/leaflets/mock-relief-balm-promo.svg",
          product_ids: ["MOCK-P001"],
          category_tags: ["pain-relief"],
          display_priority: 10,
          source: "mock_vitaflow",
        },
        {
          id: "MOCK-LF-PROMO-002",
          kind: "promotion",
          title: "Supplement Savings Demo",
          description: "General active promotion leaflet for SG-001.",
          branch_id: "SG-001",
          active: true,
          valid_from: "2025-01-01T00:00:00Z",
          valid_to: "2030-12-31T23:59:00Z",
          image_url: "/assets/leaflets/mock-supplement-promo.svg",
          product_ids: [],
          category_tags: ["supplement", "wellness"],
          display_priority: 20,
          source: "mock_vitaflow",
        },
        {
          id: "MOCK-LF-CAMP-001",
          kind: "campaign",
          title: "Hydration Health Campaign",
          description: "Mock branch health campaign.",
          branch_id: "SG-001",
          active: true,
          valid_from: "2025-01-01T00:00:00Z",
          valid_to: "2030-12-31T23:59:00Z",
          image_url: "/assets/leaflets/mock-hydration-campaign.svg",
          product_ids: [],
          category_tags: ["hydration"],
          display_priority: 30,
          source: "mock_vitaflow",
        },
      ],
      uiActions: [],
      transcript: "what is the price of relief balm",
      poster: null,
      responseText: "VitaFlow mock price for Relief Balm: RM12.50.",
      purchasingQueryId: null,
      escalationId: null,
      hasResult: true,
      error: null,
      startRecording,
      stopRecording,
      submitText,
      adoptConfirmedProduct,
      reset: resetVoice,
    });
    hookMocks.activeLeaflets.mockResolvedValue({
      items: hookMocks.voice().leaflets,
      source: "mock_vitaflow",
    });
  });

  it("shows current branch leaflets by default before the first AI answer", async () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      product: null,
      promotions: [],
      leaflets: [],
      uiActions: [],
      transcript: "",
      responseText: "",
      hasResult: false,
    });

    render(<App />);

    expect(hookMocks.activeLeaflets).toHaveBeenCalledWith("SG-001");
    const defaultLeaflet = await screen.findByRole("button", {
      name: /open Hydration Health Campaign leaflet/i,
    });
    fireEvent.click(defaultLeaflet);

    const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
    expect(within(dialog).getAllByRole("option")).toHaveLength(3);
  });

  it("opens the requested leaflet while retaining the full active branch swipe deck", async () => {
    const allLeaflets = hookMocks.voice().leaflets;
    const requestedCampaign = allLeaflets[2];
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      product: null,
      leaflets: [requestedCampaign],
      uiActions: [
        { type: "SHOW_CAMPAIGN_GALLERY" },
        { type: "OPEN_CAMPAIGN_MODAL", campaignId: requestedCampaign.id },
      ],
      transcript: "show campaigns",
      responseText: "Here is the requested active campaign.",
      hasResult: true,
    });

    render(<App />);

    const dialog = await screen.findByRole("dialog", { name: /leaflet preview/i });
    expect(within(dialog).getAllByRole("option")).toHaveLength(3);
    expect(within(dialog).getByRole("option", {
      name: /Hydration Health Campaign, \d of 3/i,
    })).toHaveAttribute("aria-current", "true");
  });

  it("renders trusted mock response data across product panels", () => {
    render(<App />);

    expect(screen.getAllByText("Relief Balm").length).toBeGreaterThan(0);
    expect(screen.getByText("RM12.50")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open Relief Balm Demo Leaflet leaflet/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Promotion" })).not.toHaveTextContent("Relief Balm Demo Leaflet");
    expect(screen.getAllByText(/Mock VitaFlow/i).length).toBeGreaterThan(0);
  });

  it("keeps the collapsed leaflet preview clean while enlarged deck includes relevant promotions and campaigns", () => {
    render(<App />);

    expect(screen.getAllByRole("button", { name: /open .* leaflet/i })).toHaveLength(3);
    expect(screen.getByRole("button", {
      name: /open Supplement Savings Demo leaflet/i,
    })).toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: /open Hydration Health Campaign leaflet/i,
    })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: /open Relief Balm Demo Leaflet leaflet/i,
    }));

    const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
    expect(within(dialog).getAllByRole("option")).toHaveLength(3);
    expect(within(dialog).getByRole("option", {
      name: /Relief Balm Demo Leaflet, 1 of 3/i,
    })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", {
      name: /Supplement Savings Demo, 2 of 3/i,
    })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", {
      name: /Hydration Health Campaign, 3 of 3/i,
    })).toBeInTheDocument();
  });

  it("does not reopen the enlarged leaflet from the same outside-dismiss click", () => {
    vi.useFakeTimers();
    try {
      render(<App />);

      const previewButton = screen.getByRole("button", {
        name: /open Relief Balm Demo Leaflet leaflet/i,
      });
      fireEvent.click(previewButton);
      act(() => {
        vi.advanceTimersByTime(420);
      });

      const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
      fireEvent.pointerDown(dialog, { clientX: 8, pointerId: 1 });
      expect(dialog).toHaveAttribute("data-animation-state", "closing");

      act(() => {
        vi.advanceTimersByTime(260);
      });
      expect(screen.queryByRole("dialog", { name: /leaflet preview/i })).not.toBeInTheDocument();

      fireEvent.click(previewButton);
      expect(screen.queryByRole("dialog", { name: /leaflet preview/i })).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(700);
      });
      fireEvent.click(previewButton);
      expect(screen.getByRole("dialog", { name: /leaflet preview/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("hides renderer, model, and provider diagnostics from the normal customer UI", async () => {
    vi.stubEnv("VITE_AVATAR_RENDERER", "vrm");
    vi.stubEnv("VITE_VRM_MODEL", "vita-new");
    hookMocks.runtimeStatus.mockResolvedValueOnce({
      stt_provider: "faster_whisper",
      tts_provider: "mock",
      ai_provider: "ollama",
      vitaflow_provider: "mock",
      vision_provider: "mock",
      ollama_reachable: true,
      model: "qwen2.5:7b",
    });

    render(<App />);

    await waitFor(() => {
      expect(document.querySelector('[data-avatar-renderer="vrm"]')).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Local demo runtime diagnostics")).not.toBeInTheDocument();
    expect(screen.queryByText(/Renderer:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Model:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Avatar:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI: /i)).not.toBeInTheDocument();
    expect(screen.queryByText(/STT: /i)).not.toBeInTheDocument();
  });

  it("shows local demo provider and avatar diagnostics only when the debug flag is enabled", async () => {
    vi.stubEnv("VITE_SHOW_DEBUG_STATUS", "true");
    vi.stubEnv("VITE_AVATAR_RENDERER", "vrm");
    vi.stubEnv("VITE_VRM_MODEL", "vita-new");
    hookMocks.runtimeStatus.mockResolvedValueOnce({
      stt_provider: "faster_whisper",
      tts_provider: "mock",
      ai_provider: "ollama",
      vitaflow_provider: "mock",
      vision_provider: "mock",
      ollama_reachable: true,
      model: "qwen2.5:7b",
    });

    render(<App />);

    const diagnostics = await screen.findByLabelText("Local demo runtime diagnostics");
    expect(diagnostics).toHaveTextContent("AI: ollama");
    expect(diagnostics).toHaveTextContent("STT: faster_whisper");
    expect(diagnostics).toHaveTextContent("Avatar: vrm");
    expect(diagnostics).toHaveTextContent("VRM: vita-new");
    expect(diagnostics.closest(".kiosk-header")).not.toBeNull();
    expect(
      await screen.findByLabelText(/vrm (character|fallback) ai avatar: ready/i),
    ).toHaveAttribute("data-avatar-model-key", "vita-new");
  });

  it("shows controlled provider status unavailable copy instead of UNKNOWN when runtime status cannot be fetched", async () => {
    vi.stubEnv("VITE_SHOW_DEBUG_STATUS", "true");
    vi.stubEnv("VITE_AVATAR_RENDERER", "lottie");
    hookMocks.runtimeStatus.mockRejectedValueOnce(new Error("offline"));

    render(<App />);

    const diagnostics = await screen.findByLabelText("Local demo runtime diagnostics");
    expect(diagnostics).toHaveTextContent("Provider status unavailable");
    expect(diagnostics).toHaveTextContent("Avatar: lottie");
    expect(diagnostics).not.toHaveTextContent(/unknown/i);
  });

  it("renders the language selector beside the footer connection status with English as default", () => {
    render(<App />);

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText("Connected")).toBeInTheDocument();
    const selector = within(footer).getByRole("group", { name: "Kiosk language selector" });
    expect(within(selector).getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
    expect(within(selector).getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "false");
    expect(within(selector).getByRole("button", { name: "BM" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("AI Pharmacy Assistant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tap to Speak" })).toBeInTheDocument();
    expect(hookMocks.voice.mock.calls.at(-1)?.[0]?.preferredLanguage).toBe("auto");
  });

  it("translates major customer UI labels to Chinese while preserving VitaFlow product facts", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "中文" }));

    expect(screen.getByText("AI 药房助手")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "点击说话" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "产品" })).toBeInTheDocument();
    expect(screen.getByText("货架导航")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "促销" })).toBeInTheDocument();
    expect(screen.getByText("药剂师协助")).toBeInTheDocument();
    expect(screen.getByLabelText("输入你的问题")).toBeInTheDocument();
    expect(screen.getAllByText("Relief Balm").length).toBeGreaterThan(0);
    expect(screen.getByText("MOCK-P001")).toBeInTheDocument();
    expect(screen.getByText("RM12.50")).toBeInTheDocument();
    expect(screen.getAllByText("A-03").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mock VitaFlow").length).toBeGreaterThan(0);
    expect(hookMocks.voice.mock.calls.at(-1)?.[0]?.preferredLanguage).toBe("zh");
  });

  it("translates major customer UI labels to BM and persists the selected language", () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "BM" }));

    expect(screen.getByText("Pembantu Farmasi AI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tekan untuk bercakap" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Produk" })).toBeInTheDocument();
    expect(screen.getByText("Navigasi rak")).toBeInTheDocument();
    expect(screen.getByText("Bantuan ahli farmasi")).toBeInTheDocument();
    expect(window.localStorage.getItem("vitakiosk.language")).toBe("ms");
    expect(hookMocks.voice.mock.calls.at(-1)?.[0]?.preferredLanguage).toBe("ms");

    unmount();
    render(<App />);

    expect(screen.getByText("Pembantu Farmasi AI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tekan untuk bercakap" })).toBeInTheDocument();
    expect(hookMocks.voice.mock.calls.at(-1)?.[0]?.preferredLanguage).toBe("ms");
  });

  it("shows cinematic AI subtitle while hiding the customer transcript from the main UI", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      state: "speaking",
      responseText:
        "VitaFlow mock price for Relief Balm: RM12.50. It is shown from Mock VitaFlow data.",
    });

    render(<App />);

    expect(screen.queryByText("what is the price of relief balm")).not.toBeInTheDocument();
    expect(screen.getByText("VitaFlow mock price for Relief Balm: RM12.50.")).toBeInTheDocument();
    expect(screen.queryByText(/It is shown from Mock VitaFlow data/)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /AI assistant subtitles/i })).toHaveClass(
      "ai-subtitle-panel",
    );
    expect(screen.queryByText(/raw json/i)).not.toBeInTheDocument();
  });

  it("executes whitelisted promotion leaflet and modal actions only", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [
        { type: "SHOW_PROMOTION_LEAFLET", promotionId: "MOCK-LF-PROMO-001" },
        { type: "OPEN_PROMOTION_MODAL", promotionId: "MOCK-LF-PROMO-001" },
        { type: "NAVIGATE_UNSAFE_DEBUG_PAGE", url: "https://example.invalid" },
      ],
    });

    render(<App />);

    expect(screen.getAllByText("Relief Balm Demo Leaflet").length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog", { name: /leaflet preview/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Floating holographic leaflet card")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close leaflet preview" })).not.toBeInTheDocument();
    expect(screen.queryByText(/NAVIGATE_UNSAFE_DEBUG_PAGE/i)).not.toBeInTheDocument();
  });

  it("opens a campaign modal when the API action includes a null promotionId field", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [
        {
          type: "SHOW_CAMPAIGN_GALLERY",
          promotionId: null,
          campaignId: null,
        },
        {
          type: "OPEN_CAMPAIGN_MODAL",
          promotionId: null,
          campaignId: "MOCK-LF-CAMP-001",
        },
      ],
      responseText: "Current active branch campaigns: Hydration Health Campaign.",
    });

    render(<App />);

    expect(screen.getByRole("dialog", { name: /leaflet preview/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Hydration Health Campaign/i }))
      .toHaveAttribute("aria-current", "true");
  });

  it("executes OPEN_PRODUCT_DETAIL by opening the enlarged product detail viewer", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [
        { type: "SHOW_PRODUCT", productId: "MOCK-P001" },
        { type: "OPEN_PRODUCT_DETAIL", productId: "MOCK-P001" },
      ],
    });

    render(<App />);

    expect(screen.getByRole("dialog", { name: /enlarged product details/i })).toBeInTheDocument();
    expect(screen.getByTestId("product-viewer-stage")).toHaveAttribute(
      "data-product-view",
      "details",
    );
  });

  it("executes OPEN_PRODUCT_SUMMARY by opening the enlarged product summary viewer", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [
        { type: "SHOW_PRODUCT", productId: "MOCK-P001" },
        { type: "OPEN_PRODUCT_SUMMARY", productId: "MOCK-P001" },
      ],
      responseText: "Here is the product summary and how to use information.",
    });

    render(<App />);

    const dialog = screen.getByRole("dialog", { name: /enlarged product summary/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId("product-viewer-stage")).toHaveAttribute(
      "data-product-view",
      "summary",
    );
    expect(dialog).toHaveTextContent("Ingredient");
    expect(dialog).toHaveTextContent("How to use");
  });

  it("executes OPEN_SHELF_MAP by opening the enlarged route viewer", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [
        { type: "SHOW_PRODUCT", productId: "MOCK-P001" },
        { type: "OPEN_SHELF_MAP", productId: "MOCK-P001", shelf: "A-03" },
      ],
    });

    render(<App />);

    const dialog = screen.getByRole("dialog", { name: /enlarged shelf navigation map/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getAllByText("Shelf A-03").length).toBeGreaterThan(0);
  });

  it("closes an AI-opened shelf map from outside click without reopening it", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [
        { type: "SHOW_PRODUCT", productId: "MOCK-P001" },
        { type: "OPEN_SHELF_MAP", productId: "MOCK-P001", shelf: "A-03" },
      ],
    });

    const { rerender } = render(<App />);

    const dialog = screen.getByRole("dialog", { name: /enlarged shelf navigation map/i });
    const content = within(dialog).getByLabelText("Expanded pharmacy route content");

    fireEvent.click(content);
    expect(screen.getByRole("dialog", { name: /enlarged shelf navigation map/i })).toBeInTheDocument();

    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(screen.queryByRole("dialog", { name: /enlarged shelf navigation map/i })).not.toBeInTheDocument();

    rerender(<App />);
    expect(screen.queryByRole("dialog", { name: /enlarged shelf navigation map/i })).not.toBeInTheDocument();
  });

  it("ignores malformed auto-enlarge actions safely", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [
        { type: "OPEN_PRODUCT_DETAIL" },
        { type: "OPEN_PRODUCT_SUMMARY" },
        { type: "OPEN_SHELF_MAP", shelf: "A-03" },
        { type: "OPEN_PROMOTION_MODAL", productId: "UNKNOWN-PRODUCT" },
      ],
    });

    render(<App />);

    expect(screen.queryByRole("dialog", { name: /enlarged product details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /enlarged shelf navigation map/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /leaflet preview/i })).not.toBeInTheDocument();
  });

  it("executes explicit leaflet open aliases while ignoring arbitrary action names", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [
        { type: "OPEN_PROMOTION_LEAFLET", promotionId: "MOCK-LF-PROMO-001" },
        { type: "SHOW_LEAFLET_GALLERY" },
        { type: "CLICK_RANDOM_BUTTON", selector: ".danger" },
      ],
    });

    render(<App />);

    expect(screen.getByRole("dialog", { name: /leaflet preview/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Floating holographic leaflet card")).toBeInTheDocument();
    expect(screen.queryByText(/CLICK_RANDOM_BUTTON/i)).not.toBeInTheDocument();
  });

  it("shows promotion and campaign choices when a product has no specific promotion", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      product: {
        id: "MOCK-P002",
        name: "Hydration Salts",
        branch_id: "SG-001",
        price: 8.9,
        stock: 24,
        shelf_location: "B-07",
        source: "mock_vitaflow",
        unavailable_reason: null,
      },
      promotions: [],
      uiActions: [{ type: "SHOW_PRODUCT", productId: "MOCK-P002" }],
      responseText:
        "This product does not have a specific promotion now. I can show you other active promotions or health campaigns if you are interested.",
    });

    render(<App />);

    expect(screen.getByRole("button", { name: "Promotion" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Campaign" })).toBeInTheDocument();
  });

  it("routes yes follow-up from product options to branch leaflet browsing instead of product search", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      product: {
        id: "MOCK-P002",
        name: "Hydration Salts",
        branch_id: "SG-001",
        price: 8.9,
        stock: 24,
        shelf_location: "B-07",
        source: "mock_vitaflow",
        unavailable_reason: null,
      },
      promotions: [],
      uiActions: [{ type: "SHOW_PRODUCT", productId: "MOCK-P002" }],
      responseText:
        "This product does not have a specific promotion now. I can show you other active promotions or health campaigns if you are interested.",
    });

    render(<App />);

    fireEvent.change(screen.getByRole("textbox", { name: "Type your question" }), {
      target: { value: "yes interested" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send typed question" }));

    expect(submitText).toHaveBeenCalledWith(
      "show active branch promotions",
      "yes interested",
    );
  });

  it("opens the enlarged general promotion deck from controlled promotion gallery actions", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [
        { type: "SHOW_PROMOTION_GALLERY" },
        { type: "OPEN_PROMOTION_MODAL", promotionId: "MOCK-LF-PROMO-001" },
      ],
      responseText: "Here are the active branch promotion leaflets.",
    });

    render(<App />);

    expect(screen.getByRole("dialog", { name: /leaflet preview/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Floating holographic leaflet card")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog", { name: /leaflet preview/i })).getAllByRole("option"))
      .toHaveLength(3);
    expect(screen.getByRole("button", { name: /open Relief Balm Demo Leaflet leaflet/i })).toBeInTheDocument();
  });

  it("auto-opens the first promotion leaflet when AI sends only a promotion gallery action", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [{ type: "SHOW_PROMOTION_GALLERY" }],
      responseText: "Here are the active branch promotion leaflets.",
    });

    render(<App />);

    const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: /Relief Balm Demo Leaflet, 1 of 3/i }))
      .toHaveAttribute("aria-current", "true");
  });

  it("keeps AI-opened promotion leaflets swipeable and closes from blank stage clicks", () => {
    vi.useFakeTimers();
    try {
      hookMocks.voice.mockReturnValue({
        ...hookMocks.voice(),
        uiActions: [
          { type: "SHOW_PROMOTION_GALLERY" },
          { type: "OPEN_PROMOTION_MODAL", promotionId: "MOCK-LF-PROMO-001" },
        ],
        responseText: "Here are the active branch promotion leaflets.",
      });

      render(<App />);

      const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
      expect(within(dialog).getAllByRole("option")).toHaveLength(3);

      const stage = screen.getByLabelText("Floating holographic leaflet card");
      fireEvent.mouseDown(stage, { clientX: 520 });
      fireEvent.mouseMove(stage, { clientX: 220 });
      fireEvent.mouseUp(stage, { clientX: 220 });

      expect(screen.getByRole("option", { name: /Supplement Savings Demo, 2 of \d+/i }))
        .toHaveAttribute("aria-current", "true");
      expect(screen.getByRole("complementary", { name: /active leaflet metadata/i }))
        .toHaveTextContent("Supplement Savings Demo");

      act(() => {
        vi.advanceTimersByTime(180);
      });
      fireEvent.click(stage, { clientX: 8 });
      expect(screen.getByRole("dialog", { name: /leaflet preview/i }))
        .toHaveAttribute("data-animation-state", "closing");

      act(() => {
        vi.advanceTimersByTime(260);
      });

      expect(screen.queryByRole("dialog", { name: /leaflet preview/i })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows general campaign galleries from controlled actions", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      uiActions: [{ type: "SHOW_CAMPAIGN_GALLERY" }],
      responseText: "Here are the active branch health campaigns.",
    });

    render(<App />);

    expect(screen.queryByText("Campaign gallery")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open Hydration Health Campaign leaflet/i })).toBeInTheDocument();
  });

  it("keeps pharmacist escalation ahead of promotion modal actions", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      state: "pharmacist_escalation",
      escalationId: "ESC-0100",
      uiActions: [
        { type: "OPEN_PROMOTION_MODAL", promotionId: "MOCK-LF-PROMO-001" },
        { type: "REQUEST_PHARMACIST_ASSISTANCE" },
      ],
    });

    render(<App />);

    expect(screen.getByText("Pharmacist assistance requested")).toBeInTheDocument();
    expect(screen.getByText(/ESC-0100/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /leaflet preview/i })).not.toBeInTheDocument();
  });

  it("shows purchasing query and no guessed product for unknown input", () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      product: null,
      promotions: [],
      responseText: "Product not found.",
      purchasingQueryId: "PQ-0001",
    });

    render(<App />);

    expect(screen.getByText(/Purchasing query PQ-0001/i)).toBeInTheDocument();
    expect(screen.queryByText("Relief Balm")).not.toBeInTheDocument();
  });

  it("shows fuzzy product candidates and applies the selected VitaFlow item", () => {
    const candidateProduct = {
      id: "MOCK-P001",
      name: "Relief Balm",
      branch_id: "SG-001",
      price: 12.5,
      stock: 18,
      shelf_location: "A-03",
      source: "mock_vitaflow",
      unavailable_reason: null,
    };
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      product: null,
      promotions: [],
      responseText: "Do you mean Relief Balm?",
      purchasingQueryId: null,
      productCandidates: [
        {
          product: candidateProduct,
          confidence: 0.91,
          match_reason: "near_name_match",
          matched_text: "Relief Bomb",
        },
      ],
    });

    render(<App />);

    expect(screen.getByText("Do you mean this item?")).toBeInTheDocument();
    expect(screen.getByText("Similar name")).toBeInTheDocument();
    const candidateButton = screen.getByRole("button", {
      name: /select item: relief balm/i,
    });
    expect(candidateButton).toHaveTextContent("MOCK-P001");
    expect(candidateButton).toHaveTextContent("RM12.50");
    expect(candidateButton).toHaveTextContent("18");
    expect(candidateButton).toHaveTextContent("A-03");
    expect(candidateButton).toHaveTextContent("SG-001");
    expect(candidateButton).toHaveTextContent("Mock VitaFlow");

    fireEvent.click(candidateButton);

    expect(screen.getAllByText("Relief Balm").length).toBeGreaterThan(0);
    expect(screen.getAllByText("A-03").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /open Relief Balm Demo Leaflet leaflet/i })).toBeInTheDocument();
    expect(screen.queryByText("Do you mean this item?")).not.toBeInTheDocument();
  });

  it("opens camera scan overlay and auto-captures visual product candidates", async () => {
    let finishScan: ((value: unknown) => void) | undefined;
    hookMocks.scanProduct.mockImplementationOnce(() =>
      new Promise((resolve) => {
        finishScan = resolve;
      }),
    );
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));

    const dialog = await screen.findByRole("dialog", { name: /scan product/i });
    expect(dialog).toHaveTextContent(
      "Keep one product label inside the guide. You can move naturally while it scans.",
    );
    expect(dialog).toHaveTextContent("Hold steady");
    expect(within(dialog).queryByRole("button", { name: /capture/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: "user",
        width: { ideal: 1_920 },
        height: { ideal: 1_080 },
      },
      audio: false,
    });

    await waitFor(() => expect(hookMocks.scanProduct).toHaveBeenCalledTimes(1));
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledTimes(3);
    expect(pauseCameraPreview).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent(/Capturing|Scanning product/i);
    finishScan?.({
      ok: true,
      provider: "mock",
      scanSignals: {
        barcode: null,
        imageSimilarity: true,
        ocr: false,
      },
      candidates: [
        {
          product: {
            id: "MOCK-P001",
            name: "Relief Balm",
            branch_id: "SG-001",
            price: 12.5,
            stock: 18,
            shelf_location: "A-03",
            source: "mock_vitaflow",
            unavailable_reason: null,
          },
          confidence: 0.93,
          matchReason: "product_image_similarity",
          matchedText: null,
        },
      ],
      requiresConfirmation: true,
      message: "Do you mean this item?",
      barcodeResult: null,
      ocrText: null,
      correctedText: null,
    });
    expect(await within(dialog).findByText("Do you mean this item?")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /use relief balm/i })).toBeInTheDocument();
    expect(stopCameraTrack).not.toHaveBeenCalled();
  });

  it("shows the first authoritative Agnes candidate for manual confirmation without rescanning", async () => {
    const bufferedCandidate = {
      ok: true,
      provider: "agnes",
      scanSignals: { barcode: null, imageSimilarity: false, ocr: true },
      candidates: [
        {
          product: {
            id: "5042",
            name: "BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
            branch_id: "JK",
            price: 31.85,
            stock: 1,
            shelf_location: "Shelf Island C R3 B1",
            source: "vitaflow_erp",
            unavailable_reason: null,
          },
          confidence: 0.91,
          matchReason: "ocr_text_match",
          matchedText: "BUFFERED C",
        },
      ],
      requiresConfirmation: true,
      message: "Do you mean this item?",
      barcodeResult: null,
      ocrText: "BUFFERED C",
      correctedText: "BUFFERED C",
    };
    hookMocks.scanProduct.mockResolvedValue(bufferedCandidate);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));

    await waitFor(() => expect(hookMocks.scanProduct).toHaveBeenCalledTimes(1));
    const confirmationDialog = screen.getByRole("dialog", { name: /scan product/i });
    expect(await within(confirmationDialog).findByText("Do you mean this item?"))
      .toBeInTheDocument();
    expect(within(confirmationDialog).getByRole("button", {
      name: /use blackmores buffered c slow release tab 30s/i,
    })).toBeInTheDocument();
    expect(stopCameraTrack).not.toHaveBeenCalled();
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 1_100));
    });
    expect(hookMocks.scanProduct).toHaveBeenCalledTimes(1);
  });

  it("keeps scanning instead of guessing when an API returns multiple candidates", async () => {
    hookMocks.scanProduct.mockResolvedValue({
      ok: true,
      provider: "agnes",
      scanSignals: { barcode: null, imageSimilarity: true, ocr: true },
      candidates: [
        {
          product: {
            id: "5042",
            name: "BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
            branch_id: "JK",
            price: 31.85,
            stock: 1,
            shelf_location: "Shelf Island C R3 B1",
            source: "vitaflow_erp",
            unavailable_reason: null,
          },
          confidence: 0.93,
          matchReason: "agnes_label_match",
          matchedText: "BLACKMORES BUFFERED C",
        },
        {
          product: {
            id: "314",
            name: "FISHERMAN S FRIEND (SF) LEMON 25GM",
            branch_id: "JK",
            price: 4.9,
            stock: 8,
            shelf_location: "Counter 2",
            source: "vitaflow_erp",
            unavailable_reason: null,
          },
          confidence: 0.89,
          matchReason: "agnes_label_match",
          matchedText: "BLACKMORES BUFFERED C",
        },
      ],
      requiresConfirmation: true,
      message: "Do you mean this item?",
      barcodeResult: null,
      ocrText: "BLACKMORES BUFFERED C",
      correctedText: "BLACKMORES BUFFERED C",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));

    const dialog = await screen.findByRole("dialog", { name: /scan product/i });
    expect(await within(dialog).findByText(
      /couldn't identify one product confidently/i,
      undefined,
      { timeout: 3_500 },
    )).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", {
      name: /use blackmores buffered c slow release tab 30s/i,
    })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", {
      name: /use fisherman s friend/i,
    })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /scan again/i })).toBeInTheDocument();
  });

  it("keeps scanning instead of closing after a frame has no product match", async () => {
    hookMocks.scanProduct.mockResolvedValue({
      ok: true,
      provider: "local_product_scan",
      scanSignals: { barcode: null, imageSimilarity: false, ocr: false },
      candidates: [],
      requiresConfirmation: false,
      message: "Item not recognized, please keep the label steady or type the product name.",
      barcodeResult: null,
      ocrText: null,
      correctedText: null,
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));

    await waitFor(() => expect(hookMocks.scanProduct).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog", { name: /scan product/i })).toBeInTheDocument();
    expect(screen.getByText(/Item not recognized/i)).toBeInTheDocument();
    expect(stopCameraTrack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /scan again/i }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(pauseCameraPreview).not.toHaveBeenCalled();
  });

  it("ignores a late scan candidate after a newer AI product result", async () => {
    let finishScan: ((value: unknown) => void) | undefined;
    hookMocks.scanProduct.mockImplementationOnce(() =>
      new Promise((resolve) => {
        finishScan = resolve;
      }),
    );
    const initialVoice = hookMocks.voice();
    hookMocks.voice.mockReturnValue({ ...initialVoice, resultId: 1 });
    const view = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));
    await waitFor(() => expect(hookMocks.scanProduct).toHaveBeenCalledTimes(1));

    hookMocks.voice.mockReturnValue({
      ...initialVoice,
      resultId: 2,
      product: {
        id: "314",
        name: "FISHERMAN S FRIEND (SF) LEMON 25GM",
        branch_id: "SG-001",
        price: 4.9,
        stock: 8,
        shelf_location: "Counter 2",
        source: "vitaflow_erp",
        unavailable_reason: null,
      },
      responseText: "I found Fisherman's Friend in VitaFlow.",
    });
    view.rerender(<App />);

    await act(async () => {
      finishScan?.({
        ok: true,
        provider: "local_product_scan",
        scanSignals: { barcode: null, imageSimilarity: false, ocr: true },
        candidates: [
          {
            product: {
              id: "5042",
              name: "BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
              branch_id: "SG-001",
              price: 31.85,
              stock: 1,
              shelf_location: "Shelf Island C R3 B1",
              source: "vitaflow_erp",
              unavailable_reason: null,
            },
            confidence: 0.91,
            matchReason: "ocr_text_match",
            matchedText: "BUFFERED C",
          },
        ],
        requiresConfirmation: true,
        message: "Do you mean this item?",
        barcodeResult: null,
        ocrText: "BUFFERED C",
        correctedText: "BUFFERED C",
      });
      await Promise.resolve();
    });

    expect(screen.getByText("FISHERMAN S FRIEND (SF) LEMON 25GM")).toBeInTheDocument();
    expect(screen.queryByText("Do you mean this item?")).not.toBeInTheDocument();
    expect(screen.queryByText("BLACKMORES BUFFERED C SLOW RELEASE TAB 30S")).not.toBeInTheDocument();
  });

  it("ignores a late scan result after the scan overlay is dismissed", async () => {
    let finishScan: ((value: unknown) => void) | undefined;
    hookMocks.scanProduct.mockImplementationOnce(() =>
      new Promise((resolve) => {
        finishScan = resolve;
      }),
    );
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));
    const dialog = await screen.findByRole("dialog", { name: /scan product/i });
    await waitFor(() => expect(hookMocks.scanProduct).toHaveBeenCalledTimes(1));
    fireEvent.mouseDown(dialog);
    expect(screen.queryByRole("dialog", { name: /scan product/i })).not.toBeInTheDocument();

    await act(async () => {
      finishScan?.({
        ok: true,
        provider: "local_product_scan",
        scanSignals: { barcode: null, imageSimilarity: false, ocr: true },
        candidates: [
          {
            product: {
              id: "5042",
              name: "BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
              branch_id: "SG-001",
              price: 31.85,
              stock: 1,
              shelf_location: "Shelf Island C R3 B1",
              source: "vitaflow_erp",
              unavailable_reason: null,
            },
            confidence: 0.91,
            matchReason: "ocr_text_match",
            matchedText: "BUFFERED C",
          },
        ],
        requiresConfirmation: true,
        message: "Do you mean this item?",
        barcodeResult: null,
        ocrText: "BUFFERED C",
        correctedText: "BUFFERED C",
      });
      await Promise.resolve();
    });

    expect(screen.queryByText("Do you mean this item?")).not.toBeInTheDocument();
    expect(screen.queryByText("BLACKMORES BUFFERED C SLOW RELEASE TAB 30S")).not.toBeInTheDocument();
  });

  it("keeps the Product panel empty while a scan candidate awaits confirmation", async () => {
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      hasResult: false,
      product: null,
      productCandidates: [],
      leaflets: [],
      promotions: [],
      responseText: "",
    });
    hookMocks.scanProduct.mockResolvedValue({
      ok: true,
      provider: "local_product_scan",
      scanSignals: { barcode: null, imageSimilarity: false, ocr: true },
      candidates: [
        {
          product: {
            id: "5042",
            name: "BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
            branch_id: "JK",
            price: 31.85,
            stock: 1,
            shelf_location: "Shelf Island C R3 B1",
            source: "vitaflow_erp",
            unavailable_reason: null,
          },
          confidence: 0.91,
          matchReason: "ocr_text_match",
          matchedText: "BUFFERED C",
        },
      ],
      requiresConfirmation: true,
      message: "Do you mean this item?",
      barcodeResult: null,
      ocrText: "BUFFERED C",
      correctedText: "BUFFERED C",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));

    expect(
      await screen.findByText("Do you mean this item?", undefined, { timeout: 3_500 }),
    ).toBeInTheDocument();
    expect(screen.getByText("BLACKMORES BUFFERED C SLOW RELEASE TAB 30S")).toBeInTheDocument();
    const productPanel = screen.getByRole("region", { name: "Product" });
    expect(within(productPanel).getByText("Ready for product search")).toBeInTheDocument();
    expect(within(productPanel).queryByText("Relief Balm")).not.toBeInTheDocument();
  });

  it("applies a selected camera scan candidate to product shelf and promotion panels", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));
    await screen.findByRole("dialog", { name: /scan product/i });

    const candidateButton = await screen.findByRole(
      "button",
      { name: /use relief balm/i },
      { timeout: 3_500 },
    );
    fireEvent.click(candidateButton);

    expect(screen.getAllByText("Relief Balm").length).toBeGreaterThan(0);
    expect(screen.getAllByText("A-03").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /open Relief Balm Demo Leaflet leaflet/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /scan product/i })).not.toBeInTheDocument();
    expect(adoptConfirmedProduct).toHaveBeenCalledWith(expect.objectContaining({
      id: "MOCK-P001",
    }));
    expect(screen.queryByText("Do you mean this item?")).not.toBeInTheDocument();
  });

  it("accepts one exact barcode match immediately without visual confirmation", async () => {
    hookMocks.scanProduct.mockResolvedValue({
      ok: true,
      provider: "agnes",
      scanSignals: { barcode: "93299343", imageSimilarity: false, ocr: true },
      candidates: [
        {
          product: {
            id: "5042",
            name: "BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
            branch_id: "JK",
            price: 31.85,
            stock: 1,
            shelf_location: "Shelf Island C R3 B1",
            source: "vitaflow_erp",
            unavailable_reason: null,
          },
          confidence: 1,
          matchReason: "exact_barcode",
          matchedText: "93299343",
        },
      ],
      requiresConfirmation: false,
      message: "Exact barcode match.",
      barcodeResult: "93299343",
      ocrText: "BLACKMORES BUFFERED C",
      correctedText: "BLACKMORES BUFFERED C",
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /scan product/i })).not.toBeInTheDocument();
    }, { timeout: 3_500 });
    const productPanel = screen.getByRole("region", { name: "Product" });
    expect(within(productPanel).getByText("BLACKMORES BUFFERED C SLOW RELEASE TAB 30S")).toBeInTheDocument();
    expect(within(productPanel).getByText("Shelf Island C R3 B1")).toBeInTheDocument();
  });

  it("replaces product and shelf route together across consecutive confirmed visual scans", async () => {
    const bufferedResult = {
      ok: true,
      provider: "agnes",
      scanSignals: { barcode: null, imageSimilarity: false, ocr: true },
      candidates: [
        {
          product: {
            id: "5042",
            name: "BLACKMORES BUFFERED C SLOW RELEASE TAB 30S",
            branch_id: "JK",
            price: 31.85,
            stock: 1,
            shelf_location: "Shelf Island C R3 B1",
            source: "vitaflow_erp",
            unavailable_reason: null,
          },
          confidence: 0.94,
          matchReason: "vision_label_match",
          matchedText: "BLACKMORES BUFFERED C",
        },
      ],
      requiresConfirmation: true,
      message: "Do you mean this item?",
      barcodeResult: null,
      ocrText: "BLACKMORES BUFFERED C",
      correctedText: "BLACKMORES BUFFERED C",
    };
    const fishermanResult = {
      ...bufferedResult,
      candidates: [
        {
          product: {
            id: "314",
            name: "FISHERMAN S FRIEND (SF) LEMON 25GM",
            branch_id: "JK",
            price: 4.9,
            stock: 8,
            shelf_location: "Counter 2",
            source: "vitaflow_erp",
            unavailable_reason: null,
          },
          confidence: 0.92,
          matchReason: "vision_label_match",
          matchedText: "FISHERMAN S FRIEND LEMON",
        },
      ],
      ocrText: "FISHERMAN S FRIEND LEMON",
      correctedText: "FISHERMAN S FRIEND LEMON",
    };
    hookMocks.scanProduct
      .mockResolvedValueOnce(bufferedResult)
      .mockResolvedValueOnce(fishermanResult);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));
    fireEvent.click(await screen.findByRole("button", {
      name: /use blackmores buffered c slow release tab 30s/i,
    }, { timeout: 3_500 }));

    let productPanel = screen.getByRole("region", { name: "Product" });
    expect(within(productPanel).getByText("BLACKMORES BUFFERED C SLOW RELEASE TAB 30S")).toBeInTheDocument();
    expect(within(productPanel).getByText("Shelf Island C R3 B1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));
    fireEvent.click(await screen.findByRole("button", {
      name: /use fisherman s friend \(sf\) lemon 25gm/i,
    }, { timeout: 3_500 }));

    productPanel = screen.getByRole("region", { name: "Product" });
    expect(within(productPanel).getByText("FISHERMAN S FRIEND (SF) LEMON 25GM")).toBeInTheDocument();
    expect(within(productPanel).getByText("Counter 2")).toBeInTheDocument();
    expect(within(productPanel).queryByText("Shelf Island C R3 B1")).not.toBeInTheDocument();
  });

  it("reports a vision service outage instead of blaming camera framing", async () => {
    hookMocks.scanProduct.mockRejectedValue(
      new ApiError(
        "Cloud product vision is unavailable. Please scan again or search manually.",
        503,
      ),
    );

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));

    expect(await screen.findByText(
      "Cloud product vision is unavailable. Please scan again or search manually.",
      undefined,
      { timeout: 3_500 },
    )).toBeInTheDocument();
    expect(screen.queryByText(/Keep the product in view/i)).not.toBeInTheDocument();
  });

  it("shows the backend no-match reason instead of replacing it with a generic retry", async () => {
    hookMocks.scanProduct.mockResolvedValueOnce({
      ok: true,
      provider: "local_product_scan",
      scanSignals: { barcode: null, imageSimilarity: false, ocr: false },
      candidates: [],
      requiresConfirmation: false,
      message: "Cloud vision is unavailable and the local scan found no VitaFlow match. Please scan again or search manually.",
      barcodeResult: null,
      ocrText: null,
      correctedText: null,
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));

    expect(await screen.findByText(
      "Cloud vision is unavailable and the local scan found no VitaFlow match. Please scan again or search manually.",
      undefined,
      { timeout: 3_500 },
    )).toBeInTheDocument();
  });

  it("shows controlled camera permission errors and outside click closes the scanner", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("blocked", "NotAllowedError"));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /scan product/i }));

    const dialog = await screen.findByRole("dialog", { name: /scan product/i });
    expect(await within(dialog).findByText(/Camera permission is needed/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /capture/i })).not.toBeInTheDocument();

    fireEvent.mouseDown(dialog);

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /scan product/i })).not.toBeInTheDocument(),
    );
  });

  it("opens the same visible scan UI from approved AI scan actions", async () => {
    hookMocks.voice.mockReturnValueOnce({
      ...hookMocks.voice(),
      uiActions: [{ type: "OPEN_PRODUCT_SCAN" }],
    });

    render(<App />);

    const dialog = await screen.findByRole("dialog", { name: /scan product/i });
    expect(dialog).toHaveTextContent(
      "Keep one product label inside the guide. You can move naturally while it scans.",
    );
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("shows immediate local feedback after manual pharmacist request", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Request assistance" }));

    expect((await screen.findAllByText("Pharmacist Requested")).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("alert").some((alert) =>
        alert.textContent?.includes("ESC-0099"),
      ),
    ).toBe(true);
  });

  it("shows the authoritative VitaFlow case code after ERP acknowledgement", async () => {
    hookMocks.escalate.mockResolvedValueOnce({
      id: "VK-20260829-0001",
      status: "New",
      source: "vitaflow_erp",
    });
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Request assistance" }));

    expect(await screen.findByText(/A pharmacist has been notified · VK-20260829-0001/)).toBeInTheDocument();
  });

  it("does not claim notification when VitaFlow rejects the assistance request", async () => {
    hookMocks.escalate.mockRejectedValueOnce(new Error("VitaFlow unavailable"));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Request assistance" }));

    expect(await screen.findByText("Could not notify the pharmacist. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/A pharmacist has been notified/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("shows a requesting state immediately while pharmacist assistance is being sent", () => {
    hookMocks.escalate.mockImplementationOnce(() => new Promise(() => undefined));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Request assistance" }));

    expect(screen.getByText("Requesting pharmacist assistance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Requesting/i })).toBeDisabled();
    expect(screen.getByText("Please wait while I notify the pharmacist.")).toBeInTheDocument();
  });

  it("starts a new customer session after manual pharmacist escalation without refreshing", async () => {
    render(<App />);
    const firstSessionId = hookMocks.voice.mock.calls[0]?.[0]?.sessionId;

    fireEvent.click(screen.getByRole("button", { name: "Request assistance" }));

    expect((await screen.findAllByText("Pharmacist Requested")).length).toBeGreaterThan(0);
    expect(screen.getByText(/ESC-0099/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start New Customer" }));

    expect(resetVoice).toHaveBeenCalledTimes(1);
    expect(sendState).toHaveBeenCalledWith("idle");
    expect(screen.getByRole("button", { name: "Tap to Speak" })).toBeEnabled();
    expect(screen.getByText("Pharmacist assistance")).toBeInTheDocument();
    expect(screen.queryAllByText("Pharmacist Requested")).toHaveLength(0);
    expect(hookMocks.voice.mock.calls.at(-1)?.[0]?.sessionId).not.toBe(firstSessionId);

    fireEvent.click(screen.getByRole("button", { name: "Tap to Speak" }));
    expect(startRecording).toHaveBeenCalledTimes(1);
    expect(hookMocks.escalate).toHaveBeenCalledTimes(1);
  });

  it("uses the secondary Start action to reset the kiosk instead of showing Hold to Speak", () => {
    render(<App />);
    const firstSessionId = hookMocks.voice.mock.calls[0]?.[0]?.sessionId;

    expect(screen.queryByText(/Hold to Speak/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(resetVoice).toHaveBeenCalledTimes(1);
    expect(sendState).toHaveBeenCalledWith("idle");
    expect(screen.getByRole("button", { name: "Tap to Speak" })).toBeEnabled();
    expect(hookMocks.voice.mock.calls.at(-1)?.[0]?.sessionId).not.toBe(firstSessionId);
  });

  it("renders a compact native typed input below the shelf map and submits through the existing AI flow", () => {
    render(<App />);

    const shelfMap = screen.getByRole("region", { name: /shelf navigation map/i });
    const typedPanel = screen.getByRole("region", { name: /typed question input/i });
    expect(typedPanel).toHaveAttribute("data-layout", "compact-rail");
    expect(
      shelfMap.compareDocumentPosition(typedPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText(/Accessible input/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Native keyboard mode/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Type / Keyboard" })).not.toBeInTheDocument();

    const input = screen.getByLabelText("Type your question");
    expect(input.tagName).toBe("INPUT");
    expect(input).not.toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Open typing screen" })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "Where is Panadol?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send typed question" }));

    expect(submitText).toHaveBeenCalledWith("Where is Panadol?");
    expect(startRecording).not.toHaveBeenCalled();
  });

  it("keeps native mode as the default and opens the popup only from the compact keyboard icon", () => {
    render(<App />);

    const input = screen.getByLabelText("Type your question");
    fireEvent.focus(input);
    expect(screen.queryByRole("dialog", { name: /VitaKiosk typing screen/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open typing screen" }));
    expect(screen.getByRole("dialog", { name: /VitaKiosk typing screen/i })).toBeInTheDocument();
  });

  it("opens the typing screen as a top-level overlay outside the shelf map and compact input rail", async () => {
    render(<App />);

    const shelfMap = screen.getByRole("region", { name: /shelf navigation map/i });
    const typedPanel = screen.getByRole("region", { name: /typed question input/i });
    const compactInput = screen.getByLabelText("Type your question");

    fireEvent.change(compactInput, { target: { value: "Panadol ada stock?" } });
    fireEvent.click(screen.getByRole("button", { name: "Open typing screen" }));

    const dialog = screen.getByRole("dialog", { name: /VitaKiosk typing screen/i });
    const overlayRoot = dialog.closest("[data-overlay-root='typing-screen']");
    expect(dialog).toHaveAttribute("data-overlay", "typing-screen");
    expect(overlayRoot).toBeTruthy();
    expect(typedPanel.contains(overlayRoot)).toBe(false);
    expect(shelfMap.contains(overlayRoot)).toBe(false);
    expect(overlayRoot?.parentElement).toBe(document.body);
    expect(screen.getByLabelText("Typing screen draft")).toHaveValue("Panadol ada stock?");

    await waitFor(() => {
      expect(screen.getByLabelText("Typing screen draft")).toHaveFocus();
    });
  });

  it("does not render mock placeholders before a live VitaFlow query", async () => {
    hookMocks.runtimeStatus.mockResolvedValueOnce({
      stt_provider: "elevenlabs",
      ai_provider: "agnes",
      tts_provider: "elevenlabs",
      vitaflow_provider: "readonly_api",
      vision_provider: "agnes",
      ollama_reachable: false,
      agnes_reachable: true,
      vitaflow_reachable: true,
      model: "agnes-2.0-flash",
    });
    hookMocks.voice.mockReturnValue({
      ...hookMocks.voice(),
      product: null,
      productCandidates: [],
      promotions: [],
      leaflets: [],
      uiActions: [],
      transcript: "",
      responseText: "",
      purchasingQueryId: null,
      hasResult: false,
    });

    render(<App />);

    await waitFor(() => expect(hookMocks.runtimeStatus).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Ready for product search")).toBeInTheDocument();
    expect(screen.queryByText("Relief Balm")).not.toBeInTheDocument();
    expect(screen.queryByText("MOCK-P001")).not.toBeInTheDocument();
    expect(screen.queryByText(/Mock VitaFlow/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^MOCK\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fictional demo data/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mock-first demo/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("VitaFlow ERP").length).toBeGreaterThan(0);
  });

  it("accepts external keyboard text including Chinese and Malay in native mode", () => {
    render(<App />);

    const input = screen.getByLabelText("Type your question");
    fireEvent.change(input, { target: { value: "这个 probiotic 有 promotion 吗?" } });
    expect(input).toHaveValue("这个 probiotic 有 promotion 吗?");

    fireEvent.change(input, { target: { value: "Ada ubat batuk?" } });
    expect(input).toHaveValue("Ada ubat batuk?");
  });

  it("opens an intentional full-screen typing modal in popup mode and preserves the draft on close", () => {
    vi.stubEnv("VITE_TEXT_INPUT_MODE", "popup");
    render(<App />);

    const compactInput = screen.getByLabelText("Type your question");
    fireEvent.change(compactInput, { target: { value: "Panadol ada stock 吗?" } });
    fireEvent.click(screen.getByRole("button", { name: "Open typing screen" }));

    const dialog = screen.getByRole("dialog", { name: /VitaKiosk typing screen/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("Typing screen draft")).toHaveValue("Panadol ada stock 吗?");
    expect(screen.queryByRole("group", { name: "Input language preference" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "English keyboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Chinese keyboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bahasa Melayu keyboard/i })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "English virtual keyboard" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Use the device keyboard for Chinese pinyin or external keyboard input.");
    expect(dialog).not.toHaveTextContent("中文");
    expect(within(dialog).queryByRole("button", { name: /Type 这个/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close typing screen" }));
    expect(screen.queryByRole("dialog", { name: /VitaKiosk typing screen/i })).not.toBeInTheDocument();
    expect(compactInput).toHaveValue("Panadol ada stock 吗?");
  });

  it("shows an EN QWERTY virtual keyboard that types, spaces, and backspaces the draft", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Open typing screen" }));
    const dialog = screen.getByRole("dialog", { name: /VitaKiosk typing screen/i });
    const draft = screen.getByLabelText("Typing screen draft");

    fireEvent.click(within(dialog).getByRole("button", { name: "Type Q" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Type W" }));
    expect(draft).toHaveValue("qw");

    fireEvent.click(within(dialog).getByRole("button", { name: "Space" }));
    expect(draft).toHaveValue("qw ");

    fireEvent.click(within(dialog).getByRole("button", { name: "Backspace" }));
    expect(draft).toHaveValue("qw");
  });

  it("does not show a Chinese virtual keyboard mode and keeps native Chinese IME typing available", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Open typing screen" }));
    const dialog = screen.getByRole("dialog", { name: /VitaKiosk typing screen/i });
    const draft = screen.getByLabelText("Typing screen draft");

    await waitFor(() => {
      expect(draft).toHaveFocus();
    });
    expect(within(dialog).queryByRole("group", { name: "Input language preference" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "English keyboard" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Chinese keyboard" })).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("region", { name: "Chinese device keyboard guidance" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Use device Chinese keyboard" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("region", { name: "Chinese candidates" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("status", { name: "Pinyin composition" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Insert candidate/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("group", { name: "Chinese pinyin virtual keyboard" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("group", { name: "English virtual keyboard" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Use the device keyboard for Chinese pinyin or external keyboard input.");
    expect(dialog).not.toHaveTextContent("中文");

    fireEvent.change(draft, { target: { value: "这个 probiotic 有 promotion 吗?" } });
    expect(draft).toHaveValue("这个 probiotic 有 promotion 吗?");
  });

  it("sends and clears text from the popup typing screen", () => {
    vi.stubEnv("VITE_TEXT_INPUT_MODE", "popup");
    render(<App />);

    const compactInput = screen.getByLabelText("Type your question");
    fireEvent.click(screen.getByRole("button", { name: "Open typing screen" }));
    fireEvent.change(screen.getByLabelText("Typing screen draft"), {
      target: { value: "Panadol ada stock 吗?" },
    });
    const dialog = screen.getByRole("dialog", { name: /VitaKiosk typing screen/i });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send typed question" }));

    expect(submitText).toHaveBeenCalledWith("Panadol ada stock 吗?");
    expect(compactInput).toHaveValue("");
    expect(screen.queryByRole("dialog", { name: /VitaKiosk typing screen/i })).not.toBeInTheDocument();
  });

  it("clear button empties compact and popup drafts without submitting", () => {
    vi.stubEnv("VITE_TEXT_INPUT_MODE", "popup");
    render(<App />);

    const compactInput = screen.getByLabelText("Type your question");
    fireEvent.change(compactInput, { target: { value: "这个 probiotic 有 promotion 吗?" } });
    fireEvent.click(screen.getByRole("button", { name: "Open typing screen" }));
    const dialog = screen.getByRole("dialog", { name: /VitaKiosk typing screen/i });
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear typed question" }));

    expect(compactInput).toHaveValue("");
    expect(screen.getByLabelText("Typing screen draft")).toHaveValue("");
    expect(submitText).not.toHaveBeenCalled();
  });

  it("clears typed input and closes the typing modal when starting a new customer", () => {
    vi.stubEnv("VITE_TEXT_INPUT_MODE", "popup");
    render(<App />);

    const input = screen.getByLabelText("Type your question");
    fireEvent.change(input, { target: { value: "Panadol ada stock 吗?" } });
    fireEvent.click(screen.getByRole("button", { name: "Open typing screen" }));
    expect(screen.getByRole("dialog", { name: /VitaKiosk typing screen/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(input).toHaveValue("");
    expect(screen.queryByRole("dialog", { name: /VitaKiosk typing screen/i })).not.toBeInTheDocument();
    expect(resetVoice).toHaveBeenCalledTimes(1);
  });

  it("auto-resets the kiosk after showing pharmacist escalation confirmation", async () => {
    vi.useFakeTimers();
    try {
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Request assistance" }));
      });

      expect(screen.getAllByText("Pharmacist Requested").length).toBeGreaterThan(0);

      act(() => {
        vi.advanceTimersByTime(15_000);
      });

      expect(resetVoice).toHaveBeenCalledTimes(1);
      expect(sendState).toHaveBeenCalledWith("idle");
      expect(screen.getByRole("button", { name: "Tap to Speak" })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });
});
