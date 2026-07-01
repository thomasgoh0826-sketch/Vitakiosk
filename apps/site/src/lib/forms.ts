export type SiteFormKind =
  | "lead"
  | "vitaflow"
  | "vitakiosk"
  | "partner"
  | "lesson"
  | "website";

export interface SiteFormValues {
  kind: SiteFormKind;
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  businessType: string;
  packageId: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof SiteFormValues, string>>;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const defaultFormValues: SiteFormValues = {
  kind: "lead",
  fullName: "",
  email: "",
  phone: "",
  organization: "",
  businessType: "Pharmacy",
  packageId: "vitakiosk-local-edition",
  message: "",
};

export function sanitizeText(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 1000);
}

export function validateSiteForm(values: SiteFormValues): ValidationResult {
  const errors: ValidationResult["errors"] = {};
  const fullName = sanitizeText(values.fullName);
  const email = sanitizeText(values.email).toLowerCase();
  const phone = sanitizeText(values.phone);
  const message = sanitizeText(values.message);

  if (fullName.length < 2) {
    errors.fullName = "Enter a contact name.";
  }
  if (!emailPattern.test(email)) {
    errors.email = "Enter a valid email.";
  }
  if (phone.length < 6) {
    errors.phone = "Enter a reachable phone number.";
  }
  if (message.length < 12) {
    errors.message = "Tell us what you want to build or book.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function buildSubmission(values: SiteFormValues) {
  return {
    kind: values.kind,
    full_name: sanitizeText(values.fullName),
    email: sanitizeText(values.email).toLowerCase(),
    phone: sanitizeText(values.phone),
    organization: sanitizeText(values.organization),
    business_type: sanitizeText(values.businessType),
    package_id: sanitizeText(values.packageId),
    message: sanitizeText(values.message),
  };
}
