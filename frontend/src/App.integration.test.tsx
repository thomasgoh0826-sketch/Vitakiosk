import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";


const hookMocks = vi.hoisted(() => ({
  socket: vi.fn(),
  voice: vi.fn(),
}));

vi.mock("./hooks/useKioskSocket", () => ({ default: hookMocks.socket }));
vi.mock("./hooks/useVoiceInteraction", () => ({ default: hookMocks.voice }));


describe("integrated kiosk panels", () => {
  beforeEach(() => {
    hookMocks.socket.mockReturnValue({
      connected: true,
      state: "idle",
      sendState: vi.fn(),
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
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
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
});
