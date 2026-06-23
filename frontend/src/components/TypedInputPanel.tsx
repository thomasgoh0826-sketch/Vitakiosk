import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { TypedInputConfig } from "../inputConfig";
import VirtualKeyboard from "./VirtualKeyboard";

interface TypedInputPanelProps {
  value: string;
  config: TypedInputConfig;
  resetToken: number;
  disabled?: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: (question: string) => void;
}

const INPUT_LABEL = "Type your question";
const INPUT_PLACEHOLDER = "Ask about a product, stock, promotion, or shelf location";

function TypedInputPanel({
  value,
  config,
  resetToken,
  disabled = false,
  onChange,
  onClear,
  onSubmit,
}: TypedInputPanelProps) {
  const [typingScreenOpen, setTypingScreenOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const usesPopupKeyboard = config.mode === "popup";

  useEffect(() => {
    setTypingScreenOpen(false);
  }, [resetToken]);

  useEffect(() => {
    if (!usesPopupKeyboard) {
      setTypingScreenOpen(false);
    }
  }, [usesPopupKeyboard]);

  if (!config.enabled) {
    return null;
  }

  const submitQuestion = () => {
    const question = value.trim();
    if (!question || disabled) {
      return;
    }
    onSubmit(question);
    onClear();
    setTypingScreenOpen(false);
  };

  const openTypingScreenOrFocus = () => {
    if (disabled) {
      return;
    }
    setTypingScreenOpen(true);
  };

  const typingScreen = typingScreenOpen ? (
    <VirtualKeyboard
      value={value}
      disabled={disabled}
      onChange={onChange}
      onClear={onClear}
      onSubmit={submitQuestion}
      onClose={() => setTypingScreenOpen(false)}
    />
  ) : null;

  return (
    <section
      className="panel typed-input-panel"
      aria-label="Typed question input"
      data-layout="compact-rail"
    >
      <form
        className="typed-input-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuestion();
        }}
      >
        <label className="typed-input-label" htmlFor="typed-question">
          {INPUT_LABEL}
        </label>
        <input
          ref={inputRef}
          id="typed-question"
          className="typed-question-input"
          type="text"
          value={value}
          disabled={disabled}
          placeholder={INPUT_PLACEHOLDER}
          onChange={(event) => onChange(event.target.value)}
          onClick={() => {
            if (usesPopupKeyboard && !disabled) {
              setTypingScreenOpen(true);
            }
          }}
        />
        <div className="typed-input-actions">
          <button
            type="button"
            className="typed-keyboard-button"
            aria-label="Open typing screen"
            title="Open typing screen"
            onClick={openTypingScreenOrFocus}
            disabled={disabled}
          >
            <span aria-hidden="true">⌨</span>
          </button>
          {value ? (
            <button
              type="button"
              className="typed-clear-button"
              aria-label="Clear typed question"
              onClick={onClear}
              disabled={disabled}
            >
              Clear
            </button>
          ) : null}
          <button
            type="submit"
            className="typed-send-button"
            aria-label="Send typed question"
            disabled={!value.trim() || disabled}
          >
            Send
          </button>
        </div>
      </form>

      {typingScreen && typeof document !== "undefined"
        ? createPortal(typingScreen, document.body)
        : typingScreen}
    </section>
  );
}

export default TypedInputPanel;
