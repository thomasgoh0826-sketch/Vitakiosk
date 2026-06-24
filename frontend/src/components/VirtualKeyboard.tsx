import { useEffect, useRef } from "react";

import { translations, type KioskTranslations } from "../i18n";

interface VirtualKeyboardProps {
  value: string;
  disabled?: boolean;
  labels?: KioskTranslations;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

function VirtualKeyboard({
  value,
  disabled = false,
  labels = translations.en,
  onChange,
  onClear,
  onSubmit,
  onClose,
}: VirtualKeyboardProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const focusTextarea = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const insertText = (text: string) => {
    if (disabled) {
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const cursor = start + text.length;
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const backspace = () => {
    if (disabled) {
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;

    if (start !== end) {
      onChange(`${value.slice(0, start)}${value.slice(end)}`);
      requestAnimationFrame(() => textareaRef.current?.setSelectionRange(start, start));
      return;
    }

    if (start <= 0) {
      focusTextarea();
      return;
    }

    const nextValue = `${value.slice(0, start - 1)}${value.slice(start)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      const cursor = start - 1;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const clearDraft = () => {
    onClear();
    focusTextarea();
  };

  const renderLetterRows = () => (
    <>
      {QWERTY_ROWS.map((row) => (
        <div className="keyboard-row" key={row.join("")}>
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className="keyboard-key"
              aria-label={`Type ${letter}`}
              disabled={disabled}
              onClick={() => insertText(letter.toLowerCase())}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <div className="typing-modal-backdrop" data-overlay-root="typing-screen">
      <div
        className="virtual-keyboard typing-modal"
        role="dialog"
        aria-modal="true"
        aria-label={labels.typingScreen}
        data-overlay="typing-screen"
      >
        <div className="virtual-keyboard-header">
          <div>
            <span className="typed-input-kicker">{labels.focusedTyping}</span>
            <strong>{labels.typeYourQuestion}</strong>
          </div>
          <button
            className="virtual-keyboard-close"
            type="button"
            aria-label="Close typing screen"
            onClick={onClose}
          >
            {labels.closeDone}
          </button>
        </div>

        <textarea
          ref={textareaRef}
          className="typing-modal-textarea"
          aria-label="Typing screen draft"
          value={value}
          rows={4}
          disabled={disabled}
          autoFocus
          placeholder={labels.typingPlaceholder}
          onChange={(event) => onChange(event.target.value)}
        />

        <div className="typing-modal-guidance" aria-live="polite">
          <p>{labels.keyboardGuidance}</p>
        </div>

        <div
          className="virtual-keyboard-layout"
          role="group"
          aria-label="English virtual keyboard"
          data-keyboard-mode="en"
        >
          {renderLetterRows()}
          <div className="keyboard-row keyboard-command-row">
            <button
              type="button"
              className="keyboard-key keyboard-key-wide"
              aria-label="Space"
              disabled={disabled}
              onClick={() => insertText(" ")}
            >
              {labels.space}
            </button>
            <button
              type="button"
              className="keyboard-key keyboard-key-command"
              aria-label="Backspace"
              disabled={disabled || !value}
              onClick={backspace}
            >
              {labels.backspace}
            </button>
          </div>
        </div>

        <div className="keyboard-action-row">
          <button
            type="button"
            className="keyboard-command"
            aria-label="Clear typed question"
            onClick={clearDraft}
            disabled={!value || disabled}
          >
            {labels.clear}
          </button>
          <button
            type="button"
            className="keyboard-command"
            aria-label="Done typing screen"
            onClick={onClose}
          >
            {labels.done}
          </button>
          <button
            type="button"
            className="keyboard-send"
            aria-label="Send typed question"
            onClick={onSubmit}
            disabled={!value.trim() || disabled}
          >
            {labels.send}
          </button>
        </div>

        <p className="virtual-keyboard-note">
          Native and external keyboards remain available for full IME typing. The kiosk still sends typed questions through the same safety workflow as voice.
        </p>
      </div>
    </div>
  );
}

export default VirtualKeyboard;
