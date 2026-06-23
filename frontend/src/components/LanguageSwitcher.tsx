import type { KeyboardLanguage } from "../inputConfig";

interface LanguageOption {
  value: KeyboardLanguage;
  label: string;
  ariaLabel: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", label: "EN", ariaLabel: "English keyboard" },
  { value: "zh", label: "中文", ariaLabel: "Chinese keyboard" },
];

interface LanguageSwitcherProps {
  value: KeyboardLanguage;
  onChange: (language: KeyboardLanguage) => void;
}

function LanguageSwitcher({ value, onChange }: LanguageSwitcherProps) {
  return (
    <div className="language-switcher" role="group" aria-label="Input language preference">
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="language-switcher-button"
          aria-label={option.ariaLabel}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
