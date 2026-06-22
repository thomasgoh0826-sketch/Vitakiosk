import type { AvatarState } from "../types";
import AiSubtitle from "./AiSubtitle";


interface ConversationPanelProps {
  transcript: string;
  responseText: string;
  state: AvatarState;
  error: string | null;
}

function ConversationPanel({
  transcript,
  responseText,
  state,
  error,
}: ConversationPanelProps) {
  const showTranscriptDebug =
    import.meta.env.DEV && import.meta.env.VITE_SHOW_TRANSCRIPT_DEBUG === "true";

  return (
    <div className="conversation-panel panel" aria-label="AI conversation deck">
      <AiSubtitle state={state} responseText={responseText} error={error} />
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
