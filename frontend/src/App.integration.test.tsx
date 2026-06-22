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
  const resetVoice = vi.fn();
  const sendState = vi.fn();

  beforeEach(() => {
    startRecording.mockReset();
    stopRecording.mockReset();
    resetVoice.mockReset();
    sendState.mockReset();
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
      poster: null,
      responseText: "VitaFlow mock price for Relief Balm: $12.50.",
      purchasingQueryId: null,
      escalationId: null,
      hasResult: true,
      error: null,
      startRecording,
      stopRecording,
      reset: resetVoice,
    });
  });

  it("renders trusted mock response data across product panels", () => {
    render(<App />);

    expect(screen.getAllByText("Relief Balm").length).toBeGreaterThan(0);
    expect(screen.getByText("$12.50")).toBeInTheDocument();
    expect(screen.getByText("Relief Balm Demo Offer")).toBeInTheDocument();
    expect(screen.getAllByText(/Mock VitaFlow/i).length).toBeGreaterThan(0);
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

    expect(await screen.findByText("Pharmacist requested")).toBeInTheDocument();
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

    expect(await screen.findByText("Pharmacist requested")).toBeInTheDocument();
    expect(screen.getByText(/ESC-0099/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start New Customer" }));

    expect(resetVoice).toHaveBeenCalledTimes(1);
    expect(sendState).toHaveBeenCalledWith("idle");
    expect(screen.getByRole("button", { name: "Tap to Speak" })).toBeEnabled();
    expect(screen.getByText("Pharmacist assistance")).toBeInTheDocument();
    expect(screen.queryByText("Pharmacist requested")).not.toBeInTheDocument();
    expect(hookMocks.voice.mock.calls.at(-1)?.[0]?.sessionId).not.toBe(firstSessionId);

    fireEvent.click(screen.getByRole("button", { name: "Tap to Speak" }));
    expect(startRecording).toHaveBeenCalledTimes(1);
    expect(hookMocks.escalate).toHaveBeenCalledTimes(1);
  });

  it("auto-resets the kiosk after showing pharmacist escalation confirmation", async () => {
    vi.useFakeTimers();
    try {
      render(<App />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Request assistance" }));
      });

      expect(screen.getByText("Pharmacist requested")).toBeInTheDocument();

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
