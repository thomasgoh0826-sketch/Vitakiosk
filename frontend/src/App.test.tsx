import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";


describe("VitaKiosk shell", () => {
  it("renders every required kiosk region", () => {
    render(<App />);

    for (const name of [
      /AI assistant/i,
      /Hold to Speak/i,
      /Product/i,
      /Promotion/i,
      /Shelf navigation map/i,
      /ERP data/i,
      /Pharmacist assistance/i,
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("labels all visible domain data as fictional mock data", () => {
    render(<App />);

    expect(screen.getAllByText(/Mock VitaFlow/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Fictional demo data/i)).toBeInTheDocument();
  });
});
