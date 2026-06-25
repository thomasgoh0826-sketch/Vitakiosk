import { useSubtitlePlayback } from "../hooks/useSubtitlePlayback";
import { translations, type KioskTranslations } from "../i18n";
import type { AvatarState } from "../types";

interface AiSubtitleProps {
  state: AvatarState;
  responseText: string;
  error: string | null;
  audioPlaybackBlocked?: boolean;
  labels?: KioskTranslations;
}

function getStaticSubtitle(
  state: AvatarState,
  responseText: string,
  error: string | null,
  labels: KioskTranslations,
) {
  if (state === "error" || error) {
    return labels.errorSubtitle;
  }
  if (state === "pharmacist_escalation") {
    return labels.escalationSubtitle;
  }
  if (state === "thinking") {
    return labels.thinkingSubtitle;
  }
  if (state === "listening") {
    return labels.listeningSubtitle;
  }
  if (state === "speaking") {
    return responseText || labels.thinkingSubtitle;
  }
  return labels.idleSubtitle;
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

function AiSubtitle({
  state,
  responseText,
  error,
  audioPlaybackBlocked = false,
  labels = translations.en,
}: AiSubtitleProps) {
  const playback = useSubtitlePlayback({
    text: responseText,
    state,
  });
  const subtitle = audioPlaybackBlocked && responseText
    ? responseText
    : state === "speaking"
    ? playback.subtitle || labels.thinkingSubtitle
    : getStaticSubtitle(state, responseText, error, labels);
  const stateLabel = audioPlaybackBlocked ? labels.tapToPlayVoice : getStateLabel(state, labels);

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
