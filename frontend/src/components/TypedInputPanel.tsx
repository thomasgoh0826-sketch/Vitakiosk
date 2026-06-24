import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { translations, type KioskTranslations } from "../i18n";
import type { TypedInputConfig } from "../inputConfig";
import VirtualKeyboard from "./VirtualKeyboard";

interface TypedInputPanelProps {
  value: string;
  config: TypedInputConfig;
  resetToken: number;
  disabled?: boolean;
  labels?: KioskTranslations;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: (question: string) => void;
}

function TypedInputPanel({
  value,
  config,
  resetToken,
  disabled = false,
  labels = translations.en,
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
      labels={labels}
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
          {labels.typeYourQuestion}
        </label>
        <input
          ref={inputRef}
          id="typed-question"
          className="typed-question-input"
          type="text"
          value={value}
          disabled={disabled}
          placeholder={labels.askPlaceholder}
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
            aria-label={labels.openTypingScreen}
            title={labels.openTypingScreen}
            onClick={openTypingScreenOrFocus}
            disabled={disabled}
          >
            <span aria-hidden="true">⌨</span>
          </button>
          {value ? (
            <button
              type="button"
              className="typed-clear-button"
              aria-label={`${labels.clear} typed question`}
              onClick={onClear}
              disabled={disabled}
            >
              {labels.clear}
            </button>
          ) : null}
          <button
            type="submit"
            className="typed-send-button"
            aria-label={`${labels.send} typed question`}
            disabled={!value.trim() || disabled}
          >
            {labels.send}
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
