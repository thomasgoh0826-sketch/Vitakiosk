import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Product } from "../types";
import ProductCard from "./ProductCard";

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

describe("ProductCard futuristic summary transform", () => {
  it("toggles from source-backed product facts into a concise summary view", () => {
    render(<ProductCard product={product} purchasingQueryId={null} />);

    const panel = screen.getByRole("region", { name: "Product" });
    expect(within(panel).getByText("$12.50")).toBeInTheDocument();
    expect(within(panel).getByText("A-03")).toBeInTheDocument();

    fireEvent.click(panel);

    expect(panel).toHaveAttribute("data-product-mode", "summary");
    expect(within(panel).getByText("Ingredient")).toBeInTheDocument();
    expect(within(panel).getByText("Menthol, camphor, herbal soothing ingredients")).toBeInTheDocument();
    expect(within(panel).getByText("Use")).toBeInTheDocument();
    expect(within(panel).getByText("External relief balm for minor discomfort")).toBeInTheDocument();
    expect(within(panel).getByText("Best for")).toBeInTheDocument();
    expect(within(panel).getByText("Muscle discomfort, shoulder tension, general soothing use")).toBeInTheDocument();
    expect(within(panel).getByText("Size")).toBeInTheDocument();
    expect(within(panel).getByText("30g")).toBeInTheDocument();
    expect(within(panel).getByText("Description")).toBeInTheDocument();
    expect(
      within(panel).getByText("Cooling relief balm. Easy to apply. Suitable for quick external use."),
    ).toBeInTheDocument();
  });

  it("returns from summary mode through the back action without losing VitaFlow facts", () => {
    render(<ProductCard product={product} purchasingQueryId={null} />);

    const panel = screen.getByRole("region", { name: "Product" });
    fireEvent.click(panel);
    fireEvent.click(within(panel).getByRole("button", { name: "Back to product details" }));

    expect(panel).toHaveAttribute("data-product-mode", "details");
    expect(within(panel).getByText("$12.50")).toBeInTheDocument();
    expect(within(panel).getAllByText("Mock VitaFlow").length).toBeGreaterThan(0);
  });

  it("supports keyboard toggling and avoids summary mode when no product is available", () => {
    const { rerender } = render(<ProductCard product={product} purchasingQueryId={null} />);
    const panel = screen.getByRole("region", { name: "Product" });

    fireEvent.keyDown(panel, { key: "Enter" });
    expect(panel).toHaveAttribute("data-product-mode", "summary");

    rerender(<ProductCard product={null} purchasingQueryId={null} />);
    const emptyPanel = screen.getByRole("region", { name: "Product" });
    fireEvent.click(emptyPanel);

    expect(emptyPanel).not.toHaveAttribute("data-product-mode", "summary");
    expect(screen.queryByText("Ingredient")).not.toBeInTheDocument();
  });
});
