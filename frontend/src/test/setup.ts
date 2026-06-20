import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("lottie-web/build/player/lottie_light", () => ({
  default: {
    loadAnimation: () => ({ destroy: () => undefined }),
  },
}));


afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
