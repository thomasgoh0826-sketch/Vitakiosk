export type TextInputMode = "popup" | "native";
export type KeyboardLanguage = "en" | "zh";

export interface TypedInputConfig {
  enabled: boolean;
  mode: TextInputMode;
  defaultLanguage: KeyboardLanguage;
}

const TEXT_INPUT_MODES = new Set<TextInputMode>(["popup", "native"]);
const KEYBOARD_LANGUAGES = new Set<KeyboardLanguage>(["en", "zh"]);

function normalizeTextInputMode(value?: string): TextInputMode {
  return TEXT_INPUT_MODES.has(value as TextInputMode)
    ? (value as TextInputMode)
    : "native";
}

function normalizeKeyboardLanguage(value?: string): KeyboardLanguage {
  return KEYBOARD_LANGUAGES.has(value as KeyboardLanguage)
    ? (value as KeyboardLanguage)
    : "en";
}

type TypedInputEnv = Pick<
  Partial<ImportMetaEnv>,
  "VITE_ENABLE_TYPED_INPUT" | "VITE_TEXT_INPUT_MODE" | "VITE_KEYBOARD_DEFAULT_LANGUAGE"
>;

export function getTypedInputConfig(env: TypedInputEnv = import.meta.env): TypedInputConfig {
  return {
    enabled: env.VITE_ENABLE_TYPED_INPUT !== "false",
    mode: normalizeTextInputMode(env.VITE_TEXT_INPUT_MODE),
    defaultLanguage: normalizeKeyboardLanguage(env.VITE_KEYBOARD_DEFAULT_LANGUAGE),
  };
}
