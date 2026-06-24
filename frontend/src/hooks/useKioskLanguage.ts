import { useCallback, useMemo, useState } from "react";

import {
  getTranslations,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  type KioskLanguage,
  type PreferredLanguage,
} from "../i18n";

interface LanguageState {
  language: KioskLanguage;
  manuallySelected: boolean;
}

function readInitialLanguage(): LanguageState {
  if (typeof window === "undefined") {
    return { language: "en", manuallySelected: false };
  }

  const storedLanguage = normalizeLanguage(
    window.localStorage.getItem(LANGUAGE_STORAGE_KEY),
  );
  if (storedLanguage) {
    return { language: storedLanguage, manuallySelected: true };
  }

  return { language: "en", manuallySelected: false };
}

function useKioskLanguage() {
  const [state, setState] = useState<LanguageState>(readInitialLanguage);

  const setLanguage = useCallback((language: KioskLanguage) => {
    setState({ language, manuallySelected: true });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, []);

  const preferredLanguage: PreferredLanguage = state.manuallySelected
    ? state.language
    : "auto";

  const t = useMemo(() => getTranslations(state.language), [state.language]);

  return {
    language: state.language,
    manuallySelected: state.manuallySelected,
    preferredLanguage,
    setLanguage,
    t,
  };
}

export default useKioskLanguage;
