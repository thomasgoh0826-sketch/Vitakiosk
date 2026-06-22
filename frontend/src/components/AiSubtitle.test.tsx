import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AiSubtitle from "./AiSubtitle";
import { SUBTITLE_CUE_MS } from "../hooks/useSubtitlePlayback";


describe("AiSubtitle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders progressive speaking subtitles without a full paragraph block", () => {
    vi.useFakeTimers();
    render(
      <AiSubtitle
        state="speaking"
        responseText="This product has an active promotion. I can enlarge the leaflet for you."
        error={null}
      />,
    );

    const subtitle = screen.getByTestId("ai-subtitle-line");
    expect(subtitle).toHaveTextContent("This product has an active promotion.");
    expect(subtitle).not.toHaveTextContent("I can enlarge the leaflet for you.");

    act(() => {
      vi.advanceTimersByTime(SUBTITLE_CUE_MS);
    });

    expect(subtitle).toHaveTextContent("I can enlarge the leaflet for you.");
    expect(subtitle).not.toHaveTextContent("This product has an active promotion.");
  });

  it("shows short state copy for idle, thinking, error, and escalation", () => {
    const { rerender } = render(
      <AiSubtitle state="idle" responseText="" error={null} />,
    );

    expect(screen.getByTestId("ai-subtitle-line")).toHaveTextContent(
      "Tap to Speak to ask about products, stock, promotions, or shelf location.",
    );

    rerender(<AiSubtitle state="thinking" responseText="" error={null} />);
    expect(screen.getByTestId("ai-subtitle-line")).toHaveTextContent("Preparing answer…");

    rerender(
      <AiSubtitle
        state="error"
        responseText=""
        error="Microphone permission is required."
      />,
    );
    expect(screen.getByTestId("ai-subtitle-line")).toHaveTextContent(
      "Sorry, I could not hear that clearly. Please try again.",
    );

    rerender(
      <AiSubtitle
        state="pharmacist_escalation"
        responseText="A pharmacist has been asked to assist."
        error={null}
      />,
    );
    expect(screen.getByTestId("ai-subtitle-line")).toHaveTextContent(
      "For your safety, I will request pharmacist assistance.",
    );
  });
});
