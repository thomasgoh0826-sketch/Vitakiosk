import { describe, expect, it } from "vitest";

import packageJson from "../package.json";
import viteConfig from "../vite.config";


describe("frontend dev server config", () => {
  it("pins Vite dev server to 127.0.0.1:5175 with strict port mode", () => {
    expect(viteConfig.server).toMatchObject({
      host: "127.0.0.1",
      port: 5175,
      strictPort: true,
    });
  });

  it("keeps the npm dev script from overriding the fixed Vite server config", () => {
    expect(packageJson.scripts.dev).toBe("vite");
    expect(packageJson.scripts.dev).not.toContain("0.0.0.0");
  });
});
