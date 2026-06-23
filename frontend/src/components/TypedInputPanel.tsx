import { useEffect, useState } from "react";

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

function appendWithSpacing(current: string, next: string) {
  if (!current || current.endsWith(" ") || next === " ") {
    return `${current}${next}`;
  }
  if (/^[?,.!。！？,，吗]$/u.test(next)) {
    return `${current}${next}`;
  }
  return `${current} ${next}`;
}

function TypedInputPanel({
  value,
  config,
  resetToken,
  disabled = false,
  onChange,
  onClear,
  onSubmit,
}: TypedInputPanelProps) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardLanguage, setKeyboardLanguage] =
    useState<KeyboardLanguage>(config.defaultLanguage);
  const usesPopupKeyboard = config.mode === "popup";

  useEffect(() => {
    setKeyboardOpen(false);
    setKeyboardLanguage(config.defaultLanguage);
  }, [config.defaultLanguage, resetToken]);

  useEffect(() => {
    if (!usesPopupKeyboard) {
      setKeyboardOpen(false);
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
    setKeyboardOpen(false);
  };

  const handleInput = (text: string) => {
    onChange(appendWithSpacing(value, text));
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
          {usesPopupKeyboard ? "Popup keyboard mode" : "Device keyboard mode"}
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
          id="typed-question"
          className="typed-question-input"
          value={value}
          rows={2}
          disabled={disabled}
          placeholder={INPUT_PLACEHOLDER}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => {
            if (usesPopupKeyboard) {
              setKeyboardOpen(true);
            }
          }}
        />
        <div className="typed-input-actions">
          {usesPopupKeyboard ? (
            <button
              type="button"
              className="typed-keyboard-button"
              aria-label="Open kiosk keyboard"
              onClick={() => setKeyboardOpen(true)}
            >
              Keyboard
            </button>
          ) : null}
          <button
            type="button"
            className="typed-clear-button"
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
        You can type instead of speaking. Large touch keyboard available for
        accessibility.
      </p>

      {usesPopupKeyboard && keyboardOpen ? (
        <VirtualKeyboard
          language={keyboardLanguage}
          onLanguageChange={setKeyboardLanguage}
          onInput={handleInput}
          onBackspace={() => onChange(value.slice(0, -1))}
          onClear={onClear}
          onSubmit={submitQuestion}
          onClose={() => setKeyboardOpen(false)}
        />
      ) : null}
    </section>
  );
}

export default TypedInputPanel;
