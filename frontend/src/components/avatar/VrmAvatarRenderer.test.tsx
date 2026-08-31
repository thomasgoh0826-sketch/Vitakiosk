import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import VrmAvatarRenderer, { getVrmAvatarBehavior } from "./VrmAvatarRenderer";


describe("VrmAvatarRenderer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks the renderer as fallback when no VRM model URL is available", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    render(<VrmAvatarRenderer state="idle" audioActivity={0} vrmModelUrl={null} />);

    expect(screen.getByLabelText(/vrm fallback ai avatar/i)).toHaveAttribute(
      "data-avatar-model",
      "fallback",
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("VitaKiosk VRM fallback"),
      expect.objectContaining({
        reason: "missing-vrm-model-url",
      }),
    );
  });

  it("marks the renderer as VRM-backed with full-body chamber framing when a local VRM model URL is available", () => {
    render(
      <VrmAvatarRenderer
        state="speaking"
        audioActivity={0.75}
        vrmModelKey="vita"
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

  it("logs a clear fallback reason when WebGL is unavailable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    render(
      <VrmAvatarRenderer
        state="idle"
        audioActivity={0}
        vrmModelKey="vita-new"
        vrmModelUrl="/assets/avatar/vita-new.vrm"
      />,
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("VitaKiosk VRM fallback"),
      expect.objectContaining({
        reason: "webgl-unavailable",
        modelKey: "vita-new",
      }),
    );
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
    ["idle", "Ready", "relaxed", "neutral_idle", "center", "none", "closed", "calm", "off"],
    ["listening", "Listening", "attentive", "neutral_idle", "center", "none", "closed", "listening", "off"],
    ["thinking", "Thinking", "focused", "neutral_idle", "center", "none", "closed", "scanning", "active"],
    ["speaking", "Speaking", "friendly", "neutral_idle", "center", "none", "audio-reactive", "speaking", "off"],
    ["error", "Try Again", "concerned", "neutral_idle", "center", "none", "closed", "warning", "off"],
    [
      "pharmacist_escalation",
      "Pharmacist Requested",
      "serious",
      "neutral_idle",
      "center",
      "none",
      "closed",
      "safety",
      "off",
    ],
  ] as const)(
    "exposes the approved VRM behavior contract for %s",
    (state, label, expression, presentationExpression, focusTarget, gesture, mouth, glow, scan) => {
      const behavior = getVrmAvatarBehavior(state, state === "speaking" ? 0.72 : 0.42);

      expect(behavior.customerLabel).toBe(label);
      expect(behavior.expression).toBe(expression);
      expect(behavior.presentationExpression).toBe(presentationExpression);
      expect(behavior.focusTarget).toBe(focusTarget);
      expect(behavior.gesture).toBe(gesture);
      expect(behavior.mouth).toBe(mouth);
      expect(behavior.glow).toBe(glow);
      expect(behavior.scan).toBe(scan);
    },
  );

  it.each([
    ["product details", "friendly_explaining", "product", "present_product", "friendly"],
    ["promotion leaflet", "happy_highlight", "promotion", "present_promotion", "happy_highlight"],
    ["shelf map", "focused_guidance", "shelf", "guide_shelf", "focused_guidance"],
    ["pharmacist safety", "safety_alert", "pharmacist", "safety_handoff", "serious"],
  ] as const)(
    "maps %s presentation to expressive VRM behavior",
    (_label, expressionState, focusTarget, gesture, expression) => {
      const behavior = getVrmAvatarBehavior("speaking", 0.72, {
        expression: expressionState,
        focusTarget,
        gesture,
      });

      expect(behavior.expression).toBe(expression);
      expect(behavior.presentationExpression).toBe(expressionState);
      expect(behavior.focusTarget).toBe(focusTarget);
      expect(behavior.gesture).toBe(gesture);
    },
  );

  it("keeps the mouth closed and expression neutral after returning to ready from a promotion action", () => {
    const behavior = getVrmAvatarBehavior("idle", 0, {
      expression: "happy_highlight",
      focusTarget: "promotion",
      gesture: "present_promotion",
    });

    expect(behavior.customerLabel).toBe("Ready");
    expect(behavior.expression).toBe("relaxed");
    expect(behavior.mouth).toBe("closed");
  });

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
    expect(avatar).toHaveAttribute("data-vrm-presentation", "neutral_idle");
    expect(avatar).toHaveAttribute("data-vrm-focus-target", "center");
    expect(avatar).toHaveAttribute("data-vrm-gesture", "none");
    expect(avatar).toHaveAttribute("data-vrm-mouth", "closed");
    expect(avatar).toHaveAttribute("data-vrm-glow", "safety");
    expect(avatar).toHaveAttribute("data-vrm-scan", "off");
    expect(avatar).not.toHaveTextContent(/relaxed|focused|safety handoff/i);
  });
});
