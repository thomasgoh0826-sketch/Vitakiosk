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
  currentTime = 0;

  constructor(_url: string) {}

  play() {
    queueMicrotask(() => this.onended?.());
    return Promise.resolve();
  }

  pause() {}
}

class DeferredFakeAudio {
  static instances: DeferredFakeAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentTime = 0;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();

  constructor(_url: string) {
    DeferredFakeAudio.instances.push(this);
  }

  finish() {
    this.onended?.();
  }
}

class GestureBlockedOnceAudio {
  static instances: GestureBlockedOnceAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentTime = 0;
  playCalls = 0;
  pause = vi.fn();

  constructor(_url: string) {
    GestureBlockedOnceAudio.instances.push(this);
  }

  play() {
    this.playCalls += 1;
    if (this.playCalls === 1) {
      const error = new Error("Autoplay blocked");
      error.name = "NotAllowedError";
      return Promise.reject(error);
    }
    return Promise.resolve();
  }

  finish() {
    this.onended?.();
  }
}

class PlaybackErrorAudio {
  static instances: PlaybackErrorAudio[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentTime = 0;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();

  constructor(_url: string) {
    PlaybackErrorAudio.instances.push(this);
  }

  fail() {
    this.onerror?.();
  }
}

class FakeAnalyser {
  fftSize = 256;

  getByteTimeDomainData(samples: Uint8Array) {
    samples.fill(128);
  }

  connect() {}

  disconnect() {}
}

class FakeAudioContext {
  static startedSources: FakeBufferSource[] = [];
  static autoEndSources = true;
  analyser = new FakeAnalyser();
  destination = {};
  state = "running";

  createMediaStreamSource(_stream: MediaStream) {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }

  createMediaElementSource(_audio: HTMLAudioElement) {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }

  createAnalyser() {
    return this.analyser;
  }

  createBufferSource() {
    const source = new FakeBufferSource();
    FakeAudioContext.startedSources.push(source);
    return source;
  }

  decodeAudioData(_buffer: ArrayBuffer) {
    return Promise.resolve({ duration: 1 } as AudioBuffer);
  }

  resume() {
    this.state = "running";
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

class FakeBufferSource {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn(() => {
    if (FakeAudioContext.autoEndSources) {
      window.setTimeout(() => this.onended?.(), 20);
    }
  });
  stop = vi.fn();
}

class ActiveFakeAnalyser extends FakeAnalyser {
  getByteTimeDomainData(samples: Uint8Array) {
    samples.fill(180);
  }
}

class ActiveFakeAudioContext extends FakeAudioContext {
  analyser = new ActiveFakeAnalyser();
}

function buildApi(redFlag = false, unclear = false, correctedTranscript?: string) {
  return {
    transcribe: vi.fn().mockResolvedValue({
      transcript: unclear ? "" : redFlag ? "I cannot breathe" : "price of relief balm",
      provider: "mock_stt",
      language: unclear ? "unknown" : "english",
      confidence: unclear ? 0.2 : 1,
      clarification_needed: unclear,
      corrected_transcript: correctedTranscript
        ?? (unclear ? "" : redFlag ? "I cannot breathe" : "price of relief balm"),
      detected_terms: [],
      possible_product_matches: [],
    }),
    respond: vi.fn().mockResolvedValue(
      redFlag
        ? {
            intent: "red_flag",
            message: "A pharmacist has been asked to assist.",
            requires_pharmacist: true,
            product: null,
            promotions: [],
            leaflets: [],
            ui_actions: [{ type: "REQUEST_PHARMACIST_ASSISTANCE" }],
            purchasing_query_id: null,
            escalation_id: "ESC-0001",
            safety_reason: "red_flag",
            source: "mock_ai",
          }
        : {
            intent: "price_check",
            message: "VitaFlow mock price for Relief Balm: RM12.50.",
            requires_pharmacist: false,
            product,
            promotions: [promotion],
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
            ],
            ui_actions: [
              { type: "SHOW_PRODUCT", productId: "MOCK-P001" },
              { type: "SHOW_PROMOTION_LEAFLET", promotionId: "MOCK-LF-PROMO-001" },
            ],
            product_candidates: [],
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
    scanProduct: vi.fn(),
  };
}


describe("useVoiceInteraction", () => {
  beforeEach(() => {
    FakeAudioContext.startedSources = [];
    FakeAudioContext.autoEndSources = true;
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
    (globalThis as typeof globalThis & { AudioContext?: typeof AudioContext }).AudioContext =
      FakeAudioContext as unknown as typeof AudioContext;
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeAudioContext,
    });
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
      "auto",
    );
    expect(api.synthesize).toHaveBeenCalledTimes(1);
    expect(result.current.product).toEqual(product);
    expect(result.current.promotions).toEqual([promotion]);
    expect(result.current.transcript).toBe("price of relief balm");
    expect(result.current.leaflets[0].id).toBe("MOCK-LF-PROMO-001");
    expect(result.current.uiActions.map((action) => action.type)).toEqual([
      "SHOW_PRODUCT",
      "SHOW_PROMOTION_LEAFLET",
    ]);
    expect(result.current.poster?.id).toBe("MOCK-POSTER001");
    expect(sendState).toHaveBeenCalledWith("idle");
  });

  it("enters speaking while successful TTS audio plays and returns ready when audio ends", async () => {
    FakeAudioContext.autoEndSources = false;
    DeferredFakeAudio.instances = [];
    vi.stubGlobal("Audio", DeferredFakeAudio);
    const api = buildApi();
    const sendState = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-speaking",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState,
      }),
    );

    let workflow: Promise<void> | undefined;
    act(() => {
      workflow = result.current.submitText("Where is Relief Balm?");
    });

    await waitFor(() => expect(result.current.state).toBe("speaking"));
    expect(result.current.audioPlaybackBlocked).toBe(false);
    await waitFor(() =>
      expect(FakeAudioContext.startedSources.at(-1)?.start).toHaveBeenCalledTimes(1),
    );
    expect(DeferredFakeAudio.instances.at(-1)?.play).toHaveBeenCalledTimes(1);
    expect(sendState).toHaveBeenCalledWith("speaking");

    act(() => FakeAudioContext.startedSources.at(-1)?.onended?.());
    await act(async () => {
      await workflow;
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(sendState).toHaveBeenCalledWith("idle");
  });

  it("automatically retries voice playback when the first browser play call is blocked", async () => {
    vi.stubGlobal("AudioContext", undefined);
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: undefined,
    });
    GestureBlockedOnceAudio.instances = [];
    vi.stubGlobal("Audio", GestureBlockedOnceAudio);
    const api = buildApi();
    const sendState = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-autoplay-blocked",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState,
      }),
    );

    let workflow: Promise<void> | undefined;
    act(() => {
      workflow = result.current.submitText("Where is Relief Balm?");
    });

    await waitFor(() => expect(result.current.state).toBe("speaking"));
    expect(result.current.error).toBeNull();
    expect(result.current.responseText).toBe("VitaFlow mock price for Relief Balm: RM12.50.");
    expect(GestureBlockedOnceAudio.instances.at(-1)?.playCalls).toBe(2);

    act(() => GestureBlockedOnceAudio.instances.at(-1)?.finish());
    await act(async () => {
      await workflow;
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.audioPlaybackBlocked).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("keeps the typed AI answer visible when ElevenLabs TTS is unavailable", async () => {
    const api = buildApi();
    api.synthesize.mockRejectedValueOnce(new Error("TTS provider request failed"));
    const sendState = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-tts-unavailable",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState,
      }),
    );

    await act(async () => result.current.submitText("Where is Relief Balm?"));

    expect(result.current.state).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.responseText).toBe("VitaFlow mock price for Relief Balm: RM12.50.");
    expect(result.current.product).toEqual(product);
    expect(sendState).toHaveBeenCalledWith("idle");
  });

  it("keeps the typed AI answer visible without switching to error or tap-to-play when audio playback fails", async () => {
    vi.stubGlobal("AudioContext", undefined);
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: undefined,
    });
    PlaybackErrorAudio.instances = [];
    vi.stubGlobal("Audio", PlaybackErrorAudio);
    const api = buildApi();
    const sendState = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-audio-error",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState,
      }),
    );

    let workflow: Promise<void> | undefined;
    act(() => {
      workflow = result.current.submitText("Where is Relief Balm?");
    });

    await waitFor(() => expect(result.current.state).toBe("speaking"));
    act(() => PlaybackErrorAudio.instances.at(-1)?.fail());
    await act(async () => {
      await workflow;
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.audioPlaybackBlocked).toBe(false);
    expect(result.current.responseText).toBe("VitaFlow mock price for Relief Balm: RM12.50.");
    expect(result.current.product).toEqual(product);
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
        "auto",
      );
      expect(api.synthesize).toHaveBeenCalledTimes(1);
      await act(async () => {
        vi.advanceTimersByTime(30);
        await Promise.resolve();
      });
      expect(result.current.state).toBe("idle");
      expect(sendState).toHaveBeenCalledWith("thinking");
      expect(sendState).toHaveBeenCalledWith("idle");
    } finally {
      vi.useRealTimers();
    }
  });

  it("exposes microphone analyser activity while listening so the assistant waveform can react", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("AudioContext", ActiveFakeAudioContext);
    try {
      const api = buildApi();
      const { result } = renderHook(() =>
        useVoiceInteraction({
          sessionId: "session-mic-activity",
          branchId: "SG-001",
          api,
          serverState: "idle" as AvatarState,
          sendState: vi.fn(),
        }),
      );

      await act(async () => result.current.startRecording());
      expect(result.current.state).toBe("listening");
      expect(result.current.audioActivity).toBe(0);

      await act(async () => {
        vi.advanceTimersByTime(MIN_RECORDING_MS + 120);
        await Promise.resolve();
      });

      expect(result.current.state).toBe("listening");
      expect(result.current.audioActivity).toBeGreaterThan(SILENCE_RMS_THRESHOLD);
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

  it("speaks a clarification and does not call AI when speech is unclear", async () => {
    const api = buildApi(false, true);
    const sendState = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-unclear",
        branchId: "SG-001",
        api,
        serverState: "idle",
        sendState,
      }),
    );

    await act(async () => result.current.startRecording());
    await act(async () => result.current.stopRecording());

    await waitFor(() => expect(api.synthesize).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.state).toBe("idle"));

    expect(result.current.state).toBe("idle");
    expect(result.current.transcript).toBe("");
    expect(result.current.responseText).toBe(
      "I did not catch that clearly. Please tap to speak and try again.",
    );
    expect(result.current.hasResult).toBe(false);
    expect(api.respond).not.toHaveBeenCalled();
    expect(api.synthesize).toHaveBeenCalledWith(
      "session-unclear",
      "I did not catch that clearly. Please tap to speak and try again.",
    );
    expect(sendState).toHaveBeenCalledWith("speaking");
    expect(sendState).toHaveBeenCalledWith("idle");
  });

  it("uses corrected transcript for the safety and AI response workflow", async () => {
    const api = buildApi(false, false, "price of Panadol");
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-corrected",
        branchId: "SG-001",
        api,
        serverState: "idle",
        sendState: vi.fn(),
      }),
    );

    await act(async () => result.current.startRecording());
    await act(async () => result.current.stopRecording());

    expect(result.current.transcript).toBe("price of relief balm");
    expect(api.respond).toHaveBeenCalledWith(
      "session-corrected",
      "price of Panadol",
      "SG-001",
      "auto",
    );
  });

  it("submits typed text through the same AI response and TTS workflow without STT", async () => {
    const api = buildApi();
    const sendState = vi.fn();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-typed",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState,
      }),
    );

    await act(async () => result.current.submitText("Where is Panadol?"));
    await waitFor(() => expect(result.current.state).toBe("idle"));

    expect(api.transcribe).not.toHaveBeenCalled();
    expect(api.respond).toHaveBeenCalledWith(
      "session-typed",
      "Where is Panadol?",
      "SG-001",
      "auto",
    );
    expect(api.synthesize).toHaveBeenCalledTimes(1);
    expect(result.current.transcript).toBe("Where is Panadol?");
    expect(result.current.product).toEqual(product);
    expect(result.current.leaflets[0].id).toBe("MOCK-LF-PROMO-001");
    expect(sendState).toHaveBeenCalledWith("thinking");
    expect(sendState).toHaveBeenCalledWith("idle");
  });

  it("keeps typed pregnancy questions in pharmacist escalation without TTS playback", async () => {
    const api = buildApi();
    api.respond.mockResolvedValueOnce({
      intent: "red_flag",
      message:
        "For your safety, please speak with our pharmacist before taking supplements during pregnancy.",
      requires_pharmacist: true,
      product: null,
      promotions: [],
      leaflets: [],
      ui_actions: [{ type: "REQUEST_PHARMACIST_ASSISTANCE" }],
      purchasing_query_id: null,
      escalation_id: "ESC-PREGNANCY",
      safety_reason: "pregnancy",
      source: "mock_ai",
    });
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-typed-pregnancy",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState: vi.fn(),
      }),
    );

    await act(async () =>
      result.current.submitText("I am pregnant, can I take this supplement?"),
    );

    expect(api.transcribe).not.toHaveBeenCalled();
    expect(api.respond).toHaveBeenCalledWith(
      "session-typed-pregnancy",
      "I am pregnant, can I take this supplement?",
      "SG-001",
      "auto",
    );
    expect(result.current.state).toBe("pharmacist_escalation");
    expect(result.current.escalationId).toBe("ESC-PREGNANCY");
    expect(result.current.purchasingQueryId).toBeNull();
    expect(api.synthesize).not.toHaveBeenCalled();
  });

  it("keeps unknown typed products in purchasing query flow without guessing a product", async () => {
    const api = buildApi();
    api.respond.mockResolvedValueOnce({
      intent: "unknown_product",
      message:
        "I could not find that product in VitaFlow. I have created a purchasing query for the team.",
      requires_pharmacist: false,
      product: null,
      promotions: [],
      leaflets: [],
      ui_actions: [],
      purchasing_query_id: "PQ-TYPED-0001",
      escalation_id: null,
      safety_reason: null,
      source: "mock_ai",
    });
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-typed-unknown",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState: vi.fn(),
      }),
    );

    await act(async () => result.current.submitText("Do you have dragon miracle capsule?"));
    await waitFor(() => expect(result.current.state).toBe("idle"));

    expect(result.current.product).toBeNull();
    expect(result.current.purchasingQueryId).toBe("PQ-TYPED-0001");
    expect(api.synthesize).toHaveBeenCalledTimes(1);
  });

  it("keeps the current product when an affirmative reply opens branch leaflets", async () => {
    const api = buildApi();
    api.respond
      .mockResolvedValueOnce({
        intent: "product_search",
        message:
          "This product does not have a specific promotion now. I can show other active promotions or health campaigns if you are interested.",
        requires_pharmacist: false,
        product,
        promotions: [],
        leaflets: [],
        ui_actions: [{ type: "SHOW_PRODUCT", productId: "MOCK-P001" }],
        product_candidates: [],
        purchasing_query_id: null,
        escalation_id: null,
        safety_reason: null,
        source: "mock_vitaflow",
      })
      .mockResolvedValueOnce({
        intent: "promotion_check",
        message: "Here are the active branch promotion leaflets.",
        requires_pharmacist: false,
        product: null,
        promotions: [],
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
        ],
        ui_actions: [
          { type: "SHOW_PROMOTION_GALLERY" },
          { type: "OPEN_PROMOTION_MODAL", promotionId: "MOCK-LF-PROMO-001" },
        ],
        product_candidates: [],
        purchasing_query_id: null,
        escalation_id: null,
        safety_reason: null,
        source: "mock_vitaflow",
      });
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-leaflet-yes",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState: vi.fn(),
      }),
    );

    await act(async () => result.current.submitText("buffered c"));
    await waitFor(() => expect(result.current.product?.id).toBe("MOCK-P001"));

    await act(async () => result.current.submitText("yes interested"));
    await waitFor(() => expect(result.current.responseText).toContain("active branch promotion"));

    expect(result.current.product?.id).toBe("MOCK-P001");
    expect(result.current.purchasingQueryId).toBeNull();
  });

  it("clears a stale product when a different explicit product query needs clarification", async () => {
    const api = buildApi();
    api.respond
      .mockResolvedValueOnce({
        intent: "product_search",
        message: "I found Buffered C.",
        requires_pharmacist: false,
        product,
        promotions: [],
        leaflets: [],
        ui_actions: [{ type: "SHOW_PRODUCT", productId: product.id }],
        product_candidates: [],
        purchasing_query_id: null,
        escalation_id: null,
        safety_reason: null,
        source: "vitaflow_erp",
      })
      .mockResolvedValueOnce({
        intent: "product_search",
        message:
          "Please give me a product name, brand, barcode, or label details so I can check VitaFlow.",
        requires_pharmacist: false,
        product: null,
        promotions: [],
        leaflets: [],
        ui_actions: [],
        product_candidates: [],
        purchasing_query_id: null,
        escalation_id: null,
        safety_reason: null,
        source: "vitaflow_erp",
      });
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-product-switch",
        branchId: "JK",
        api,
        serverState: "idle" as AvatarState,
        sendState: vi.fn(),
      }),
    );

    await act(async () => result.current.submitText("buffered c"));
    await waitFor(() => expect(result.current.product?.id).toBe(product.id));

    await act(async () => result.current.submitText("fisher man"));
    await waitFor(() => expect(result.current.responseText).toContain("product name"));

    expect(result.current.product).toBeNull();
  });

  it("preserves fuzzy product candidates without creating a purchasing query", async () => {
    const api = buildApi();
    api.respond.mockResolvedValueOnce({
      intent: "product_search",
      message: "Do you mean Relief Balm?",
      requires_pharmacist: false,
      product: null,
      promotions: [],
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
      ],
      ui_actions: [],
      product_candidates: [
        {
          product,
          confidence: 0.91,
          match_reason: "near_name_match",
          matched_text: "Relief Bomb",
        },
      ],
      purchasing_query_id: null,
      escalation_id: null,
      safety_reason: null,
      source: "mock_vitaflow",
    });
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-fuzzy",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState: vi.fn(),
      }),
    );

    await act(async () => result.current.submitText("Where is Relief Bomb?"));
    await waitFor(() => expect(result.current.state).toBe("idle"));

    expect(result.current.product).toBeNull();
    expect(result.current.purchasingQueryId).toBeNull();
    expect(result.current.productCandidates[0].product.name).toBe("Relief Balm");
    expect(result.current.productCandidates[0].match_reason).toBe("near_name_match");
    expect(api.synthesize).toHaveBeenCalledWith("session-fuzzy", "Do you mean Relief Balm?");
  });

  it("sends the selected preferred language through typed and voice workflows", async () => {
    const api = buildApi();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-language",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState: vi.fn(),
        preferredLanguage: "zh",
      }),
    );

    await act(async () => result.current.submitText("Where is Panadol?"));
    await waitFor(() => expect(result.current.state).toBe("idle"));

    expect(api.respond).toHaveBeenLastCalledWith(
      "session-language",
      "Where is Panadol?",
      "SG-001",
      "zh",
    );
  });

  it("sends a confirmed scanned product as context for the next follow-up", async () => {
    const api = buildApi();
    const { result } = renderHook(() =>
      useVoiceInteraction({
        sessionId: "session-scan-followup",
        branchId: "SG-001",
        api,
        serverState: "idle" as AvatarState,
        sendState: vi.fn(),
      }),
    );

    act(() => result.current.adoptConfirmedProduct(product));
    await act(async () =>
      result.current.submitText("What is this product for, and how should I take it?"),
    );
    await waitFor(() => expect(result.current.state).toBe("idle"));

    expect(api.respond).toHaveBeenLastCalledWith(
      "session-scan-followup",
      "What is this product for, and how should I take it?",
      "SG-001",
      "auto",
      "MOCK-P001",
    );
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
