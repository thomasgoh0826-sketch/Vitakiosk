import { Suspense, lazy } from "react";

import type { AvatarState } from "../types";
import {
  getConfiguredAvatarRenderer,
  type AvatarRendererKind,
} from "./avatar/AvatarRenderer";
import LottieAvatarRenderer from "./avatar/LottieAvatarRenderer";


const ThreeAvatarRenderer = lazy(() => import("./avatar/ThreeAvatarRenderer"));
const VrmAvatarRenderer = lazy(() => import("./avatar/VrmAvatarRenderer"));

interface AvatarAssistantProps {
  state: AvatarState;
  audioActivity: number;
  connected: boolean;
  renderer?: AvatarRendererKind;
}

const STATE_LABELS: Record<AvatarState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Something went wrong",
  pharmacist_escalation: "Pharmacist requested",
};

function AvatarAssistant({
  state,
  audioActivity,
  connected,
  renderer,
}: AvatarAssistantProps) {
  const stateLabel = STATE_LABELS[state];
  const rendererKind = renderer ?? getConfiguredAvatarRenderer();
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
          <h1>AI Pharmacy Assistant</h1>
        </div>
        <span className={`assistant-link-state${connected ? " is-connected" : ""}`}>
          {connected ? "Realtime connected" : "Local state mode"}
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
        Information support only · A pharmacist remains available
      </small>
    </section>
  );
}

export default AvatarAssistant;
