import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

const hookMocks = vi.hoisted(() => ({
  socket: vi.fn(),
  voice: vi.fn(),
  escalate: vi.fn(),
  health: vi.fn(),
  runtimeStatus: vi.fn(),
}));

vi.mock("./api/client", () => ({
  api: {
    escalatePharmacist: hookMocks.escalate,
    health: hookMocks.health,
    runtimeStatus: hookMocks.runtimeStatus,
  },
}));
vi.mock("./hooks/useKioskSocket", () => ({ default: hookMocks.socket }));
vi.mock("./hooks/useVoiceInteraction", () => ({ default: hookMocks.voice }));

describe("integrated kiosk panels", () => {
  const startRecording = vi.fn();
  const stopRecording = vi.fn();
  const submitText = vi.fn();
  const resetVoice = vi.fn();
  const sendState = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    startRecording.mockReset();
    stopRecording.mockReset();
    submitText.mockReset();
    resetVoice.mockReset();
    sendState.mockReset();
    hookMocks.health.mockReset();
    hookMocks.runtimeStatus.mockReset();
    vi.unstubAllEnvs();
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
          display_priority: 20,
          source: "mock_vitaflow",
        },
      ],
      uiActions: [],
      transcript: "what is the price of relief balm",
      poster: null,
      responseText: "VitaFlow mock price for Relief Balm: $12.50.",
      purchasingQueryId: null,
      escalationId: null,
      hasResult: true,
      error: null,
      startRecording,
      stopRecording,
      submitText,
      reset: resetVoice,
    });
  });

  it("renders trusted mock response data across product panels", () => {
    render(<App />);

    expect(screen.getAllByText("Relief Balm").length).toBeGreaterThan(0);
    expect(screen.getByText("$12.50")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open Relief Balm Demo Leaflet leaflet/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Promotion" })).not.toHaveTextContent("Relief Balm Demo Leaflet");
    expect(screen.getAllByText(/Mock VitaFlow/i).length).toBeGreaterThan(0);
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
    expect(screen.getByText("$12.50")).toBeInTheDocument();
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
        "VitaFlow mock price for Relief Balm: $12.50. It is shown from Mock VitaFlow data.",
    });

    render(<App />);

    expect(screen.queryByText("what is the price of relief balm")).not.toBeInTheDocument();
    expect(screen.getByText("VitaFlow mock price for Relief Balm: $12.50.")).toBeInTheDocument();
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

  it("shows general promotion and campaign galleries from controlled actions", () => {
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
    expect(screen.getByText("Best match")).toBeInTheDocument();
    const candidateButton = screen.getByRole("button", {
      name: /select item: relief balm/i,
    });
    expect(candidateButton).toHaveTextContent("MOCK-P001");
    expect(candidateButton).toHaveTextContent("$12.50");
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

    fireEvent.change(draft, { target: { value: "è¿™ä¸ª probiotic æœ‰ promotion å—?" } });
    expect(draft).toHaveValue("è¿™ä¸ª probiotic æœ‰ promotion å—?");
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
