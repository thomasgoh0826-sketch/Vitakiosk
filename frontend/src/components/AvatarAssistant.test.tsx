import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AvatarAssistant from "./AvatarAssistant";
import type { AvatarState } from "../types";


const states: Array<[AvatarState, string]> = [
  ["idle", "Ready"],
  ["listening", "Listening"],
  ["thinking", "Thinking"],
  ["speaking", "Speaking"],
  ["error", "Try Again"],
  ["pharmacist_escalation", "Pharmacist Requested"],
];

describe("AvatarAssistant", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(states)("renders %s state accessibly", (state, label) => {
    render(<AvatarAssistant state={state} audioActivity={0.4} connected />);

    expect(screen.getByRole("region", { name: /AI assistant/i })).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each([
    ["idle", "breathing", "0.12"],
    ["listening", "microphone", "0.64"],
    ["thinking", "scanning", "0.30"],
    ["speaking", "playback", "0.72"],
    ["error", "warning", "0.22"],
    ["pharmacist_escalation", "safety", "0.26"],
  ] as const)("renders a state-aware %s waveform", (state, mode, expectedActivity) => {
    render(<AvatarAssistant state={state} audioActivity={state === "listening" ? 0.64 : 0.72} connected />);

    const waveform = screen.getByTestId("assistant-waveform");
    expect(waveform).toHaveAttribute("data-state", state);
    expect(waveform).toHaveAttribute("data-waveform-mode", mode);
    expect(waveform).toHaveAttribute("data-visual-activity", expectedActivity);
    expect(waveform).toHaveClass(`assistant-waveform-${state}`);
    expect(screen.getAllByTestId("assistant-waveform-bar")).toHaveLength(25);
  });

  it("marks the listening waveform as audio-reactive when microphone activity is present", () => {
    render(<AvatarAssistant state="listening" audioActivity={0.68} connected />);

    expect(screen.getByTestId("assistant-waveform")).toHaveClass("is-audio-reactive");
  });

  it("uses subtle simulated waveform activity for mock speaking when no playback analyser value is available", () => {
    render(<AvatarAssistant state="speaking" audioActivity={0} connected />);

    const waveform = screen.getByTestId("assistant-waveform");
    expect(waveform).toHaveAttribute("data-audio-source", "simulated");
    expect(waveform).toHaveAttribute("data-visual-activity", "0.34");
  });

  it("keeps state-aware waveform readable in reduced-motion mode", () => {
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

    render(<AvatarAssistant state="thinking" audioActivity={0.5} connected />);

    expect(screen.getByTestId("assistant-waveform")).toHaveAttribute("data-reduced-motion", "true");
  });

  it("uses the Lottie avatar renderer by default", () => {
    vi.stubEnv("VITE_AVATAR_RENDERER", "");
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
        { timeout: 8000 },
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

  it("selects VRM from VITE_AVATAR_RENDERER and the vita-new model from VITE_VRM_MODEL", async () => {
    vi.stubEnv("VITE_AVATAR_RENDERER", "vrm");
    vi.stubEnv("VITE_VRM_MODEL", "vita-new");

    render(<AvatarAssistant state="idle" audioActivity={0} connected />);

    const avatar = await screen.findByLabelText(
      /vrm (character|fallback) ai avatar: ready/i,
      {},
      { timeout: 3000 },
    );
    expect(avatar).toHaveAttribute("data-avatar-renderer", "vrm");
    expect(avatar).toHaveAttribute("data-avatar-model-key", "vita-new");
    expect(screen.queryByText("Renderer: vrm")).not.toBeInTheDocument();
    expect(screen.queryByText("Model: vita-new")).not.toBeInTheDocument();
  });

  it("shows renderer diagnostics only when explicit debug status is enabled", async () => {
    vi.stubEnv("VITE_SHOW_DEBUG_STATUS", "true");
    vi.stubEnv("VITE_AVATAR_RENDERER", "vrm");
    vi.stubEnv("VITE_VRM_MODEL", "vita-new");

    render(<AvatarAssistant state="idle" audioActivity={0} connected />);

    await screen.findByLabelText(
      /vrm (character|fallback) ai avatar: ready/i,
      {},
      { timeout: 3000 },
    );
    expect(screen.getByText("Renderer: vrm")).toBeInTheDocument();
    expect(screen.getByText("Model: vita-new")).toBeInTheDocument();
  });

  it("shows the default holographic renderer when VITE_AVATAR_RENDERER is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("VITE_AVATAR_RENDERER", "");

    render(<AvatarAssistant state="idle" audioActivity={0} connected />);

    expect(screen.getByLabelText(/lottie holographic ai avatar/i)).toHaveAttribute(
      "data-avatar-renderer",
      "lottie",
    );
    expect(screen.queryByText("Renderer: lottie")).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      "VITE_AVATAR_RENDERER is not set to vrm; using fallback renderer",
      expect.objectContaining({
        configuredRenderer: "missing",
        fallbackRenderer: "lottie",
      }),
    );
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
