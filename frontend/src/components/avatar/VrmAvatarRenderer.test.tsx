import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import VrmAvatarRenderer, { getVrmAvatarBehavior } from "./VrmAvatarRenderer";


describe("VrmAvatarRenderer", () => {
  it("marks the renderer as fallback when no VRM model URL is available", () => {
    render(<VrmAvatarRenderer state="idle" audioActivity={0} vrmModelUrl={null} />);

    expect(screen.getByLabelText(/vrm fallback ai avatar/i)).toHaveAttribute(
      "data-avatar-model",
      "fallback",
    );
  });

  it("marks the renderer as VRM-backed with full-body chamber framing when a local VRM model URL is available", () => {
    render(
      <VrmAvatarRenderer
        state="speaking"
        audioActivity={0.75}
        vrmModelUrl="/assets/avatar/vita.vrm"
      />,
    );

    const avatar = screen.getByLabelText(/vrm character ai avatar/i);
    expect(avatar).toHaveAttribute("data-avatar-renderer", "vrm");
    expect(avatar).toHaveAttribute("data-avatar-model", "vrm");
    expect(avatar).toHaveAttribute("data-avatar-model-key", "vita");
    expect(avatar).toHaveAttribute("data-avatar-framing", "full-body");
    expect(avatar).toHaveAttribute("data-avatar-crop", "full-body");
    expect(avatar).toHaveAttribute("data-avatar-stage", "full-body-chamber");
    expect(avatar).toHaveAttribute("data-camera-target", "full-body");
    expect(avatar).toHaveAttribute("data-avatar-orbit-layer", "background");
    expect(avatar).toHaveClass("vrm-avatar-portrait");
    expect(avatar).not.toHaveClass("three-avatar");
    expect(avatar.querySelector(".vrm-avatar-portrait-shell")).not.toBeNull();
    expect(avatar.querySelector(".three-avatar-canvas-shell")).toBeNull();
    expect(avatar).toHaveAttribute("data-avatar-model-url", "/assets/avatar/vita.vrm");
  });

  it("marks the selected vita-new VRM model for runtime verification", () => {
    render(
      <VrmAvatarRenderer
        state="idle"
        audioActivity={0}
        vrmModelKey="vita-new"
        vrmModelUrl="/assets/avatar/vita-new.vrm"
      />,
    );

    const avatar = screen.getByLabelText(/vrm character ai avatar/i);
    expect(avatar).toHaveAttribute("data-avatar-model", "vrm");
    expect(avatar).toHaveAttribute("data-avatar-model-key", "vita-new");
    expect(avatar).toHaveAttribute("data-avatar-model-url", "/assets/avatar/vita-new.vrm");
  });

  it("does not show technical VRM renderer labels to customers", () => {
    render(
      <VrmAvatarRenderer
        state="idle"
        audioActivity={0}
        vrmModelUrl="/assets/avatar/vita.vrm"
      />,
    );

    expect(screen.queryByText(/vrm relaxed/i)).not.toBeInTheDocument();
  });

  it.each([
    ["idle", "Ready", "relaxed", "closed", "calm", "off"],
    ["listening", "Listening", "attentive", "closed", "listening", "off"],
    ["thinking", "Thinking", "focused", "closed", "scanning", "active"],
    ["speaking", "Speaking", "friendly", "audio-reactive", "speaking", "off"],
    ["error", "Try Again", "concerned", "closed", "warning", "off"],
    [
      "pharmacist_escalation",
      "Pharmacist Requested",
      "serious",
      "closed",
      "safety",
      "off",
    ],
  ] as const)(
    "exposes the approved VRM behavior contract for %s",
    (state, label, expression, mouth, glow, scan) => {
      const behavior = getVrmAvatarBehavior(state, state === "speaking" ? 0.72 : 0.42);

      expect(behavior.customerLabel).toBe(label);
      expect(behavior.expression).toBe(expression);
      expect(behavior.mouth).toBe(mouth);
      expect(behavior.glow).toBe(glow);
      expect(behavior.scan).toBe(scan);
    },
  );

  it("uses approved customer-facing labels and behavior attributes instead of technical labels", () => {
    render(
      <VrmAvatarRenderer
        state="pharmacist_escalation"
        audioActivity={0.8}
        vrmModelUrl="/assets/avatar/vita.vrm"
      />,
    );

    const avatar = screen.getByLabelText(/vrm character ai avatar: pharmacist requested/i);
    expect(avatar).toHaveAttribute("data-vrm-expression", "serious");
    expect(avatar).toHaveAttribute("data-vrm-mouth", "closed");
    expect(avatar).toHaveAttribute("data-vrm-glow", "safety");
    expect(avatar).toHaveAttribute("data-vrm-scan", "off");
    expect(avatar).not.toHaveTextContent(/relaxed|focused|safety handoff/i);
  });
});
