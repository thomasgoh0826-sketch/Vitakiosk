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
          rows={7}
          disabled={disabled}
          autoFocus
          placeholder="Type your question here. You can use pinyin, Chinese IME, English, or Bahasa Melayu text."
          onChange={(event) => onChange(event.target.value)}
        />

        <div className="typing-modal-guidance" aria-live="polite">
          {language === "zh" ? (
            <p>中文 mode uses your device keyboard or IME. Use pinyin/handwriting from the operating system.</p>
          ) : (
            <p>EN mode supports English and Bahasa Melayu typing with the device or external keyboard.</p>
          )}
        </div>

        <div className="keyboard-action-row">
          <button
            type="button"
            className="keyboard-command"
            aria-label="Clear typed question"
            onClick={onClear}
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
          This screen is for accessibility and kiosk focus. It does not replace the
          iPad, Windows touch, or external keyboard.
        </p>
      </div>
    </div>
  );
}

export default VirtualKeyboard;
