import { useEffect, useMemo, useState } from "react";

import type { AvatarState } from "../types";


interface ConversationPanelProps {
  transcript: string;
  responseText: string;
  state: AvatarState;
  error: string | null;
  hasResult: boolean;
}

const READY_CUSTOMER_COPY = "What can I help you find today?";
const READY_AI_COPY =
  "Tap to Speak to ask about a product, price, stock, promotion, campaign, or shelf location.";

function ConversationPanel({
  transcript,
  responseText,
  state,
  error,
  hasResult,
}: ConversationPanelProps) {
  const customerCopy = transcript || (hasResult ? "Voice request received" : READY_CUSTOMER_COPY);
  const fullAiCopy = useMemo(() => {
    if (error) {
      return "Sorry, I could not complete that voice request. Please try again or press Start.";
    }
    if (state === "thinking" && !responseText) {
      return "Preparing answer...";
    }
    return responseText || READY_AI_COPY;
  }, [error, responseText, state]);
  const [visibleAiCopy, setVisibleAiCopy] = useState(fullAiCopy);

  useEffect(() => {
    if (state !== "speaking" || !responseText) {
      setVisibleAiCopy(fullAiCopy);
      return undefined;
    }

    const words = responseText.split(" ");
    let cursor = 1;
    setVisibleAiCopy(words.slice(0, cursor).join(" "));
    const timer = window.setInterval(() => {
      cursor += 1;
      setVisibleAiCopy(words.slice(0, cursor).join(" "));
      if (cursor >= words.length) {
        window.clearInterval(timer);
      }
    }, 70);

    return () => window.clearInterval(timer);
  }, [fullAiCopy, responseText, state]);

  return (
    <div className="conversation-panel panel" aria-label="AI conversation subtitles">
      <div className="conversation-bubble customer-question">
        <span>Customer</span>
        <p>{customerCopy}</p>
      </div>
      <div
        className={`conversation-bubble ai-answer${
          state === "speaking" ? " subtitle-streaming" : ""
        }`}
        aria-live="polite"
        aria-label={fullAiCopy}
      >
        <span>VitaKiosk AI</span>
        <p>{visibleAiCopy}</p>
      </div>
    </div>
  );
}

export default ConversationPanel;
