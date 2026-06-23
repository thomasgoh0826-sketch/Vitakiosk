import type { KeyboardLanguage } from "../inputConfig";
import LanguageSwitcher from "./LanguageSwitcher";


interface VirtualKeyboardProps {
  language: KeyboardLanguage;
  onLanguageChange: (language: KeyboardLanguage) => void;
  onInput: (text: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

const LATIN_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "?", ","],
];

const MALAY_QUICK_KEYS = [
  "ubat",
  "batuk",
  "stok",
  "promosi",
  "rak",
  "mana",
  "harga",
  "farmasi",
];

const CHINESE_QUICK_KEYS = [
  "这个",
  "产品",
  "有",
  "promotion",
  "吗",
  "在哪里",
  "库存",
  "价格",
  "药剂师",
  "怀孕",
];

function VirtualKeyboard({
  language,
  onLanguageChange,
  onInput,
  onBackspace,
  onClear,
  onSubmit,
  onClose,
}: VirtualKeyboardProps) {
  const isChinese = language === "zh";

  return (
    <div
      className="virtual-keyboard"
      role="dialog"
      aria-modal="false"
      aria-label="VitaKiosk touch keyboard"
    >
      <div className="virtual-keyboard-header">
        <div>
          <span className="typed-input-kicker">Accessibility keyboard</span>
          <strong>Touch to type your question</strong>
        </div>
        <LanguageSwitcher value={language} onChange={onLanguageChange} />
        <button
          className="virtual-keyboard-close"
          type="button"
          aria-label="Close touch keyboard"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {isChinese ? (
        <div className="keyboard-quick-grid" aria-label="Chinese quick input">
          {CHINESE_QUICK_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="keyboard-key keyboard-key-phrase"
              aria-label={`Type ${key}`}
              onClick={() => onInput(key)}
            >
              {key}
            </button>
          ))}
        </div>
      ) : (
        <div className="keyboard-latin-layout" aria-label="Latin keyboard input">
          {LATIN_ROWS.map((row) => (
            <div className="keyboard-row" key={row.join("")}>
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="keyboard-key"
                  aria-label={`Type ${key}`}
                  onClick={() => onInput(key.toLowerCase())}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
          {language === "bm" ? (
            <div className="keyboard-quick-grid keyboard-quick-grid-compact">
              {MALAY_QUICK_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="keyboard-key keyboard-key-phrase"
                  aria-label={`Type ${key}`}
                  onClick={() => onInput(key)}
                >
                  {key}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="keyboard-action-row">
        <button type="button" className="keyboard-command" onClick={() => onInput(" ")}>
          Space
        </button>
        <button type="button" className="keyboard-command" onClick={onBackspace}>
          Backspace
        </button>
        <button type="button" className="keyboard-command" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="keyboard-send" onClick={onSubmit}>
          Send
        </button>
      </div>

      <p className="virtual-keyboard-note">
        Chinese mode uses quick phrases for the demo kiosk. Full IME support can be
        delegated to the device keyboard in native mode.
      </p>
    </div>
  );
}

export default VirtualKeyboard;
