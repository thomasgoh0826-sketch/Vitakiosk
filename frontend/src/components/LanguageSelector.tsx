import { LANGUAGE_OPTIONS, type KioskLanguage } from "../i18n";

interface LanguageSelectorProps {
  language: KioskLanguage;
  onChange: (language: KioskLanguage) => void;
}

function LanguageSelector({ language, onChange }: LanguageSelectorProps) {
  return (
    <div
      className="language-selector"
      role="group"
      aria-label="Kiosk language selector"
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          className={option.code === language ? "is-active" : undefined}
          aria-pressed={option.code === language}
          aria-label={option.label}
          onClick={() => onChange(option.code)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default LanguageSelector;
