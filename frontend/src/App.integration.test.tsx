import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";


const hookMocks = vi.hoisted(() => ({
  socket: vi.fn(),
  voice: vi.fn(),
  escalate: vi.fn(),
}));

vi.mock("./api/client", () => ({
  api: { escalatePharmacist: hookMocks.escalate },
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
    startRecording.mockReset();
    stopRecording.mockReset();
    submitText.mockReset();
    resetVoice.mockReset();
    sendState.mockReset();
    vi.unstubAllEnvs();
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
    expect(screen.getByText("Relief Balm Demo Leaflet")).toBeInTheDocument();
    expect(screen.getAllByText(/Mock VitaFlow/i).length).toBeGreaterThan(0);
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
    expect(screen.getByRole("button", { name: "Close leaflet preview" })).toBeInTheDocument();
    expect(screen.queryByText(/NAVIGATE_UNSAFE_DEBUG_PAGE/i)).not.toBeInTheDocument();
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

    expect(screen.getByText("Campaign gallery")).toBeInTheDocument();
    expect(screen.getByText("Hydration Health Campaign")).toBeInTheDocument();
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

  it("renders a typed accessibility input below the shelf map and submits through the existing AI flow", () => {
    render(<App />);

    const shelfMap = screen.getByRole("region", { name: /shelf navigation map/i });
    const typedPanel = screen.getByRole("region", { name: /typed question input/i });
    expect(
      shelfMap.compareDocumentPosition(typedPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const input = screen.getByLabelText("Type your question");
    fireEvent.change(input, { target: { value: "Where is Panadol?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send typed question" }));

    expect(submitText).toHaveBeenCalledWith("Where is Panadol?");
    expect(startRecording).not.toHaveBeenCalled();
  });

  it("opens and closes the touch popup keyboard in popup mode", () => {
    vi.stubEnv("VITE_TEXT_INPUT_MODE", "popup");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Open kiosk keyboard" }));

    expect(screen.getByRole("dialog", { name: /VitaKiosk touch keyboard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English keyboard" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Close touch keyboard" }));
    expect(screen.queryByRole("dialog", { name: /VitaKiosk touch keyboard/i })).not.toBeInTheDocument();
  });

  it("does not force the custom keyboard in native mode", () => {
    vi.stubEnv("VITE_TEXT_INPUT_MODE", "native");
    render(<App />);

    expect(screen.queryByRole("button", { name: "Open kiosk keyboard" })).not.toBeInTheDocument();
    fireEvent.focus(screen.getByLabelText("Type your question"));
    expect(screen.queryByRole("dialog", { name: /VitaKiosk touch keyboard/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Device keyboard mode/i)).toBeInTheDocument();
  });

  it("switches popup keyboard language modes and supports simplified Chinese quick input", () => {
    vi.stubEnv("VITE_TEXT_INPUT_MODE", "popup");
    vi.stubEnv("VITE_KEYBOARD_DEFAULT_LANGUAGE", "bm");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Open kiosk keyboard" }));
    expect(screen.getByRole("button", { name: "Bahasa Melayu keyboard" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Chinese keyboard" }));
    expect(screen.getByRole("button", { name: "Chinese keyboard" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Type 这个" }));

    expect(screen.getByLabelText("Type your question")).toHaveValue("这个");
  });

  it("clears typed input and closes the keyboard when starting a new customer", () => {
    vi.stubEnv("VITE_TEXT_INPUT_MODE", "popup");
    render(<App />);

    const input = screen.getByLabelText("Type your question");
    fireEvent.change(input, { target: { value: "Panadol ada stock 吗?" } });
    fireEvent.click(screen.getByRole("button", { name: "Open kiosk keyboard" }));
    expect(screen.getByRole("dialog", { name: /VitaKiosk touch keyboard/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(input).toHaveValue("");
    expect(screen.queryByRole("dialog", { name: /VitaKiosk touch keyboard/i })).not.toBeInTheDocument();
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
