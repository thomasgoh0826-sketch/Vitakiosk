import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { translations } from "../i18n";
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

function clickAndSettle(element: HTMLElement) {
  fireEvent.click(element);
  act(() => {
    vi.advanceTimersByTime(260);
  });
}

describe("ProductCard futuristic summary transform", () => {
  it("renders a backend-provided product image before using the fallback initials", () => {
    render(
      <ProductCard
        product={{
          ...product,
          imageUrl: "/assets/products/mock-relief-balm.svg",
          images: ["/assets/products/secondary.svg"],
        }}
        purchasingQueryId={null}
        labels={translations.en}
        language="en"
      />,
    );

    const panel = screen.getByRole("region", { name: "Product" });
    const productImage = within(panel).getByRole("img", {
      name: /Relief Balm product image/i,
    });

    expect(productImage).toHaveAttribute("src", "/assets/products/mock-relief-balm.svg");
    expect(within(panel).queryByText("RE")).not.toBeInTheDocument();
  });

  it("toggles from source-backed product facts into a concise summary view", () => {
    vi.useFakeTimers();
    try {
      render(<ProductCard product={product} purchasingQueryId={null} labels={translations.en} language="en" />);

      const panel = screen.getByRole("region", { name: "Product" });
      expect(within(panel).getByText("$12.50")).toBeInTheDocument();
      expect(within(panel).getByText("A-03")).toBeInTheDocument();

      clickAndSettle(panel);

      expect(panel).toHaveAttribute("data-product-mode", "summary");
      expect(within(panel).getByText("Ingredient")).toBeInTheDocument();
      expect(within(panel).getByText("Menthol, camphor, herbal soothing ingredients")).toBeInTheDocument();
      expect(within(panel).getByText("How to use")).toBeInTheDocument();
      expect(within(panel).queryByText("Use")).not.toBeInTheDocument();
      expect(within(panel).getByText("Apply externally to the affected area as needed.")).toBeInTheDocument();
      expect(within(panel).getByText("Best for")).toBeInTheDocument();
      expect(within(panel).getByText("Muscle discomfort, shoulder tension, general soothing use.")).toBeInTheDocument();
      expect(within(panel).getByText("Size")).toBeInTheDocument();
      expect(within(panel).getByText("30g")).toBeInTheDocument();
      expect(within(panel).getByText("Description")).toBeInTheDocument();
      expect(
        within(panel).getByText("Cooling relief balm. Easy to apply. For external use only."),
      ).toBeInTheDocument();
      expect(within(panel).queryByRole("button", { name: "Back to product details" })).not.toBeInTheDocument();
      expect(screen.queryByText("Back to product details")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns from summary mode by tapping the panel without showing a back button", () => {
    vi.useFakeTimers();
    try {
      render(<ProductCard product={product} purchasingQueryId={null} labels={translations.en} language="en" />);

      const panel = screen.getByRole("region", { name: "Product" });
      clickAndSettle(panel);
      clickAndSettle(panel);

      expect(panel).toHaveAttribute("data-product-mode", "details");
      expect(within(panel).getByText("$12.50")).toBeInTheDocument();
      expect(within(panel).getAllByText("Mock VitaFlow").length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("localizes product summary labels and text while preserving product name and source facts", () => {
    vi.useFakeTimers();
    try {
      render(<ProductCard product={product} purchasingQueryId={null} labels={translations.zh} language="zh" />);

      const panel = screen.getByRole("region", { name: translations.zh.product });
      clickAndSettle(panel);

      expect(within(panel).getByText("Relief Balm")).toBeInTheDocument();
      expect(within(panel).getByText(translations.zh.ingredient)).toBeInTheDocument();
      expect(within(panel).getByText(translations.zh.howToUse)).toBeInTheDocument();
      expect(within(panel).getByText(translations.zh.bestFor)).toBeInTheDocument();
      expect(within(panel).getByText(translations.zh.size)).toBeInTheDocument();
      expect(within(panel).getByText(translations.zh.description)).toBeInTheDocument();
      expect(within(panel).getByText("外用，适量涂抹在需要舒缓的部位。")).toBeInTheDocument();
      expect(within(panel).queryByText("Relief Balm 中文")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses Malay summary text and falls back to English when a localized field is unavailable", () => {
    vi.useFakeTimers();
    try {
      const productWithPartialSummary: Product = {
        ...product,
        productSummary: {
          ingredient: {
            en: "English-only safe ingredient",
          },
        },
      };

      render(
        <ProductCard
          product={productWithPartialSummary}
          purchasingQueryId={null}
          labels={translations.ms}
          language="ms"
        />,
      );

      const panel = screen.getByRole("region", { name: translations.ms.product });
      clickAndSettle(panel);

      expect(within(panel).getByText("Bahan")).toBeInTheDocument();
      expect(within(panel).getByText("Cara guna")).toBeInTheDocument();
      expect(within(panel).getByText("English-only safe ingredient")).toBeInTheDocument();
      expect(within(panel).getByText("Sapu secara luaran pada bahagian yang diperlukan.")).toBeInTheDocument();
      expect(within(panel).getByText("Relief Balm")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("supports keyboard toggling and avoids summary mode when no product is available", () => {
    const { rerender } = render(<ProductCard product={product} purchasingQueryId={null} labels={translations.en} language="en" />);
    const panel = screen.getByRole("region", { name: "Product" });

    fireEvent.keyDown(panel, { key: "Enter" });
    expect(panel).toHaveAttribute("data-product-mode", "summary");

    rerender(<ProductCard product={null} purchasingQueryId={null} />);
    const emptyPanel = screen.getByRole("region", { name: "Product" });
    fireEvent.click(emptyPanel);

    expect(emptyPanel).not.toHaveAttribute("data-product-mode", "summary");
    expect(screen.queryByText("Ingredient")).not.toBeInTheDocument();
  });

  it("opens an enlarged detail view from double-click without toggling summary twice", () => {
    vi.useFakeTimers();
    try {
      render(<ProductCard product={product} purchasingQueryId={null} labels={translations.en} language="en" />);
      const panel = screen.getByRole("region", { name: "Product" });

      fireEvent.doubleClick(panel);

      expect(panel).toHaveAttribute("data-product-mode", "details");
      const dialog = screen.getByRole("dialog", { name: /enlarged product details/i });
      expect(dialog).toHaveAttribute("data-product-view", "details");
      expect(dialog).toHaveTextContent("Relief Balm");
      expect(dialog).toHaveTextContent("$12.50");
      expect(dialog).toHaveTextContent("A-03");
      expect(screen.queryByText("Back to product details")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens an enlarged summary view from double-clicking while summary is visible", () => {
    vi.useFakeTimers();
    try {
      render(<ProductCard product={product} purchasingQueryId={null} labels={translations.en} language="en" />);
      const panel = screen.getByRole("region", { name: "Product" });

      clickAndSettle(panel);
      expect(panel).toHaveAttribute("data-product-mode", "summary");

      fireEvent.doubleClick(panel);

      const dialog = screen.getByRole("dialog", { name: /enlarged product summary/i });
      expect(dialog).toHaveAttribute("data-product-view", "summary");
      expect(dialog).toHaveTextContent("How to use");
      expect(dialog).toHaveTextContent("Cooling relief balm. Easy to apply. For external use only.");
    } finally {
      vi.useRealTimers();
    }
  });

  it("toggles enlarged product details and summary with one inside click using holographic morph state", () => {
    vi.useFakeTimers();
    try {
      render(<ProductCard product={product} purchasingQueryId={null} labels={translations.en} language="en" />);
      const panel = screen.getByRole("region", { name: "Product" });

      fireEvent.doubleClick(panel);

      let dialog = screen.getByRole("dialog", { name: /enlarged product details/i });
      let stage = within(dialog).getByTestId("product-viewer-stage");
      expect(stage).toHaveAttribute("data-product-morph", "holographic");

      fireEvent.click(stage);

      dialog = screen.getByRole("dialog", { name: /enlarged product summary/i });
      stage = within(dialog).getByTestId("product-viewer-stage");
      expect(stage).toHaveAttribute("data-product-view", "summary");
      expect(stage).toHaveTextContent("Ingredient");
      expect(stage).toHaveTextContent("Relief Balm");

      fireEvent.click(stage);

      dialog = screen.getByRole("dialog", { name: /enlarged product details/i });
      stage = within(dialog).getByTestId("product-viewer-stage");
      expect(stage).toHaveAttribute("data-product-view", "details");
      expect(stage).toHaveTextContent("$12.50");
      expect(stage).toHaveTextContent("Mock VitaFlow");
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes the enlarged product view from outside click and Escape", () => {
    render(<ProductCard product={product} purchasingQueryId={null} labels={translations.en} language="en" />);
    const panel = screen.getByRole("region", { name: "Product" });

    fireEvent.doubleClick(panel);
    const dialog = screen.getByRole("dialog", { name: /enlarged product details/i });
    fireEvent.mouseDown(within(dialog).getByTestId("product-viewer-stage"));
    expect(screen.getByRole("dialog", { name: /enlarged product details/i })).toBeInTheDocument();

    fireEvent.mouseDown(dialog);
    expect(screen.queryByRole("dialog", { name: /enlarged product details/i })).not.toBeInTheDocument();

    fireEvent.doubleClick(panel);
    expect(screen.getByRole("dialog", { name: /enlarged product details/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /enlarged product details/i })).not.toBeInTheDocument();
  });

  it("locks page scrolling while the enlarged Product view is open and releases it on close", () => {
    const { unmount } = render(<ProductCard product={product} purchasingQueryId={null} labels={translations.en} language="en" />);
    const panel = screen.getByRole("region", { name: "Product" });

    expect(document.body).not.toHaveClass("product-expanded");
    expect(document.documentElement).not.toHaveClass("product-expanded");

    fireEvent.doubleClick(panel);

    expect(screen.getByRole("dialog", { name: /enlarged product details/i })).toBeInTheDocument();
    expect(document.body).toHaveClass("product-expanded");
    expect(document.documentElement).toHaveClass("product-expanded");

    fireEvent.mouseDown(screen.getByRole("dialog", { name: /enlarged product details/i }));

    expect(document.body).not.toHaveClass("product-expanded");
    expect(document.documentElement).not.toHaveClass("product-expanded");

    fireEvent.doubleClick(panel);
    expect(document.body).toHaveClass("product-expanded");
    unmount();
    expect(document.body).not.toHaveClass("product-expanded");
    expect(document.documentElement).not.toHaveClass("product-expanded");
  });
});
