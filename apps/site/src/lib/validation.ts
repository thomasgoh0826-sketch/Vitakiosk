export type FormErrors<T extends Record<string, string>> = Partial<Record<keyof T, string>>;

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

export function validateRequired<T extends Record<string, string>>(
  values: T,
  requiredFields: Array<keyof T>,
): FormErrors<T> {
  const errors: FormErrors<T> = {};
  for (const field of requiredFields) {
    if (!normalizeText(values[field] ?? "")) {
      errors[field] = "Required";
    }
  }
  if ("email" in values && values.email && !isEmail(values.email)) {
    (errors as Record<string, string>).email = "Use a valid email";
  }
  if ("phone" in values && values.phone && normalizeText(values.phone).length < 6) {
    (errors as Record<string, string>).phone = "Use a reachable phone number";
  }
  return errors;
}
