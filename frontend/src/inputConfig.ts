export type TextInputMode = "popup" | "native";

export interface TypedInputConfig {
  enabled: boolean;
  mode: TextInputMode;
}

const TEXT_INPUT_MODES = new Set<TextInputMode>(["popup", "native"]);
function normalizeTextInputMode(value?: string): TextInputMode {
  return TEXT_INPUT_MODES.has(value as TextInputMode)
    ? (value as TextInputMode)
    : "native";
}

type TypedInputEnv = Pick<
  Partial<ImportMetaEnv>,
  "VITE_ENABLE_TYPED_INPUT" | "VITE_TEXT_INPUT_MODE"
>;

export function getTypedInputConfig(env: TypedInputEnv = import.meta.env): TypedInputConfig {
  return {
    enabled: env.VITE_ENABLE_TYPED_INPUT !== "false",
    mode: normalizeTextInputMode(env.VITE_TEXT_INPUT_MODE),
  };
}
