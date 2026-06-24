import type { AvatarState } from "../types";
import type { KioskTranslations } from "../i18n";
import AiSubtitle from "./AiSubtitle";


interface ConversationPanelProps {
  transcript: string;
  responseText: string;
  state: AvatarState;
  error: string | null;
  labels: KioskTranslations;
}

function ConversationPanel({
  transcript,
  responseText,
  state,
  error,
  labels,
}: ConversationPanelProps) {
  const showTranscriptDebug =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_TRANSCRIPT_DEBUG === "true";

  return (
    <div className="conversation-panel panel" aria-label="AI conversation deck">
      <AiSubtitle state={state} responseText={responseText} error={error} labels={labels} />
      {showTranscriptDebug && transcript ? (
        <details className="transcript-debug-panel">
          <summary>Transcript debug</summary>
          <p>{transcript}</p>
        </details>
      ) : null}
    </div>
  );
}

export default ConversationPanel;
