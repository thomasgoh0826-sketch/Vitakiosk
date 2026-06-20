import type { AvatarState } from "../types";
import LottieAvatarRenderer from "./avatar/LottieAvatarRenderer";


interface AvatarAssistantProps {
  state: AvatarState;
  audioActivity: number;
  connected: boolean;
}

const STATE_LABELS: Record<AvatarState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Something went wrong",
  pharmacist_escalation: "Pharmacist requested",
};

function AvatarAssistant({ state, audioActivity, connected }: AvatarAssistantProps) {
  const stateLabel = STATE_LABELS[state];

  return (
    <section className={`assistant-stage assistant-${state}`} aria-label="AI assistant">
      <div className="section-heading">
        <span>AI assistant</span>
        <small>{connected ? "Realtime connected" : "Local state mode"}</small>
      </div>
      <LottieAvatarRenderer state={state} audioActivity={audioActivity} />
      <div className="waveform" aria-hidden="true">
        {Array.from({ length: 17 }, (_, index) => {
          const base = 10 + (index % 5) * 5;
          const height = state === "speaking" ? base + audioActivity * 28 : base;
          return <span key={index} style={{ height: `${height}px` }} />;
        })}
      </div>
      <p
        className="avatar-state-label"
        role={state === "pharmacist_escalation" ? "alert" : "status"}
      >
        {stateLabel}
      </p>
    </section>
  );
}

export default AvatarAssistant;
