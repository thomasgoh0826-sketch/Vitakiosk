import { describe, expect, it } from "vitest";

import styles from "./styles.css?raw";

describe("typed input layout CSS contract", () => {
  it("keeps the normal typed input as a compact rail and protects shelf map height", () => {
    expect(styles).toContain("--typed-input-rail-height: clamp(52px, 7dvh, 72px)");
    expect(styles).toContain("minmax(160px, 0.88fr)");
    expect(styles).toContain("var(--typed-input-rail-height)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) auto");
  });
});
