import type { AvatarState } from "../types";
import { useSubtitlePlayback } from "../hooks/useSubtitlePlayback";


interface AiSubtitleProps {
  state: AvatarState;
  responseText: string;
  error: string | null;
}

const IDLE_COPY =
  "Tap to Speak to ask about products, stock, promotions, or shelf location.";
const LISTENING_COPY = "Listening…";
const THINKING_COPY = "Preparing answer…";
const ERROR_COPY = "Sorry, I could not hear that clearly. Please try again.";
const ESCALATION_COPY = "For your safety, I will request pharmacist assistance.";

function getStaticSubtitle(state: AvatarState, responseText: string, error: string | null) {
  if (state === "error" || error) {
    return ERROR_COPY;
  }
  if (state === "pharmacist_escalation") {
    return ESCALATION_COPY;
  }
  if (state === "thinking") {
    return THINKING_COPY;
  }
  if (state === "listening") {
    return LISTENING_COPY;
  }
  if (state === "speaking") {
    return responseText || THINKING_COPY;
  }
  return IDLE_COPY;
}

function AiSubtitle({ state, responseText, error }: AiSubtitleProps) {
  const playback = useSubtitlePlayback({
    text: responseText,
    state,
  });
  const subtitle = state === "speaking"
    ? playback.subtitle || THINKING_COPY
    : getStaticSubtitle(state, responseText, error);
  const stateLabel = state.replace("_", " ");

  return (
    <section
      className={`ai-subtitle-panel ai-subtitle-${state}${
        playback.isStreaming ? " is-streaming" : ""
      }`}
      role="region"
      aria-label="AI assistant subtitles"
    >
      <div className="ai-subtitle-chrome" aria-hidden="true">
        <span>AI subtitle</span>
        <span>{stateLabel}</span>
      </div>
      <p
        className="ai-subtitle-line"
        data-testid="ai-subtitle-line"
        aria-live="polite"
        aria-atomic="true"
      >
        {subtitle}
      </p>
      <div className="ai-subtitle-hint" aria-hidden="true">
        VitaKiosk AI
      </div>
    </section>
  );
}

export default AiSubtitle;
