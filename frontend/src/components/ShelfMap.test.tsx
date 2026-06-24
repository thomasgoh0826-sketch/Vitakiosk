import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Product } from "../types";
import ShelfMap from "./ShelfMap";

const product: Product = {
  id: "MOCK-P001",
  name: "Relief Balm",
  branch_id: "SG-001",
  price: 12.5,
  stock: 18,
  shelf_location: "A-03",
  source: "mock_vitaflow",
  unavailable_reason: null,
};

describe("ShelfMap", () => {
  it("renders an accessible indoor route map with source-backed location data", () => {
    render(<ShelfMap product={product} />);

    expect(
      screen.getByRole("region", { name: "Shelf navigation map" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Route from Entrance to Aisle 03, Shelf A-03",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("You are here at Entrance")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Target location Shelf A-03 in Aisle 03"),
    ).toBeInTheDocument();
    expect(screen.getByText("A-03")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Target shelf details")).getByText("02"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Entrance.*Aisle 03.*Shelf A-03/)).toBeInTheDocument();
    expect(screen.getByTestId("pharmacy-map-canvas")).toHaveClass(
      "shelf-map-canvas",
    );
    expect(screen.getByTestId("pharmacy-route-path")).toHaveAttribute(
      "d",
      "M70 228 L170 228 L170 176 L430 176 L430 82 L500 82",
    );
  });

  it("does not invent a route when VitaFlow has no shelf location", () => {
    render(<ShelfMap product={{ ...product, shelf_location: null }} />);

    expect(
      screen.getByText("Shelf location unavailable from VitaFlow."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/Target location/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /Route from Entrance/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Shelf A-03")).not.toBeInTheDocument();
  });

  it("opens an enlarged holographic map viewer from the shelf card", () => {
    render(<ShelfMap product={product} />);

    fireEvent.click(screen.getByRole("region", { name: "Shelf navigation map" }));

    const dialog = screen.getByRole("dialog", { name: "Enlarged shelf navigation map" });
    expect(dialog).toHaveClass("shelf-map-viewer-backdrop");
    expect(within(dialog).getByText("Enlarged pharmacy route")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("img", {
        name: "Route from Entrance to Aisle 03, Shelf A-03",
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Entrance.*Aisle 03.*Shelf A-03/)).toBeInTheDocument();
  });

  it("keeps inside clicks open but closes the enlarged map from outside click and Escape", () => {
    render(<ShelfMap product={product} />);
    const mapCard = screen.getByRole("region", { name: "Shelf navigation map" });

    fireEvent.click(mapCard);
    const dialog = screen.getByRole("dialog", { name: "Enlarged shelf navigation map" });
    const stage = within(dialog).getByLabelText("Expanded pharmacy route stage");

    fireEvent.mouseDown(stage);
    expect(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Enlarged shelf navigation map" })).not.toBeInTheDocument();

    fireEvent.click(mapCard);
    fireEvent.mouseDown(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" }));
    expect(screen.queryByRole("dialog", { name: "Enlarged shelf navigation map" })).not.toBeInTheDocument();
  });

  it("supports keyboard opening for the shelf map card", () => {
    render(<ShelfMap product={product} />);

    fireEvent.keyDown(screen.getByRole("region", { name: "Shelf navigation map" }), {
      key: "Enter",
    });

    expect(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" })).toBeInTheDocument();
  });
});
