import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HoldToSpeakButton from "./HoldToSpeakButton";


describe("HoldToSpeakButton", () => {
  it("starts on pointer down and stops on pointer up", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(
      <HoldToSpeakButton
        onStart={onStart}
        onStop={onStop}
        disabled={false}
      />,
    );

    const button = screen.getByRole("button", { name: /hold to speak/i });
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("supports Space without duplicate starts", () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(
      <HoldToSpeakButton
        onStart={onStart}
        onStop={onStop}
        disabled={false}
      />,
    );

    const button = screen.getByRole("button", { name: /hold to speak/i });
    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyDown(button, { key: " ", repeat: true });
    fireEvent.keyUp(button, { key: " " });

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("does not start when disabled", () => {
    const onStart = vi.fn();
    render(
      <HoldToSpeakButton onStart={onStart} onStop={vi.fn()} disabled />,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: /hold to speak/i }));

    expect(onStart).not.toHaveBeenCalled();
  });
});
