import { Suspense, lazy, useEffect } from "react";

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

      <div className="assistant-waveform" aria-hidden="true">
        {Array.from({ length: 25 }, (_, index) => {
          const base = 8 + (index % 7) * 4;
          const energized = ["listening", "speaking"].includes(state);
          const height = energized ? base + audioActivity * 30 : base;
          return <span key={index} style={{ height: `${height}px` }} />;
        })}
      </div>
      <p
        className="avatar-state-label"
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
