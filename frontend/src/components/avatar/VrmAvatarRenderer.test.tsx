import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import VrmAvatarRenderer from "./VrmAvatarRenderer";


describe("VrmAvatarRenderer", () => {
  it("marks the renderer as fallback when no VRM model URL is available", () => {
    render(<VrmAvatarRenderer state="idle" audioActivity={0} vrmModelUrl={null} />);

    expect(screen.getByLabelText(/vrm fallback ai avatar/i)).toHaveAttribute(
      "data-avatar-model",
      "fallback",
    );
  });

  it("marks the renderer as VRM-backed when a local VRM model URL is available", () => {
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
    expect(avatar).toHaveAttribute("data-avatar-framing", "portrait");
    expect(avatar).toHaveAttribute("data-avatar-crop", "bust");
    expect(avatar).toHaveClass("vrm-avatar-portrait");
    expect(avatar).not.toHaveClass("three-avatar");
    expect(avatar.querySelector(".vrm-avatar-portrait-shell")).not.toBeNull();
    expect(avatar.querySelector(".three-avatar-canvas-shell")).toBeNull();
    expect(avatar).toHaveAttribute("data-avatar-model-url", "/assets/avatar/vita.vrm");
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
});
