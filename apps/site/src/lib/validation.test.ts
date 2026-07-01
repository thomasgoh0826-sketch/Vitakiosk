import { describe, expect, it } from "vitest";

import { normalizeText, validateRequired } from "./validation";

describe("site form validation", () => {
  it("validates required fields and email format", () => {
    const errors = validateRequired(
      { name: "", email: "bad", phone: "123", topic: "AI lesson" },
      ["name", "email", "phone"],
    );

    expect(errors).toEqual({
      name: "Required",
      email: "Use a valid email",
      phone: "Use a reachable phone number",
    });
  });

  it("normalizes control characters before submission", () => {
    expect(normalizeText("  Hello\u0000   VitaKiosk\nAsia  ")).toBe("Hello VitaKiosk Asia");
  });
});
