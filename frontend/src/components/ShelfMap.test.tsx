import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BranchShelfMap, Product } from "../types";
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

const erpMap: BranchShelfMap = {
  branch_id: "SG-001",
  map_id: "ERP-MAP-001",
  name: "ERP SG-001 map",
  source: "vitaflow_erp",
  image_url: null,
  entrance: { x: 6, y: 86, label: "Main entrance" },
  regions: [
    {
      id: "region-a03",
      name: "Aisle 03",
      type: "aisle",
      x: 68,
      y: 24,
      width: 16,
      height: 44,
      label: "A03",
      color: "#587ca8",
      shape: "rounded",
      rotation: 4,
      z_index: 7,
      layer_kind: "fixture",
    },
  ],
  unavailable_reason: null,
};

const erpLocatedProduct: Product = {
  ...product,
  source: "vitaflow_erp",
  location: {
    regionName: "Aisle 03",
    areaZone: "Pain relief",
    shelfRackBay: "A-03",
    rowLevel: "02",
    binPosition: "Front bay",
    locationCode: "SG001-A03-L02",
    locationNote: "Near the right-side aisle.",
    pinX: 82,
    pinY: 27,
  },
};

describe("ShelfMap", () => {
  it("shows an ERP map as loaded before a product route is requested", () => {
    render(<ShelfMap product={null} branchMap={erpMap} />);

    expect(screen.getByText("Map loaded")).toBeInTheDocument();
    expect(
      screen.getByText("Ask for a product to show its shelf route."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Shelf location unavailable from VitaFlow.")).not.toBeInTheDocument();
  });

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
      screen.getByLabelText("Target location A-03 in Aisle 03"),
    ).toBeInTheDocument();
    expect(screen.getByText("A-03")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Target shelf details")).getByText("02"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Entrance.*Aisle 03.*A-03/)).toBeInTheDocument();
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

  it("does not draw the local mock route for an ERP product when its map is unavailable", () => {
    render(<ShelfMap product={{ ...erpLocatedProduct, location: undefined }} />);

    expect(screen.getByText("Shelf location unavailable from VitaFlow.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Route from Entrance/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("pharmacy-route-path")).not.toBeInTheDocument();
    expect(screen.queryByText("PHARMACY")).not.toBeInTheDocument();
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
    expect(within(dialog).getByText(/Entrance.*Aisle 03.*A-03/)).toBeInTheDocument();
  });

  it("does not repeat the shelf label in the enlarged ERP route callout", () => {
    render(
      <ShelfMap
        product={{
          ...erpLocatedProduct,
          shelf_location: "Shelf Island C R3 B1",
          location: {
            ...erpLocatedProduct.location!,
            shelfRackBay: "Shelf Island C",
            rowLevel: "R3",
          },
        }}
        branchMap={erpMap}
      />,
    );

    fireEvent.click(screen.getByRole("region", { name: "Shelf navigation map" }));

    const dialog = screen.getByRole("dialog", { name: "Enlarged shelf navigation map" });
    expect(within(dialog).getAllByText("Shelf Island C").length).toBeGreaterThan(0);
    expect(within(dialog).queryByText("Shelf Shelf Island C")).not.toBeInTheDocument();
  });

  it("does not repeat a counter destination in ERP route copy", () => {
    render(
      <ShelfMap
        product={{
          ...erpLocatedProduct,
          shelf_location: "Counter 2",
          location: {
            ...erpLocatedProduct.location!,
            regionName: "Counter 2",
            shelfRackBay: "Counter 2",
            locationCode: "Counter Counter 2",
            rowLevel: "02",
            pinX: 22,
            pinY: 68,
          },
        }}
        branchMap={{
          ...erpMap,
          regions: [
            ...erpMap.regions,
            {
              id: "region-counter-2",
              name: "Counter 2",
              type: "counter",
              x: 22,
              y: 68,
              width: 16,
              height: 12,
              label: "Counter 2",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Main entrance → Counter 2")).toBeInTheDocument();
    expect(screen.queryByText("Main entrance → Counter 2 → Counter 2")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Target location Counter 2")).toBeInTheDocument();
    const compactTargetRegion = screen.getByRole("group", { name: "Counter 2, counter" });
    expect(compactTargetRegion.querySelector("span")).not.toBeInTheDocument();
    expect(compactTargetRegion.querySelector("strong")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("region", { name: "Shelf navigation map" }));
    const dialog = screen.getByRole("dialog", { name: "Enlarged shelf navigation map" });
    expect(within(dialog).queryByText("Shelf Counter 2")).not.toBeInTheDocument();
    const expandedTargetRegion = within(dialog).getByRole("group", {
      name: "Counter 2, counter",
    });
    expect(expandedTargetRegion.querySelector("span")).not.toBeInTheDocument();
    expect(expandedTargetRegion.querySelector("strong")).not.toBeInTheDocument();
  });

  it("keeps inside clicks open but closes the enlarged map from outside click and Escape", () => {
    render(<ShelfMap product={product} />);
    const mapCard = screen.getByRole("region", { name: "Shelf navigation map" });

    fireEvent.click(mapCard);
    const dialog = screen.getByRole("dialog", { name: "Enlarged shelf navigation map" });
    const stage = within(dialog).getByLabelText("Expanded pharmacy route stage");
    const content = within(dialog).getByLabelText("Expanded pharmacy route content");

    fireEvent.pointerDown(content);
    expect(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" })).toBeInTheDocument();
    fireEvent.mouseDown(content);
    expect(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Enlarged shelf navigation map" })).not.toBeInTheDocument();

    fireEvent.click(mapCard);
    fireEvent.pointerDown(within(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" })).getByLabelText("Expanded pharmacy route stage"));
    fireEvent.click(within(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" })).getByLabelText("Expanded pharmacy route stage"));
    expect(screen.queryByRole("dialog", { name: "Enlarged shelf navigation map" })).not.toBeInTheDocument();

    fireEvent.click(mapCard);
    fireEvent.pointerDown(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" }));
    fireEvent.click(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" }));
    expect(screen.queryByRole("dialog", { name: "Enlarged shelf navigation map" })).not.toBeInTheDocument();

    fireEvent.click(mapCard);
    fireEvent.mouseDown(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" }));
    fireEvent.click(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" }));
    expect(screen.queryByRole("dialog", { name: "Enlarged shelf navigation map" })).not.toBeInTheDocument();
  });

  it("closes an AI-opened enlarged map when the backdrop is tapped", () => {
    render(<ShelfMap product={product} openMapToken={1} />);

    const dialog = screen.getByRole("dialog", { name: "Enlarged shelf navigation map" });
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);

    expect(screen.queryByRole("dialog", { name: "Enlarged shelf navigation map" })).not.toBeInTheDocument();
  });

  it("supports keyboard opening for the shelf map card", () => {
    render(<ShelfMap product={product} />);

    fireEvent.keyDown(screen.getByRole("region", { name: "Shelf navigation map" }), {
      key: "Enter",
    });

    expect(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" })).toBeInTheDocument();
  });

  it("closes an enlarged route when the active product is cleared or changed", () => {
    const { rerender } = render(<ShelfMap product={product} openMapToken={1} />);

    expect(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" })).toBeInTheDocument();

    rerender(<ShelfMap product={null} openMapToken={1} />);
    expect(screen.queryByRole("dialog", { name: "Enlarged shelf navigation map" })).not.toBeInTheDocument();

    rerender(<ShelfMap product={product} openMapToken={2} />);
    expect(screen.getByRole("dialog", { name: "Enlarged shelf navigation map" })).toBeInTheDocument();

    rerender(<ShelfMap product={{ ...product, id: "MOCK-OTHER", name: "Other Product", shelf_location: "B-07" }} openMapToken={2} />);
    expect(screen.queryByRole("dialog", { name: "Enlarged shelf navigation map" })).not.toBeInTheDocument();
  });

  it("renders ERP map regions, product pin, and generated suggested route when map data is available", () => {
    render(<ShelfMap product={erpLocatedProduct} branchMap={erpMap} />);

    expect(screen.getByText("ERP SG-001 map")).toBeInTheDocument();
    const targetRegion = screen.getByRole("group", { name: "Aisle 03, aisle" });
    expect(targetRegion).toHaveClass("map-region-target");
    expect(targetRegion).toBeEmptyDOMElement();
    expect(screen.getByText("Shelf A-03")).toBeInTheDocument();
    expect(screen.getByLabelText("You are here at Main entrance")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Target location A-03 in Aisle 03"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Route to item from Main entrance to Aisle 03",
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("pharmacy-route-path")).not.toHaveAttribute(
      "d",
      "M70 228 L170 228 L170 176 L430 176 L430 82 L500 82",
    );
    expect(screen.getByText(/Main entrance.*Aisle 03.*SG001-A03-L02/)).toBeInTheDocument();
    expect(screen.queryByText("Shortest route")).not.toBeInTheDocument();
    expect(screen.getByTestId("pharmacy-map-surface")).toHaveAttribute("data-map-ratio", "5:3");
    expect(screen.getByRole("group", { name: "Aisle 03, aisle" })).toHaveStyle({
      left: "68%",
      top: "24%",
      width: "16%",
      height: "44%",
      transform: "translate(-50%, -50%) rotate(4deg)",
      zIndex: "17",
    });
  });

  it("does not duplicate the ERP map title over a reference image that already contains its own title", () => {
    render(
      <ShelfMap
        product={erpLocatedProduct}
        branchMap={{
          ...erpMap,
          image_url: "data:image/svg+xml;charset=UTF-8,%3Csvg%3E%3C/svg%3E",
        }}
      />,
    );

    expect(screen.getByTestId("pharmacy-map-canvas")).toHaveClass("shelf-map-canvas-erp");
    expect(screen.queryByText("ERP SG-001 map")).not.toBeInTheDocument();
  });

  it("renders every authoritative ERP region over a reference floor image", () => {
    render(
      <ShelfMap
        product={{ ...product, shelf_location: null }}
        branchMap={{
          ...erpMap,
          image_url: "data:image/svg+xml;charset=UTF-8,%3Csvg%3E%3C/svg%3E",
          regions: [
            ...erpMap.regions,
            {
              id: "region-counter",
              name: "Counter 1",
              type: "counter",
              x: 20,
              y: 70,
              width: 20,
              height: 15,
              label: "Counter 1",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("A03")).toBeInTheDocument();
    expect(screen.getByText("Counter 1")).toBeInTheDocument();
  });

  it("renders ERP regions over a neutral reference shell because the shell has no fixtures", () => {
    const { container } = render(
      <ShelfMap
        product={{ ...product, shelf_location: null }}
        branchMap={{
          ...erpMap,
          image_url:
            "data:image/svg+xml;charset=UTF-8,%3Csvg%20id%3D%22inventory-location-neutral-shell%22%3E%3C%2Fsvg%3E",
          regions: [
            ...erpMap.regions,
            {
              id: "region-counter",
              name: "Counter 1",
              type: "Counter",
              x: 20,
              y: 70,
              width: 20,
              height: 15,
              label: "Counter 1",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("A03")).toBeInTheDocument();
    expect(screen.getByText("Counter 1")).toBeInTheDocument();
    expect(screen.getByText("Counter 1").closest(".map-erp-region")).toHaveClass(
      "map-region-counter",
    );
    expect(screen.getByTestId("pharmacy-map-surface")).toHaveClass(
      "map-plan-surface-neutral",
    );
    expect(container.querySelector(".map-reference-image")).not.toBeInTheDocument();
    expect(screen.getByText("ERP SG-001 map")).toBeInTheDocument();
  });

  it("uses one concise region label in the compact map and keeps full type detail in the enlarged map", () => {
    render(
      <ShelfMap
        product={{ ...product, shelf_location: null }}
        branchMap={{
          ...erpMap,
          entrance: { x: 18, y: 89, label: "Main Entrance" },
          regions: [
            {
              id: "region-counselling",
              name: "Counselling Room",
              label: "Counselling Room",
              type: "Counselling Room",
              x: 20,
              y: 40,
              width: 19,
              height: 24,
            },
            {
              id: "region-entrance",
              name: "Main Entrance",
              label: "Main Entrance",
              type: "Aisle",
              x: 18,
              y: 89,
              width: 16,
              height: 4,
            },
          ],
        }}
      />,
    );

    const compactSurface = screen.getByTestId("pharmacy-map-surface");
    expect(compactSurface).toHaveAttribute("data-map-density", "compact");
    const compactRoom = within(screen.getByRole("region", { name: "Shelf navigation map" }))
      .getByRole("group", { name: "Counselling Room, counselling room" });
    expect(compactRoom.querySelector("span")).not.toBeInTheDocument();
    expect(compactRoom.querySelector("strong")).toHaveTextContent("Counselling Room");
    const compactEntrance = (
      within(screen.getByRole("region", { name: "Shelf navigation map" }))
        .getByRole("group", { name: "Main Entrance, aisle" })
    );
    expect(compactEntrance).toHaveClass("map-region-entrance");
    expect(compactEntrance.querySelector("strong")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("region", { name: "Shelf navigation map" }));
    const dialog = screen.getByRole("dialog", { name: "Enlarged shelf navigation map" });
    expect(within(dialog).getByTestId("pharmacy-map-surface")).toHaveAttribute(
      "data-map-density",
      "expanded",
    );
    const expandedEntrance = within(dialog).getByRole("group", {
      name: "Main Entrance, aisle",
    });
    expect(expandedEntrance.querySelector("span")).not.toBeInTheDocument();
    expect(expandedEntrance.querySelector("strong")).not.toBeInTheDocument();
  });

  it("shows ERP map and region highlight when exact product pin is not set", () => {
    render(
      <ShelfMap
        product={{
          ...erpLocatedProduct,
          location: {
            ...erpLocatedProduct.location!,
            pinX: null,
            pinY: null,
          },
        }}
        branchMap={erpMap}
      />,
    );

    expect(screen.getByText("ERP SG-001 map")).toBeInTheDocument();
    expect(screen.getByText("Exact pin not set. Showing ERP region highlight.")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Route to item from Main entrance to Aisle 03",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Target location A-03 in Aisle 03")).not.toBeInTheDocument();
  });

  it("does not draw a route or marker when VitaFlow has no authoritative entrance", () => {
    render(
      <ShelfMap
        product={erpLocatedProduct}
        branchMap={{ ...erpMap, entrance: null }}
      />,
    );

    expect(screen.queryByTestId("pharmacy-route-path")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/You are here/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Target location/)).not.toBeInTheDocument();
    expect(screen.getByText("Shelf location unavailable from VitaFlow.")).toBeInTheDocument();
  });
});
