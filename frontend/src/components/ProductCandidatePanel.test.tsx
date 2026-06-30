import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { translations } from "../i18n";
import type { Product, ProductSearchCandidate } from "../types";
import ProductCandidatePanel from "./ProductCandidatePanel";

const candidate: ProductSearchCandidate = {
  product: {
    id: "MOCK-P001",
    name: "Relief Balm",
    branch_id: "SG-001",
    price: 12.5,
    stock: 18,
    shelf_location: "A-03",
    source: "mock_vitaflow",
    unavailable_reason: null,
    imageUrl: "/assets/mock-products/relief-balm-front.svg",
    thumbnailUrl: "/assets/mock-products/relief-balm-thumb.svg",
    images: [
      {
        url: "/assets/mock-products/relief-balm-front.svg",
        type: "front_pack",
        isPrimary: true,
        alt: "Relief Balm product image",
      },
    ],
  } as Product,
  confidence: 0.93,
  match_reason: "product_image_similarity",
  matched_text: "Relief Bomb",
};

describe("ProductCandidatePanel product images", () => {
  it("shows the backend product image on scan/fuzzy candidate cards", () => {
    render(
      <ProductCandidatePanel
        candidates={[candidate]}
        labels={translations.en}
        onSelect={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: /select item: relief balm/i });
    const image = within(button).getByRole("img", { name: "Relief Balm product image" });

    expect(image).toHaveAttribute("src", "/assets/mock-products/relief-balm-front.svg");
  });

  it("falls back safely if a candidate image fails to load", () => {
    render(
      <ProductCandidatePanel
        candidates={[candidate]}
        labels={translations.en}
        onSelect={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: /select item: relief balm/i });
    fireEvent.error(within(button).getByRole("img", { name: "Relief Balm product image" }));

    expect(within(button).queryByRole("img", { name: "Relief Balm product image" })).not.toBeInTheDocument();
    expect(within(button).getByText("RE")).toBeInTheDocument();
  });
});
