import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ThreeAvatarRenderer from "./ThreeAvatarRenderer";


describe("ThreeAvatarRenderer GLB model support", () => {
  it("marks the renderer as abstract fallback when no GLB model URL is available", () => {
    render(<ThreeAvatarRenderer state="idle" audioActivity={0} avatarModelUrl={null} />);

    expect(screen.getByLabelText(/three\.js holographic ai avatar/i)).toHaveAttribute(
      "data-avatar-model",
      "abstract-fallback",
    );
  });

  it("marks the renderer as GLB-backed when a model URL is available", () => {
    render(
      <ThreeAvatarRenderer
        state="speaking"
        audioActivity={0.75}
        avatarModelUrl="/assets/avatar/vitakiosk-avatar.glb"
      />,
    );

    const avatar = screen.getByLabelText(/three\.js humanoid ai avatar/i);
    expect(avatar).toHaveAttribute("data-avatar-model", "glb");
    expect(avatar).toHaveAttribute("data-avatar-model-url", "/assets/avatar/vitakiosk-avatar.glb");
  });
});
