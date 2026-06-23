import { useEffect, useRef } from "react";

import type { KeyboardLanguage } from "../inputConfig";
import LanguageSwitcher from "./LanguageSwitcher";

interface VirtualKeyboardProps {
  value: string;
  language: KeyboardLanguage;
  disabled?: boolean;
  onChange: (value: string) => void;
  onLanguageChange: (language: KeyboardLanguage) => void;
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
  language,
  disabled = false,
  onChange,
  onLanguageChange,
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

  useEffect(() => {
    if (language === "zh") {
      focusTextarea();
    }
  }, [language]);

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

  const handleLetter = (letter: string) => {
    if (disabled) {
      return;
    }

    insertText(letter.toLowerCase());
  };

  const handleSpace = () => {
    insertText(" ");
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
              onClick={() => handleLetter(letter)}
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
        aria-label="VitaKiosk typing screen"
        data-overlay="typing-screen"
      >
        <div className="virtual-keyboard-header">
          <div>
            <span className="typed-input-kicker">Focused typing</span>
            <strong>Type your question</strong>
          </div>
          <LanguageSwitcher value={language} onChange={onLanguageChange} />
          <button
            className="virtual-keyboard-close"
            type="button"
            aria-label="Close typing screen"
            onClick={onClose}
          >
            Close / Done
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
          placeholder="Type your question here. EN mode has an on-screen QWERTY keyboard; Chinese input uses your device pinyin IME or external keyboard."
          onChange={(event) => onChange(event.target.value)}
        />

        <div className="typing-modal-guidance" aria-live="polite">
          {language === "zh" ? (
            <p>
              Use device Chinese keyboard / pinyin IME for Chinese input. This kiosk
              keyboard does not include custom word or product phrase shortcuts.
            </p>
          ) : (
            <p>EN mode supports English and Bahasa Melayu typing with QWERTY keys or your device keyboard.</p>
          )}
        </div>

        {language === "zh" ? (
          <div className="device-ime-panel" role="region" aria-label="Chinese device keyboard guidance">
            <p>
              Use device Chinese keyboard / pinyin IME, Windows touch keyboard, iPad
              keyboard, or an external keyboard for Chinese typing.
            </p>
            <button
              type="button"
              className="keyboard-key keyboard-key-command"
              aria-label="Use device Chinese keyboard"
              disabled={disabled}
              onClick={focusTextarea}
            >
              Use device keyboard
            </button>
          </div>
        ) : null}

        {language === "en" ? (
          <div
            className="virtual-keyboard-layout"
            role="group"
            aria-label="English virtual keyboard"
            data-keyboard-mode={language}
          >
            {renderLetterRows()}
            <div className="keyboard-row keyboard-command-row">
              <button
                type="button"
                className="keyboard-key keyboard-key-wide"
                aria-label="Space"
                disabled={disabled}
                onClick={handleSpace}
              >
                Space
              </button>
              <button
                type="button"
                className="keyboard-key keyboard-key-command"
                aria-label="Backspace"
                disabled={disabled || !value}
                onClick={backspace}
              >
                Backspace
              </button>
            </div>
          </div>
        ) : null}

        <div className="keyboard-action-row">
          <button
            type="button"
            className="keyboard-command"
            aria-label="Clear typed question"
            onClick={clearDraft}
            disabled={!value || disabled}
          >
            Clear
          </button>
          <button
            type="button"
            className="keyboard-command"
            aria-label="Done typing screen"
            onClick={onClose}
          >
            Done
          </button>
          <button
            type="button"
            className="keyboard-send"
            aria-label="Send typed question"
            onClick={onSubmit}
            disabled={!value.trim() || disabled}
          >
            Send
          </button>
        </div>

        <p className="virtual-keyboard-note">
          Native and external keyboards remain available for full IME typing. The kiosk
          keyboard does not provide product, promotion, or medical phrase shortcuts.
        </p>
      </div>
    </div>
  );
}

export default VirtualKeyboard;
