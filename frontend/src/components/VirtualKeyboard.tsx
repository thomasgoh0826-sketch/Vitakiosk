import { useEffect, useMemo, useRef, useState } from "react";

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

interface PinyinCandidate {
  pinyin: string;
  text: string;
}

const QWERTY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const COMMON_ZH_CANDIDATES: PinyinCandidate[] = [
  { pinyin: "zhe", text: "这个" },
  { pinyin: "zhege", text: "这个" },
  { pinyin: "chanpin", text: "产品" },
  { pinyin: "you", text: "有" },
  { pinyin: "ma", text: "吗" },
  { pinyin: "cuxiao", text: "促销" },
  { pinyin: "promotion", text: "promotion" },
  { pinyin: "zainali", text: "在哪里" },
  { pinyin: "kucun", text: "库存" },
  { pinyin: "jiage", text: "价格" },
  { pinyin: "yaojishi", text: "药剂师" },
  { pinyin: "huaiyun", text: "怀孕" },
  { pinyin: "yishengjun", text: "益生菌" },
  { pinyin: "changwei", text: "肠胃" },
  { pinyin: "weishengsu", text: "维生素" },
  { pinyin: "panadol", text: "Panadol" },
  { pinyin: "probiotic", text: "probiotic" },
];

const DEFAULT_ZH_CANDIDATES = [
  "这个",
  "产品",
  "有",
  "吗",
  "促销",
  "在哪里",
  "库存",
  "价格",
  "药剂师",
  "怀孕",
  "益生菌",
  "维生素",
  "Panadol",
  "probiotic",
];

function getCandidates(pinyinBuffer: string): string[] {
  const normalized = pinyinBuffer.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_ZH_CANDIDATES;
  }

  const matches = COMMON_ZH_CANDIDATES.filter((candidate) =>
    candidate.pinyin.startsWith(normalized),
  ).map((candidate) => candidate.text);

  return Array.from(new Set(matches)).slice(0, 8);
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
  const [pinyinBuffer, setPinyinBuffer] = useState("");
  const candidates = useMemo(() => getCandidates(pinyinBuffer), [pinyinBuffer]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    setPinyinBuffer("");
  }, [language]);

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

    if (language === "zh" && pinyinBuffer) {
      setPinyinBuffer((current) => current.slice(0, -1));
      focusTextarea();
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

    if (language === "zh") {
      setPinyinBuffer((current) => `${current}${letter.toLowerCase()}`);
      focusTextarea();
      return;
    }

    insertText(letter.toLowerCase());
  };

  const handleSpace = () => {
    if (language === "zh" && pinyinBuffer && candidates[0]) {
      insertText(candidates[0]);
      setPinyinBuffer("");
      return;
    }

    insertText(" ");
  };

  const clearDraft = () => {
    setPinyinBuffer("");
    onClear();
    focusTextarea();
  };

  const insertCandidate = (candidate: string) => {
    insertText(candidate);
    setPinyinBuffer("");
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
          placeholder="Type your question here. You can use the on-screen keyboard, pinyin candidates, Chinese IME, or an external keyboard."
          onChange={(event) => onChange(event.target.value)}
        />

        <div className="typing-modal-guidance" aria-live="polite">
          {language === "zh" ? (
            <p>
              中文 mode is demo pinyin input: tap pinyin letters, choose a candidate, or use
              your device keyboard for full native Chinese IME.
            </p>
          ) : (
            <p>EN mode supports English and Bahasa Melayu typing with QWERTY keys or your device keyboard.</p>
          )}
        </div>

        {language === "zh" ? (
          <div className="pinyin-panel">
            <div
              className="pinyin-composition"
              role="status"
              aria-label="Pinyin composition"
              aria-live="polite"
            >
              {pinyinBuffer ? pinyinBuffer : "Tap pinyin keys"}
            </div>
            <div className="pinyin-candidates" role="region" aria-label="Chinese candidates">
              {candidates.length ? (
                candidates.map((candidate) => (
                  <button
                    key={`${pinyinBuffer || "default"}-${candidate}`}
                    type="button"
                    className="pinyin-candidate"
                    aria-label={`Insert candidate ${candidate}`}
                    disabled={disabled}
                    onClick={() => insertCandidate(candidate)}
                  >
                    {candidate}
                  </button>
                ))
              ) : (
                <span className="pinyin-empty">No demo candidate. Use device keyboard.</span>
              )}
            </div>
          </div>
        ) : null}

        <div
          className="virtual-keyboard-layout"
          role="group"
          aria-label={language === "zh" ? "Chinese pinyin virtual keyboard" : "English virtual keyboard"}
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
              disabled={disabled || (!value && !pinyinBuffer)}
              onClick={backspace}
            >
              Backspace
            </button>
            {language === "zh" ? (
              <button
                type="button"
                className="keyboard-key keyboard-key-command"
                aria-label="Use device keyboard"
                onClick={focusTextarea}
              >
                Use device keyboard
              </button>
            ) : null}
          </div>
        </div>

        <div className="keyboard-action-row">
          <button
            type="button"
            className="keyboard-command"
            aria-label="Clear typed question"
            onClick={clearDraft}
            disabled={(!value && !pinyinBuffer) || disabled}
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
          Demo Chinese candidates are limited for kiosk use. Native and external keyboards
          remain available for full IME typing.
        </p>
      </div>
    </div>
  );
}

export default VirtualKeyboard;
