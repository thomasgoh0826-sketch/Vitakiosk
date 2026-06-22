import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";


describe("VitaKiosk shell", () => {
  it("renders every required kiosk region", () => {
    render(<App />);

    for (const name of [
      /AI assistant/i,
      /Voice assistant controls/i,
      /Product/i,
      /Promotion/i,
      /Shelf navigation map/i,
      /ERP data/i,
      /Pharmacist assistance/i,
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Tap to Speak" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.queryByText(/Hold to Speak/i)).not.toBeInTheDocument();
  });

  it("labels all visible domain data as fictional mock data", () => {
    render(<App />);

    expect(screen.getAllByText(/Mock VitaFlow/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Fictional demo data/i)).toBeInTheDocument();
  });
});
