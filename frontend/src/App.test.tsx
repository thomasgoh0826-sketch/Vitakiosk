import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";

const apiMocks = vi.hoisted(() => ({
  escalatePharmacist: vi.fn(),
  runtimeStatus: vi.fn(),
}));

vi.mock("./api/client", () => ({
  api: {
    escalatePharmacist: apiMocks.escalatePharmacist,
    runtimeStatus: apiMocks.runtimeStatus,
  },
}));

describe("VitaKiosk shell", () => {
  beforeEach(() => {
    apiMocks.runtimeStatus.mockReset();
    apiMocks.runtimeStatus.mockResolvedValue({
      stt_provider: "mock",
      ai_provider: "mock",
      tts_provider: "mock",
      vitaflow_provider: "mock",
      vision_provider: "mock",
      ollama_reachable: false,
      model: "qwen2.5:7b",
    });
    apiMocks.escalatePharmacist.mockReset();
    apiMocks.escalatePharmacist.mockResolvedValue({
      id: "ESC-TEST",
      status: "waiting_for_pharmacist",
      source: "mock_memory",
    });
  });

  it("renders every required kiosk region", () => {
    render(<App />);

    for (const name of [
      /^AI assistant$/i,
      /^Voice assistant controls$/i,
      /^Product$/i,
      /^Promotion$/i,
      /^Shelf navigation map$/i,
      /^ERP data$/i,
      /^Pharmacist assistance$/i,
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Tap to Speak" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.queryByText(/Hold to Speak/i)).not.toBeInTheDocument();
  });

  it("labels mock-provider data as fictional after provider status loads", async () => {
    render(<App />);

    expect((await screen.findAllByText(/Mock VitaFlow/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Fictional demo data/i)).toBeInTheDocument();
  });
});
