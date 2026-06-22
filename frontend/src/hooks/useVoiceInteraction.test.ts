import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AvatarState, Product, Promotion } from "../types";
import useVoiceInteraction, {
  MIN_RECORDING_MS,
  SILENCE_RMS_THRESHOLD,
  SILENCE_STOP_MS,
} from "./useVoiceInteraction";


const product: Product = {
  id: "MOCK-P001",
  name: "Relief Balm",
  branch_id: "SG-001",
  price: 12.5,
  stock: 18,
  shelf_location: "A-03",
  source: "mock_vitaflow",
  unavailable_reason: null,
};

const promotion: Promotion = {
  id: "MOCK-PR001",
  title: "Relief Balm Demo Offer",
  branch_id: "SG-001",
  active: true,
  valid_from: "2025-01-01T00:00:00Z",
  valid_to: "2030-12-31T23:59:00Z",
  source: "mock_vitaflow",
};

class FakeMediaRecorder {
  static isTypeSupported = () => true;
  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["mock audio"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_url: string) {}

  play() {
    queueMicrotask(() => this.onended?.());
    return Promise.resolve();
  }
}

class FakeAnalyser {
  fftSize = 256;

  getByteTimeDomainData(samples: Uint8Array) {
    samples.fill(128);
  }

  disconnect() {}
}

class FakeAudioContext {
  analyser = new FakeAnalyser();

  createMediaStreamSource(_stream: MediaStream) {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }

  createAnalyser() {
    return this.analyser;
  }

  close() {
    return Promise.resolve();
  }
}

function buildApi(redFlag = false) {
  return {
    transcribe: vi.fn().mockResolvedValue({
      transcript: redFlag ? "I cannot breathe" : "price of relief balm",
      provider: "mock_stt",
    }),
    respond: vi.fn().mockResolvedValue(
      redFlag
        ? {
            intent: "red_flag",
            message: "A pharmacist has been asked to assist.",
            requires_pharmacist: true,
            product: null,
            promotions: [],
            purchasing_query_id: null,
            escalation_id: "ESC-0001",
            safety_reason: "red_flag",
            source: "mock_ai",
          }
        : {
            intent: "price_check",
            message: "VitaFlow mock price for Relief Balm: $12.50.",
            requires_pharmacist: false,
            product,
            promotions: [promotion],
            purchasing_query_id: null,
            escalation_id: null,
            safety_reason: null,
            source: "mock_vitaflow",
          },
    ),
    synthesize: vi.fn().mockResolvedValue(new Blob(["RIFFmock"], { type: "audio/wav" })),
    idlePosters: vi.fn().mockResolvedValue({
      items: [
        {
          id: "MOCK-POSTER001",
          title: "Relief Balm Demo Offer",
          branch_id: "SG-001",
          promotion_id: "MOCK-PR001",
          asset_path: "/assets/posters/mock-relief-balm.svg",
          source: "mock_vitaflow",
        },
      ],
      source: "mock_vitaflow",
    }),
    searchProducts: vi.fn(),
    matchPromotions: vi.fn(),
    createPurchasingQuery: vi.fn(),
    escalatePharmacist: vi.fn(),
  };
}


describe("useVoiceInteraction", () => {
  beforeEach(() => {
    const stopTrack = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: stopTrack }],
        }),
      },
    });
    vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("AudioContext", FakeAudioContext);
    URL.createObjectURL = vi.fn(() => "blob:mock-audio");
    URL.revokeObjectURL = vi.fn();
  });

  it("runs listening, thinking, speaking, and idle with mock adapters", async () => {
    const api = buildApi();
    const sendState = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-a",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState,
      }),
    );

    await act(async () => result.current.startRecording());
    expect(result.current.state).toBe("listening");

    await act(async () => result.current.stopRecording());
    await waitFor(() => expect(result.current.state).toBe("idle"));

    expect(api.transcribe).toHaveBeenCalledTimes(1);
    expect(api.respond).toHaveBeenCalledWith(
      "session-a",
      "price of relief balm",
      "SG-001",
    );
    expect(api.synthesize).toHaveBeenCalledTimes(1);
    expect(result.current.product).toEqual(product);
    expect(result.current.promotions).toEqual([promotion]);
    expect(result.current.poster?.id).toBe("MOCK-POSTER001");
    expect(sendState).toHaveBeenCalledWith("idle");
  });

  it("auto-stops recording after sustained microphone silence", async () => {
    vi.useFakeTimers();
    try {
      const api = buildApi();
      const sendState = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInteraction({
          sessionId: "session-auto-stop",
          branchId: "SG-001",
          api,
          serverState: "idle" as AvatarState,
          sendState,
        }),
      );

      await act(async () => result.current.startRecording());
      expect(result.current.state).toBe("listening");

      await act(async () => {
        vi.advanceTimersByTime(MIN_RECORDING_MS + SILENCE_STOP_MS + 300);
        for (let tick = 0; tick < 20; tick += 1) {
          await Promise.resolve();
        }
      });

      expect(SILENCE_RMS_THRESHOLD).toBeGreaterThan(0);
      expect(api.transcribe).toHaveBeenCalledTimes(1);
      expect(api.respond).toHaveBeenCalledWith(
        "session-auto-stop",
        "price of relief balm",
        "SG-001",
      );
      expect(api.synthesize).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe("idle");
      expect(sendState).toHaveBeenCalledWith("thinking");
      expect(sendState).toHaveBeenCalledWith("idle");
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops before TTS when safety requires pharmacist escalation", async () => {
    const api = buildApi(true);
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-red",
        branchId: "SG-001",
        api,
        serverState: "idle",
        sendState: vi.fn(),
      }),
    );

    await act(async () => result.current.startRecording());
    await act(async () => result.current.stopRecording());

    expect(result.current.state).toBe("pharmacist_escalation");
    expect(result.current.escalationId).toBe("ESC-0001");
    expect(api.synthesize).not.toHaveBeenCalled();
  });

  it("resets pharmacist escalation state for a new customer without deleting the ticket", async () => {
    const api = buildApi(true);
    const sendState = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-red",
        branchId: "SG-001",
        api,
        serverState: "idle",
        sendState,
      }),
    );

    await act(async () => result.current.startRecording());
    await act(async () => result.current.stopRecording());

    expect(result.current.state).toBe("pharmacist_escalation");
    expect(result.current.escalationId).toBe("ESC-0001");

    act(() => result.current.reset());

    expect(result.current.state).toBe("idle");
    expect(result.current.escalationId).toBeNull();
    expect(result.current.responseText).toBe("");
    expect(result.current.hasResult).toBe(false);
    expect(result.current.error).toBeNull();
    expect(sendState).toHaveBeenCalledWith("idle");
  });

  it("accepts pharmacist escalation from the server state", () => {
    const api = buildApi();
    const { result, rerender } = renderHook(
      ({ serverState }) =>
        useVoiceInteraction({
          sessionId: "session-a",
          branchId: "SG-001",
          api,
          serverState,
          sendState: vi.fn(),
        }),
      { initialProps: { serverState: "idle" as AvatarState } },
    );

    rerender({ serverState: "pharmacist_escalation" });

    expect(result.current.state).toBe("pharmacist_escalation");
  });
});
