import { useEffect, useRef, useState } from "react";

import type { KeyboardLanguage, TypedInputConfig } from "../inputConfig";
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
  const [keyboardLanguage, setKeyboardLanguage] =
    useState<KeyboardLanguage>(config.defaultLanguage);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const usesPopupKeyboard = config.mode === "popup";

  useEffect(() => {
    setTypingScreenOpen(false);
    setKeyboardLanguage(config.defaultLanguage);
  }, [config.defaultLanguage, resetToken]);

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
    if (usesPopupKeyboard) {
      setTypingScreenOpen(true);
      return;
    }
    inputRef.current?.focus();
  };

  return (
    <section className="panel typed-input-panel" aria-label="Typed question input">
      <div className="typed-input-header">
        <div>
          <span className="typed-input-kicker">Accessible input</span>
          <label className="typed-input-label" htmlFor="typed-question">
            {INPUT_LABEL}
          </label>
        </div>
        <span className="typed-input-mode">
          {usesPopupKeyboard ? "Popup typing mode" : "Native keyboard mode"}
        </span>
      </div>

      <form
        className="typed-input-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuestion();
        }}
      >
        <textarea
          ref={inputRef}
          id="typed-question"
          className="typed-question-input"
          value={value}
          rows={2}
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
            aria-label="Type / Keyboard"
            onClick={openTypingScreenOrFocus}
            disabled={disabled}
          >
            Type / Keyboard
          </button>
          <button
            type="button"
            className="typed-clear-button"
            aria-label="Clear typed question"
            onClick={onClear}
            disabled={!value || disabled}
          >
            Clear
          </button>
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

      <p className="typed-input-helper">
        Native keyboard is recommended for iPad, Windows touch, external keyboards,
        copy-paste, pinyin IME, and Bahasa Melayu text.
      </p>

      {usesPopupKeyboard && typingScreenOpen ? (
        <VirtualKeyboard
          value={value}
          language={keyboardLanguage}
          disabled={disabled}
          onChange={onChange}
          onLanguageChange={setKeyboardLanguage}
          onClear={onClear}
          onSubmit={submitQuestion}
          onClose={() => setTypingScreenOpen(false)}
        />
      ) : null}
    </section>
  );
}

export default TypedInputPanel;
