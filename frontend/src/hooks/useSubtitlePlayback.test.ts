import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SUBTITLE_CUE_MS,
  splitSubtitleChunks,
  useSubtitlePlayback,
} from "./useSubtitlePlayback";


describe("subtitle playback helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("splits AI copy into natural cinematic subtitle phrases", () => {
    expect(
      splitSubtitleChunks(
        "This product has an active promotion. I can enlarge the leaflet for you.",
      ),
    ).toEqual([
      "This product has an active promotion.",
      "I can enlarge the leaflet for you.",
    ]);
  });

  it("shows one subtitle phrase at a time during speaking", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      useSubtitlePlayback({
        text: "This product has an active promotion. I can enlarge the leaflet for you.",
        state: "speaking",
      }),
    );

    expect(result.current.subtitle).toBe("This product has an active promotion.");

    act(() => {
      vi.advanceTimersByTime(SUBTITLE_CUE_MS);
    });

    expect(result.current.subtitle).toBe("I can enlarge the leaflet for you.");
    expect(result.current.subtitle).not.toContain("This product has an active promotion.");
  });
});
