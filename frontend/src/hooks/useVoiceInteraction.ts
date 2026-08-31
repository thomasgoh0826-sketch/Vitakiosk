import { useCallback, useEffect, useRef, useState } from "react";

import type { VitaKioskApiClient } from "../api/client";
import type {
  AvatarState,
  Leaflet,
  Poster,
  Product,
  ProductSearchCandidate,
  Promotion,
  UiAction,
} from "../types";
import { calculateAudioActivity, useAudioActivity } from "./useAudioActivity";
import type { PreferredLanguage } from "../i18n";


interface UseVoiceInteractionOptions {
  sessionId: string;
  branchId: string;
  preferredLanguage?: PreferredLanguage;
  api: VitaKioskApiClient;
  serverState: AvatarState;
  sendState: (state: AvatarState) => void;
}

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm"];
export const MIN_RECORDING_MS = 700;
export const SILENCE_STOP_MS = 1_800;
export const SILENCE_RMS_THRESHOLD = 0.018;
const SILENCE_SAMPLE_INTERVAL_MS = 100;
type AudioContextConstructor = new () => AudioContext;

function getAudioContextConstructor() {
  const browserWindow = window as typeof window & {
    webkitAudioContext?: AudioContextConstructor;
  };
  const globalScope = globalThis as typeof globalThis & {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return globalScope.AudioContext
    ?? window.AudioContext
    ?? globalScope.webkitAudioContext
    ?? browserWindow.webkitAudioContext;
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }
  if (typeof Response !== "undefined") {
    return new Response(blob).arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read audio data."));
    reader.readAsArrayBuffer(blob);
  });
}

const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==";

function isAutoplayBlockedError(error: unknown) {
  return (
    error instanceof DOMException && error.name === "NotAllowedError"
  ) || (
    error instanceof Error && error.name === "NotAllowedError"
  );
}

function waitForAudioPlayback(audio: HTMLAudioElement): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Audio playback failed"));
    const tryPlay = (remainingRetries: number) => {
      void audio.play().catch((caught) => {
        if (isAutoplayBlockedError(caught) && remainingRetries > 0) {
          window.setTimeout(() => tryPlay(remainingRetries - 1), 150);
          return;
        }
        reject(caught);
      });
    };
    tryPlay(2);
  });
}

function prepareKioskAudio(audio: HTMLAudioElement) {
  audio.preload = "auto";
  (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
  audio.muted = false;
  audio.volume = 1;
}

function useVoiceInteraction({
  sessionId,
  branchId,
  preferredLanguage = "auto",
  api,
  serverState,
  sendState,
}: UseVoiceInteractionOptions) {
  const [state, setState] = useState<AvatarState>("idle");
  const [product, setProduct] = useState<Product | null>(null);
  const productContextRef = useRef<Product | null>(null);
  const [productCandidates, setProductCandidates] = useState<ProductSearchCandidate[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [leaflets, setLeaflets] = useState<Leaflet[]>([]);
  const [uiActions, setUiActions] = useState<UiAction[]>([]);
  const [poster, setPoster] = useState<Poster | null>(null);
  const [transcript, setTranscript] = useState("");
  const [responseText, setResponseText] = useState("");
  const [purchasingQueryId, setPurchasingQueryId] = useState<string | null>(null);
  const [escalationId, setEscalationId] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [resultId, setResultId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [micActivity, setMicActivity] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const silenceStartedAtRef = useRef<number | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
  const blockedAudioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const autoStopInProgressRef = useRef(false);
  const [webAudioActivity, setWebAudioActivity] = useState(0);
  const playbackAudioActivity = useAudioActivity(audioElement);
  const audioActivity = state === "listening"
    ? micActivity
    : Math.max(playbackAudioActivity, webAudioActivity);

  useEffect(() => {
    if (serverState === "idle") {
      return;
    }
    setState(serverState);
  }, [serverState]);

  const stopSilenceMonitor = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      window.clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    silenceStartedAtRef.current = null;
    setMicActivity(0);
    inputAudioSourceRef.current?.disconnect();
    inputAudioSourceRef.current = null;
    const inputContext = inputAudioContextRef.current;
    inputAudioContextRef.current = null;
    void inputContext?.close();
  }, []);

  const unlockAudioPlayback = useCallback(() => {
    if (audioUnlockedRef.current && unlockedAudioRef.current) {
      return unlockedAudioRef.current;
    }

    const Context = getAudioContextConstructor();
    if (Context) {
      const context = playbackAudioContextRef.current ?? new Context();
      playbackAudioContextRef.current = context;
      const maybeResumable = context as AudioContext & {
        resume?: () => Promise<void>;
      };
      const resumePromise = maybeResumable.resume?.() ?? Promise.resolve();
      void resumePromise
        .then(() => {
          audioUnlockedRef.current = true;
        })
        .catch(() => undefined);
    }

    const primer = unlockedAudioRef.current ?? (new Audio(SILENT_WAV_DATA_URI) as HTMLAudioElement);
    unlockedAudioRef.current = primer;
    primer.src = SILENT_WAV_DATA_URI;
    prepareKioskAudio(primer);
    primer.volume = 0;
    void primer.play()
      .then(() => {
        audioUnlockedRef.current = true;
        primer.pause();
      })
      .catch(() => {
        audioUnlockedRef.current = false;
      });
    return primer;
  }, []);

  const releaseMedia = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(
    () => () => {
      stopSilenceMonitor();
      releaseMedia();
      audioElement?.pause?.();
      playbackSourceRef.current?.stop();
      void playbackAudioContextRef.current?.close();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    },
    [audioElement, releaseMedia, stopSilenceMonitor],
  );

  const startSilenceMonitor = useCallback((stream: MediaStream) => {
    stopSilenceMonitor();
    const Context = getAudioContextConstructor();
    if (!Context) {
      return;
    }

    const context = new Context();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    inputAudioContextRef.current = context;
    inputAudioSourceRef.current = source;
    silenceStartedAtRef.current = null;
    setMicActivity(0);
    const samples = new Uint8Array(analyser.fftSize);
    const startedAt = Date.now();

    silenceTimerRef.current = window.setInterval(() => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        stopSilenceMonitor();
        return;
      }

      const now = Date.now();
      if (now - startedAt < MIN_RECORDING_MS) {
        return;
      }

      analyser.getByteTimeDomainData(samples);
      const inputRms = calculateAudioActivity(samples);
      setMicActivity(inputRms);
      if (inputRms >= SILENCE_RMS_THRESHOLD) {
        silenceStartedAtRef.current = null;
        return;
      }

      silenceStartedAtRef.current ??= now;
      if (
        now - silenceStartedAtRef.current >= SILENCE_STOP_MS
        && !autoStopInProgressRef.current
      ) {
        autoStopInProgressRef.current = true;
        void stopRecordingRef.current?.();
      }
    }, SILENCE_SAMPLE_INTERVAL_MS);
  }, [stopSilenceMonitor]);

  const reset = useCallback(() => {
    stopSilenceMonitor();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    releaseMedia();
    if (audioElement) {
      audioElement.onended = null;
      audioElement.onerror = null;
      audioElement.pause?.();
      audioElement.currentTime = 0;
    }
    playbackSourceRef.current?.stop();
    playbackSourceRef.current = null;
    setWebAudioActivity(0);
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    chunksRef.current = [];
    setState("idle");
    productContextRef.current = null;
    setProduct(null);
    setProductCandidates([]);
    setPromotions([]);
    setLeaflets([]);
    setUiActions([]);
    setPoster(null);
    setTranscript("");
    setResponseText("");
    setPurchasingQueryId(null);
    setEscalationId(null);
    setHasResult(false);
    setResultId(0);
    setError(null);
    setAudioPlaybackBlocked(false);
    setAudioElement(null);
    blockedAudioRef.current = null;
    autoStopInProgressRef.current = false;
    sendState("idle");
  }, [audioElement, releaseMedia, sendState, stopSilenceMonitor]);

  const stopCurrentAudio = useCallback(() => {
    blockedAudioRef.current = null;
    setAudioPlaybackBlocked(false);
    if (audioElement) {
      audioElement.onended = null;
      audioElement.onerror = null;
      audioElement.pause?.();
      audioElement.currentTime = 0;
      setAudioElement(null);
    }
    playbackSourceRef.current?.stop();
    playbackSourceRef.current = null;
    setWebAudioActivity(0);
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, [audioElement]);

  const clearCurrentAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const finishSuccessfulPlayback = useCallback(() => {
    clearCurrentAudioUrl();
    blockedAudioRef.current = null;
    playbackSourceRef.current = null;
    setWebAudioActivity(0);
    setAudioElement(null);
    setAudioPlaybackBlocked(false);
    setState("idle");
    sendState("idle");
  }, [clearCurrentAudioUrl, sendState]);

  const playSpeechWithWebAudio = useCallback(async (speech: Blob) => {
    const Context = getAudioContextConstructor();
    if (!Context) {
      throw new Error("Web Audio playback is not supported.");
    }
    const context = playbackAudioContextRef.current ?? new Context();
    playbackAudioContextRef.current = context;
    const maybeResumable = context as AudioContext & {
      resume?: () => Promise<void>;
    };
    await (maybeResumable.resume?.() ?? Promise.resolve());
    const buffer = await context.decodeAudioData(await readBlobAsArrayBuffer(speech));
    const source = context.createBufferSource();
    playbackSourceRef.current?.stop();
    playbackSourceRef.current = source;
    source.buffer = buffer;
    source.connect(context.destination);
    setWebAudioActivity(0.45);
    return await new Promise<void>((resolve, reject) => {
      source.onended = () => {
        source.disconnect();
        setWebAudioActivity(0);
        resolve();
      };
      try {
        source.start();
      } catch (caught) {
        setWebAudioActivity(0);
        reject(caught);
      }
    });
  }, []);

  const playBlockedAudio = useCallback(async () => {
    const audio = blockedAudioRef.current;
    if (!audio) {
      return;
    }

    setError(null);
    setAudioPlaybackBlocked(false);
    setAudioElement(audio);
    setState("speaking");
    sendState("speaking");
    try {
      await waitForAudioPlayback(audio);
      finishSuccessfulPlayback();
    } catch (caught) {
      if (isAutoplayBlockedError(caught)) {
        blockedAudioRef.current = audio;
        setAudioElement(null);
        setAudioPlaybackBlocked(true);
        setState("idle");
        sendState("idle");
        return;
      }
      clearCurrentAudioUrl();
      blockedAudioRef.current = null;
      setAudioElement(null);
      setAudioPlaybackBlocked(false);
      setState("error");
      setError("Voice playback failed. Please try again.");
    }
  }, [clearCurrentAudioUrl, finishSuccessfulPlayback, sendState]);

  const playSpeechBlob = useCallback(async (speech: Blob) => {
    setAudioElement(null);
    setState("speaking");
    sendState("speaking");

    try {
      await playSpeechWithWebAudio(speech);
      finishSuccessfulPlayback();
    } catch (webAudioError) {
      if (import.meta.env.DEV) {
        console.warn("VitaKiosk Web Audio TTS playback fallback", webAudioError);
      }
      const audioUrl = URL.createObjectURL(speech);
      audioUrlRef.current = audioUrl;
      const audio = unlockedAudioRef.current ?? (new Audio(audioUrl) as HTMLAudioElement);
      unlockedAudioRef.current = audio;
      audio.src = audioUrl;
      audio.currentTime = 0;
      prepareKioskAudio(audio);
      audio.load?.();
      setAudioElement(audio);
      try {
        await waitForAudioPlayback(audio);
        finishSuccessfulPlayback();
      } catch {
        clearCurrentAudioUrl();
        blockedAudioRef.current = null;
        setAudioElement(null);
        setAudioPlaybackBlocked(false);
        setState("idle");
        setError(null);
        sendState("idle");
      }
    }
  }, [
    clearCurrentAudioUrl,
    finishSuccessfulPlayback,
    playSpeechWithWebAudio,
    sendState,
  ]);

  const playSynthesizedMessage = useCallback(async (message: string) => {
    const speech = await api.synthesize(sessionId, message);
    await playSpeechBlob(speech);
  }, [
    api,
    playSpeechBlob,
    sessionId,
  ]);

  const runTextWorkflow = useCallback(async (
    workflowTranscript: string,
    displayTranscript = workflowTranscript,
  ) => {
    const safeTranscript = workflowTranscript.trim();
    if (!safeTranscript) {
      return;
    }

    unlockAudioPlayback();
    stopSilenceMonitor();
    releaseMedia();
    stopCurrentAudio();
    chunksRef.current = [];
    setError(null);
    setAudioPlaybackBlocked(false);
    setTranscript(displayTranscript);
    setProductCandidates([]);
    setUiActions([]);
    setPoster(null);
    setEscalationId(null);
    setHasResult(false);
    setResponseText("Preparing answer...");
    setState("thinking");
    sendState("thinking");

    try {
      const currentProductId = productContextRef.current?.id;
      const response = currentProductId
        ? await api.respond(
          sessionId,
          safeTranscript,
          branchId,
          preferredLanguage,
          currentProductId,
        )
        : await api.respond(
          sessionId,
          safeTranscript,
          branchId,
          preferredLanguage,
        );
      setHasResult(true);
      const nextProductCandidates = response.product_candidates ?? [];
      setProductCandidates(nextProductCandidates);
      let nextProduct = productContextRef.current;
      if (response.product) {
        nextProduct = response.product;
      } else if (response.intent === "unknown_product" || nextProductCandidates.length > 0) {
        nextProduct = null;
      } else if (response.intent === "product_search") {
        // A fresh product-identification/search response without an authoritative
        // match must not leave the previous customer's/product query on screen.
        nextProduct = null;
      }
      productContextRef.current = nextProduct;
      setProduct(nextProduct);
      setPromotions(response.promotions);
      setLeaflets(response.leaflets ?? []);
      setUiActions(response.ui_actions ?? []);
      setResponseText(response.message);
      setPurchasingQueryId(response.purchasing_query_id);
      setEscalationId(response.escalation_id);
      setResultId((current) => current + 1);

      if (response.requires_pharmacist) {
        setState("pharmacist_escalation");
        return;
      }

      const [speechResult, postersResult] = await Promise.allSettled([
        api.synthesize(sessionId, response.message),
        api.idlePosters(branchId),
      ]);
      if (postersResult.status === "fulfilled") {
        setPoster(postersResult.value.items[0] ?? null);
      }
      if (speechResult.status === "rejected") {
        setAudioElement(null);
        setAudioPlaybackBlocked(false);
        setState("idle");
        sendState("idle");
        return;
      }
      await playSpeechBlob(speechResult.value);
    } catch (caught) {
      releaseMedia();
      setState("error");
      setError(caught instanceof Error ? caught.message : "Voice request failed.");
    }
  }, [
    api,
    branchId,
    preferredLanguage,
    releaseMedia,
    sendState,
    sessionId,
    clearCurrentAudioUrl,
    finishSuccessfulPlayback,
    stopCurrentAudio,
    stopSilenceMonitor,
    unlockAudioPlayback,
    playSpeechBlob,
  ]);

  const startRecording = useCallback(async () => {
    unlockAudioPlayback();
    setError(null);
    autoStopInProgressRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("error");
      setError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      startSilenceMonitor(stream);
      setState("listening");
      sendState("listening");
    } catch {
      stopSilenceMonitor();
      releaseMedia();
      setState("error");
      setError("Microphone permission is required to use voice assistance.");
    }
  }, [releaseMedia, sendState, startSilenceMonitor, stopSilenceMonitor, unlockAudioPlayback]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    try {
      stopSilenceMonitor();
      const recording = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        };
        recorder.stop();
      });
      releaseMedia();
      setState("thinking");
      sendState("thinking");

      const transcription = await api.transcribe(recording, sessionId);
      setTranscript(transcription.transcript);
      const workflowTranscript =
        transcription.corrected_transcript?.trim() || transcription.transcript;
      if (
        transcription.clarification_needed
        || workflowTranscript.trim().length === 0
      ) {
        const clarificationMessage = "I did not catch that clearly. Please tap to speak and try again.";
        productContextRef.current = null;
        setProduct(null);
        setProductCandidates([]);
        setPromotions([]);
        setLeaflets([]);
        setUiActions([]);
        setPoster(null);
        setPurchasingQueryId(null);
        setEscalationId(null);
        setHasResult(false);
        setResponseText(clarificationMessage);
        try {
          await playSynthesizedMessage(clarificationMessage);
        } catch {
          setState("idle");
          sendState("idle");
        }
        return;
      }
      await runTextWorkflow(workflowTranscript, transcription.transcript);
    } catch (caught) {
      releaseMedia();
      setState("error");
      setError(caught instanceof Error ? caught.message : "Voice request failed.");
    }
  }, [api, playSynthesizedMessage, releaseMedia, runTextWorkflow, sendState, sessionId, stopSilenceMonitor]);

  stopRecordingRef.current = stopRecording;

  const submitText = useCallback(async (text: string, displayText = text) => {
    await runTextWorkflow(text, displayText);
  }, [runTextWorkflow]);

  const adoptConfirmedProduct = useCallback((confirmedProduct: Product) => {
    productContextRef.current = confirmedProduct;
    setProduct(confirmedProduct);
  }, []);

  return {
    state,
    audioActivity,
    product,
    productCandidates,
    promotions,
    leaflets,
    uiActions,
    poster,
    transcript,
    responseText,
    purchasingQueryId,
    escalationId,
    hasResult,
    resultId,
    error,
    audioPlaybackBlocked,
    startRecording,
    stopRecording,
    submitText,
    adoptConfirmedProduct,
    playBlockedAudio,
    reset,
  };
}

export default useVoiceInteraction;
