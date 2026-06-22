import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AvatarAssistant from "./AvatarAssistant";
import type { AvatarState } from "../types";


const states: Array<[AvatarState, string]> = [
  ["idle", "Ready"],
  ["listening", "Listening"],
  ["thinking", "Thinking"],
  ["speaking", "Speaking"],
  ["error", "Something went wrong"],
  ["pharmacist_escalation", "Pharmacist requested"],
];

describe("AvatarAssistant", () => {
  it.each(states)("renders %s state accessibly", (state, label) => {
    render(<AvatarAssistant state={state} audioActivity={0.4} connected />);

    expect(screen.getByRole("region", { name: /AI assistant/i })).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("uses the Lottie avatar renderer by default", () => {
    render(<AvatarAssistant state="idle" audioActivity={0} connected />);

    expect(screen.getByLabelText(/lottie holographic ai avatar/i)).toHaveAttribute(
      "data-avatar-renderer",
      "lottie",
    );
  });

  it.each(states)("renders the optional Three.js renderer accessibly for %s", async (state, label) => {
    render(
      <AvatarAssistant
        state={state}
        audioActivity={state === "speaking" ? 0.72 : 0.2}
        connected
        renderer="threejs"
      />,
    );

    expect(
      await screen.findByLabelText(
        new RegExp(`three\\.js (holographic|humanoid) ai avatar: ${label}`, "i"),
        {},
        { timeout: 3000 },
      ),
    ).toHaveAttribute("data-avatar-renderer", "threejs");
  });

  it("keeps the Three.js renderer stable with reduced motion enabled", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<AvatarAssistant state="thinking" audioActivity={0.5} connected renderer="threejs" />);

    expect(
      await screen.findByLabelText(
        /three\.js (holographic|humanoid) ai avatar/i,
        {},
        { timeout: 3000 },
      ),
    ).toHaveAttribute("data-reduced-motion", "true");
  });

  it.each(states)("renders the optional VRM renderer accessibly for %s", async (state, label) => {
    render(
      <AvatarAssistant
        state={state}
        audioActivity={state === "speaking" ? 0.82 : 0.18}
        connected
        renderer={"vrm" as never}
      />,
    );

    expect(
      await screen.findByLabelText(
        new RegExp(`vrm (character|fallback) ai avatar: ${label}`, "i"),
        {},
        { timeout: 3000 },
      ),
    ).toHaveAttribute("data-avatar-renderer", "vrm");
  });

  it("announces pharmacist escalation as an alert", () => {
    render(
      <AvatarAssistant
        state="pharmacist_escalation"
        audioActivity={0}
        connected
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/pharmacist/i);
  });

  it("shows degraded realtime state when disconnected", () => {
    render(<AvatarAssistant state="idle" audioActivity={0} connected={false} />);

    expect(screen.getByText(/Local state mode/i)).toBeInTheDocument();
  });
});
