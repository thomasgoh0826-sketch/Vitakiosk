import { useCallback, useEffect, useRef, useState } from "react";

import type { VitaKioskApiClient } from "../api/client";
import type { AvatarState, Poster, Product, Promotion } from "../types";
import { calculateAudioActivity, useAudioActivity } from "./useAudioActivity";


interface UseVoiceInteractionOptions {
  sessionId: string;
  branchId: string;
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

function useVoiceInteraction({
  sessionId,
  branchId,
  api,
  serverState,
  sendState,
}: UseVoiceInteractionOptions) {
  const [state, setState] = useState<AvatarState>("idle");
  const [product, setProduct] = useState<Product | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [poster, setPoster] = useState<Poster | null>(null);
  const [responseText, setResponseText] = useState("");
  const [purchasingQueryId, setPurchasingQueryId] = useState<string | null>(null);
  const [escalationId, setEscalationId] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const silenceStartedAtRef = useRef<number | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
  const autoStopInProgressRef = useRef(false);
  const audioActivity = useAudioActivity(audioElement);

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
    inputAudioSourceRef.current?.disconnect();
    inputAudioSourceRef.current = null;
    const inputContext = inputAudioContextRef.current;
    inputAudioContextRef.current = null;
    void inputContext?.close();
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
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    },
    [audioElement, releaseMedia, stopSilenceMonitor],
  );

  const startSilenceMonitor = useCallback((stream: MediaStream) => {
    stopSilenceMonitor();
    const browserWindow = window as typeof window & {
      webkitAudioContext?: AudioContextConstructor;
    };
    const Context = window.AudioContext ?? browserWindow.webkitAudioContext;
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
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    chunksRef.current = [];
    setState("idle");
    setProduct(null);
    setPromotions([]);
    setPoster(null);
    setResponseText("");
    setPurchasingQueryId(null);
    setEscalationId(null);
    setHasResult(false);
    setError(null);
    setAudioElement(null);
    autoStopInProgressRef.current = false;
    sendState("idle");
  }, [audioElement, releaseMedia, sendState, stopSilenceMonitor]);

  const startRecording = useCallback(async () => {
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
  }, [releaseMedia, sendState, startSilenceMonitor, stopSilenceMonitor]);

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
      const response = await api.respond(sessionId, transcription.transcript, branchId);
      setHasResult(true);
      setProduct(response.product);
      setPromotions(response.promotions);
      setResponseText(response.message);
      setPurchasingQueryId(response.purchasing_query_id);
      setEscalationId(response.escalation_id);

      if (response.requires_pharmacist) {
        setState("pharmacist_escalation");
        return;
      }

      const [speech, posters] = await Promise.all([
        api.synthesize(sessionId, response.message),
        api.idlePosters(branchId),
      ]);
      setPoster(posters.items[0] ?? null);
      const audioUrl = URL.createObjectURL(speech);
      audioUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl) as HTMLAudioElement;
      setAudioElement(audio);
      setState("speaking");

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Audio playback failed"));
        void audio.play().catch(reject);
      });
      URL.revokeObjectURL(audioUrl);
      audioUrlRef.current = null;
      setAudioElement(null);
      setState("idle");
      sendState("idle");
    } catch (caught) {
      releaseMedia();
      setState("error");
      setError(caught instanceof Error ? caught.message : "Voice request failed.");
    }
  }, [api, branchId, releaseMedia, sendState, sessionId, stopSilenceMonitor]);

  stopRecordingRef.current = stopRecording;

  return {
    state,
    audioActivity,
    product,
    promotions,
    poster,
    responseText,
    purchasingQueryId,
    escalationId,
    hasResult,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}

export default useVoiceInteraction;
