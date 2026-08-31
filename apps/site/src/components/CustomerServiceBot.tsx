import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { sendSiteChatMessage, type SiteChatMessage } from "../lib/siteApi";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const starterQuestions = [
  "What does VitaKiosk Asia offer?",
  "How does pricing work?",
  "Is this medical advice?",
];

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text:
      "Hi, I can answer public website questions about VitaKiosk Asia services, pricing, demos, contact, and safety wording.",
  },
];

function makeMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CustomerServiceBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !logRef.current) {
      return;
    }
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [isOpen, messages]);

  async function sendMessage(messageText = input) {
    const clean = messageText.trim();
    if (!clean || status === "sending") {
      return;
    }

    const userMessage: ChatMessage = {
      id: makeMessageId("user"),
      role: "user",
      text: clean,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setStatus("sending");
    const chatHistory: SiteChatMessage[] = messages.slice(-6).map((message) => ({
      role: message.role,
      text: message.text,
    }));

    try {
      const response = await sendSiteChatMessage(clean, chatHistory);
      setMessages((current) => [
        ...current,
        {
          id: makeMessageId("assistant"),
          role: "assistant",
          text: response.answer,
        },
      ]);
      setStatus("idle");
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: makeMessageId("assistant-error"),
          role: "assistant",
          text:
            "I could not reach the website assistant right now. Please use Book Demo or Contact Sales and we will follow up manually.",
        },
      ]);
      setStatus("error");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <aside
      className={`customer-service-bot ${isOpen ? "is-open" : ""}`}
      data-testid="customer-service-bot"
      data-mobile-anchor="right"
      data-mobile-launcher-shape="sphere"
    >
      {isOpen ? (
        <section className="customer-service-panel" aria-label="VitaKiosk Asia customer service chat">
          <header className="customer-service-header">
            <span className="customer-service-avatar" aria-hidden="true">
              <Bot size={20} />
            </span>
            <div>
              <strong>VitaKiosk Asia Assistant</strong>
              <small>Website questions only</small>
            </div>
            <button
              className="customer-service-icon-button"
              type="button"
              aria-label="Close VitaKiosk Asia customer service"
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </button>
          </header>

          <div className="customer-service-guardrail">
            <Sparkles size={14} />
            Public site info only. No secrets, private customer data, diagnosis, or prescription consultation.
          </div>

          <div className="customer-service-log" ref={logRef} role="log" aria-live="polite">
            {messages.map((message) => (
              <div className={`customer-service-message ${message.role}`} key={message.id}>
                {message.text}
              </div>
            ))}
            {status === "sending" ? (
              <div className="customer-service-message assistant is-thinking">Asking the website AI assistant...</div>
            ) : null}
          </div>

          <div className="customer-service-starters" aria-label="Quick questions">
            {starterQuestions.map((question) => (
              <button
                type="button"
                key={question}
                onClick={() => void sendMessage(question)}
                disabled={status === "sending"}
              >
                {question}
              </button>
            ))}
          </div>

          <form className="customer-service-form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              aria-label="Ask the VitaKiosk Asia assistant"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about services, pricing, demo, or safety..."
              rows={2}
              maxLength={800}
            />
            <button type="submit" aria-label="Send chat message" disabled={status === "sending" || !input.trim()}>
              <Send size={17} />
            </button>
          </form>
        </section>
      ) : (
        <button
          className="customer-service-launcher"
          type="button"
          aria-label="Open VitaKiosk Asia customer service"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle size={21} />
          <span>Ask VitaKiosk</span>
        </button>
      )}
    </aside>
  );
}
