import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
