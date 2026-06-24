import { Suspense, lazy, type CSSProperties, useEffect, useState } from "react";

import { translations, type KioskTranslations } from "../i18n";
import type { AvatarState } from "../types";
import {
  getConfiguredAvatarRenderer,
  type AvatarRendererKind,
} from "./avatar/AvatarRenderer";
import { getDefaultVrmAvatarModelKey } from "./avatar/AvatarRuntimeConfig";
import LottieAvatarRenderer from "./avatar/LottieAvatarRenderer";

const ThreeAvatarRenderer = lazy(() => import("./avatar/ThreeAvatarRenderer"));
const VrmAvatarRenderer = lazy(() => import("./avatar/VrmAvatarRenderer"));

interface AvatarAssistantProps {
  state: AvatarState;
  audioActivity: number;
  connected: boolean;
  renderer?: AvatarRendererKind;
  labels?: KioskTranslations;
}

function getStateLabel(state: AvatarState, labels: KioskTranslations) {
  const stateLabels: Record<AvatarState, string> = {
    idle: labels.ready,
    listening: labels.listening,
    thinking: labels.thinking,
    speaking: labels.speaking,
    error: labels.tryAgain,
    pharmacist_escalation: labels.pharmacistRequested,
  };
  return stateLabels[state];
}

type WaveformMode = "breathing" | "microphone" | "scanning" | "playback" | "warning" | "safety";
type WaveformAudioSource = "microphone" | "playback" | "simulated";

const WAVEFORM_STATE_CONFIG: Record<AvatarState, {
  mode: WaveformMode;
  fallbackActivity: number;
  audioSource: WaveformAudioSource;
  usesLiveActivity: boolean;
}> = {
  idle: {
    mode: "breathing",
    fallbackActivity: 0.12,
    audioSource: "simulated",
    usesLiveActivity: false,
  },
  listening: {
    mode: "microphone",
    fallbackActivity: 0.16,
    audioSource: "microphone",
    usesLiveActivity: true,
  },
  thinking: {
    mode: "scanning",
    fallbackActivity: 0.3,
    audioSource: "simulated",
    usesLiveActivity: false,
  },
  speaking: {
    mode: "playback",
    fallbackActivity: 0.34,
    audioSource: "playback",
    usesLiveActivity: true,
  },
  error: {
    mode: "warning",
    fallbackActivity: 0.22,
    audioSource: "simulated",
    usesLiveActivity: false,
  },
  pharmacist_escalation: {
    mode: "safety",
    fallbackActivity: 0.26,
    audioSource: "simulated",
    usesLiveActivity: false,
  },
};

const WAVEFORM_BAR_PATTERN = [0.22, 0.48, 0.78, 0.56, 0.92, 0.64, 0.36, 0.7, 0.42];

function clampAudioActivity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function getVisualWaveformActivity(state: AvatarState, audioActivity: number) {
  const config = WAVEFORM_STATE_CONFIG[state];
  const activity = clampAudioActivity(audioActivity);
  if (!config.usesLiveActivity) {
    return config.fallbackActivity;
  }
  return activity > 0.04 ? activity : config.fallbackActivity;
}

function getWaveformAudioSource(state: AvatarState, audioActivity: number): WaveformAudioSource {
  const config = WAVEFORM_STATE_CONFIG[state];
  if (state === "speaking" && clampAudioActivity(audioActivity) <= 0.04) {
    return "simulated";
  }
  return config.audioSource;
}

function getWaveformBarHeight(
  state: AvatarState,
  index: number,
  activity: number,
  reducedMotion: boolean,
) {
  const pattern = WAVEFORM_BAR_PATTERN[index % WAVEFORM_BAR_PATTERN.length];
  const stateLift: Record<AvatarState, number> = {
    idle: 0,
    listening: 4,
    thinking: 2,
    speaking: 5,
    error: 1,
    pharmacist_escalation: 2,
  };
  const motionMultiplier = reducedMotion ? 0.72 : 1;
  return Math.round((9 + pattern * 22 + activity * 24 + stateLift[state]) * motionMultiplier);
}

function getPrefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(getPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reducedMotion;
}

function AvatarAssistant({
  state,
  audioActivity,
  connected,
  renderer,
  labels = translations.en,
}: AvatarAssistantProps) {
  const stateLabel = getStateLabel(state, labels);
  const rendererKind = renderer ?? getConfiguredAvatarRenderer();
  const vrmModelKey = getDefaultVrmAvatarModelKey();
  const reducedMotion = usePrefersReducedMotion();
  const waveformConfig = WAVEFORM_STATE_CONFIG[state];
  const visualAudioActivity = getVisualWaveformActivity(state, audioActivity);
  const waveformAudioSource = getWaveformAudioSource(state, audioActivity);
  const isAudioReactive =
    ["listening", "speaking"].includes(state) && clampAudioActivity(audioActivity) > 0.04;
  const showRendererDebug =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_DEBUG_STATUS === "true";

  useEffect(() => {
    if (
      import.meta.env.DEV
      && !renderer
      && rendererKind === "lottie"
      && !import.meta.env.VITE_AVATAR_RENDERER
    ) {
      console.warn(
        "VITE_AVATAR_RENDERER is not set to vrm; using fallback renderer",
        {
          configuredRenderer: "missing",
          fallbackRenderer: "lottie",
          expectedLocalDemoValue: "VITE_AVATAR_RENDERER=vrm",
        },
      );
    }
  }, [renderer, rendererKind]);

  const avatarRenderer = (() => {
    if (rendererKind === "vrm") {
      return (
        <Suspense
          fallback={
            <div
              className={`vrm-avatar-portrait vrm-avatar avatar-render-${state} vrm-avatar-loading`}
              data-state={state}
              data-avatar-renderer="vrm"
              data-avatar-model="loading"
              data-avatar-framing="full-body"
              data-avatar-crop="full-body"
              data-avatar-stage="full-body-chamber"
              data-reduced-motion="pending"
              role="presentation"
              aria-hidden="true"
            />
          }
        >
          <VrmAvatarRenderer state={state} audioActivity={audioActivity} />
        </Suspense>
      );
    }

    if (rendererKind === "threejs") {
      return (
        <Suspense
          fallback={
            <div
              className={`three-avatar avatar-render-${state} three-avatar-loading`}
              data-state={state}
              data-avatar-renderer="threejs"
              data-reduced-motion="pending"
              role="presentation"
              aria-hidden="true"
            />
          }
        >
          <ThreeAvatarRenderer state={state} audioActivity={audioActivity} />
        </Suspense>
      );
    }

    return <LottieAvatarRenderer state={state} audioActivity={audioActivity} />;
  })();

  return (
    <section className={`assistant-stage assistant-${state}`} aria-label="AI assistant">
      <div className="assistant-stage-header">
        <div>
          <span className="eyebrow">VitaKiosk Labs</span>
          <h1>{labels.aiPharmacyAssistant}</h1>
        </div>
        <span className={`assistant-link-state${connected ? " is-connected" : ""}`}>
          {connected ? labels.realtimeConnected : labels.localStateMode}
        </span>
      </div>

      <div className="avatar-bay">
        <span className="avatar-bay-label avatar-bay-label-left" aria-hidden="true">
          SAFE AI
        </span>
        {avatarRenderer}
        <span className="avatar-bay-label avatar-bay-label-right" aria-hidden="true">
          MOCK 01
        </span>
        {showRendererDebug ? (
          <span className="avatar-renderer-debug" aria-label={`Current avatar renderer ${rendererKind}`}>
            <span>Renderer: {rendererKind}</span>
            {rendererKind === "vrm" ? <span>Model: {vrmModelKey}</span> : null}
          </span>
        ) : null}
      </div>

      <div
        className={[
          "assistant-waveform",
          `assistant-waveform-${state}`,
          `assistant-waveform-${waveformConfig.mode}`,
          isAudioReactive ? "is-audio-reactive" : "",
          reducedMotion ? "assistant-waveform-reduced-motion" : "",
        ].filter(Boolean).join(" ")}
        aria-hidden="true"
        data-testid="assistant-waveform"
        data-state={state}
        data-waveform-mode={waveformConfig.mode}
        data-audio-source={waveformAudioSource}
        data-visual-activity={visualAudioActivity.toFixed(2)}
        data-reduced-motion={String(reducedMotion)}
      >
        {Array.from({ length: 25 }, (_, index) => {
          const height = getWaveformBarHeight(state, index, visualAudioActivity, reducedMotion);
          return (
            <span
              key={index}
              data-testid="assistant-waveform-bar"
              style={{
                height: `${height}px`,
                "--waveform-index": index,
                "--waveform-activity": visualAudioActivity,
              } as CSSProperties}
            />
          );
        })}
      </div>
      <p
        className="avatar-state-label"
        data-state={state}
        role={state === "pharmacist_escalation" ? "alert" : "status"}
      >
        <span aria-hidden="true" />
        {stateLabel}
      </p>
      <small className="assistant-safety-copy">
        {labels.safetySupportCopy}
      </small>
    </section>
  );
}

export default AvatarAssistant;
