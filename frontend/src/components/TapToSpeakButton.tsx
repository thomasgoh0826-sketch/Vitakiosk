import { translations, type KioskTranslations } from "../i18n";
import type { AvatarState } from "../types";

interface TapToSpeakButtonProps {
  state: AvatarState;
  onStart: () => void;
  onStop: () => void;
  labels?: KioskTranslations;
}

function buttonLabelFor(state: AvatarState, labels: KioskTranslations) {
  const buttonLabels: Record<AvatarState, string> = {
    idle: labels.tapToSpeak,
    listening: labels.tapToStop,
    thinking: `${labels.thinking}…`,
    speaking: `${labels.speaking}…`,
    error: labels.tryAgain,
    pharmacist_escalation: labels.pharmacistRequested,
  };
  return buttonLabels[state];
}

function TapToSpeakButton({
  state,
  onStart,
  onStop,
  labels = translations.en,
}: TapToSpeakButtonProps) {
  const listening = state === "listening";
  const disabled = ["thinking", "speaking", "pharmacist_escalation"].includes(state);
  const buttonLabel = buttonLabelFor(state, labels);

  return (
    <button
      className={`tap-speak-button tap-speak-${state}`}
      type="button"
      aria-label={buttonLabel}
      aria-pressed={listening}
      disabled={disabled}
      onClick={listening ? onStop : onStart}
    >
      <span className="tap-speak-orbit" aria-hidden="true">
        <span className="tap-speak-mic" />
      </span>
      <span>
        <strong>{buttonLabel}</strong>
        <small>{listening ? labels.listeningSecurely : labels.voiceAssistance}</small>
      </span>
    </button>
  );
}

export default TapToSpeakButton;
