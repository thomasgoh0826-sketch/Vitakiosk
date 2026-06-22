import { useCallback, useEffect, useRef, useState } from "react";

import type { VitaKioskApiClient } from "../api/client";
import type { AvatarState, Poster, Product, Promotion } from "../types";
import { useAudioActivity } from "./useAudioActivity";


interface UseVoiceInteractionOptions {
  sessionId: string;
  branchId: string;
  api: VitaKioskApiClient;
  serverState: AvatarState;
  sendState: (state: AvatarState) => void;
}

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm"];

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
  const audioActivity = useAudioActivity(audioElement);

  useEffect(() => {
    if (serverState === "idle") {
      return;
    }
    setState(serverState);
  }, [serverState]);

  const releaseMedia = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(
    () => () => {
      releaseMedia();
      audioElement?.pause?.();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    },
    [audioElement, releaseMedia],
  );

  const reset = useCallback(() => {
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
    sendState("idle");
  }, [audioElement, releaseMedia, sendState]);

  const startRecording = useCallback(async () => {
    setError(null);
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
      setState("listening");
      sendState("listening");
    } catch {
      releaseMedia();
      setState("error");
      setError("Microphone permission is required to use voice assistance.");
    }
  }, [releaseMedia, sendState]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    try {
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
  }, [api, branchId, releaseMedia, sendState, sessionId]);

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
