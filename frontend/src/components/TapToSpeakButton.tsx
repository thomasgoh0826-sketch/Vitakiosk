import type { AvatarState } from "../types";


interface TapToSpeakButtonProps {
  state: AvatarState;
  onStart: () => void;
  onStop: () => void;
}

const LABELS: Record<AvatarState, string> = {
  idle: "Tap to Speak",
  listening: "Tap to Stop",
  thinking: "Thinking…",
  speaking: "Speaking…",
  error: "Try Again",
  pharmacist_escalation: "Pharmacist Requested",
};

function TapToSpeakButton({
  state,
  onStart,
  onStop,
}: TapToSpeakButtonProps) {
  const listening = state === "listening";
  const disabled = ["thinking", "speaking", "pharmacist_escalation"].includes(state);

  return (
    <button
      className={`tap-speak-button tap-speak-${state}`}
      type="button"
      aria-label={LABELS[state]}
      aria-pressed={listening}
      disabled={disabled}
      onClick={listening ? onStop : onStart}
    >
      <span className="tap-speak-orbit" aria-hidden="true">
        <span className="tap-speak-mic" />
      </span>
      <span>
        <strong>{LABELS[state]}</strong>
        <small>{listening ? "Listening securely on this kiosk" : "Voice assistance"}</small>
      </span>
    </button>
  );
}

export default TapToSpeakButton;
