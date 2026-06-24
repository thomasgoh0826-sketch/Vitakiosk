import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Leaflet, Product } from "../types";
import PromotionPoster from "./PromotionPoster";

const productWithPromotion: Product = {
  id: "MOCK-P001",
  name: "Relief Balm",
  branch_id: "SG-001",
  price: 12.5,
  stock: 18,
  shelf_location: "A-03",
  source: "mock_vitaflow",
  unavailable_reason: null,
};

const productWithoutPromotion: Product = {
  id: "MOCK-P002",
  name: "Hydration Salts",
  branch_id: "SG-001",
  price: 8.9,
  stock: 24,
  shelf_location: "B-07",
  source: "mock_vitaflow",
  unavailable_reason: null,
};

const leaflets: Leaflet[] = [
  {
    id: "MOCK-LF-PROMO-001",
    kind: "promotion",
    title: "Relief Balm Demo Leaflet",
    description: "Active branch promotion for Relief Balm.",
    branch_id: "SG-001",
    active: true,
    valid_from: "2025-01-01T00:00:00Z",
    valid_to: "2030-12-31T23:59:00Z",
    image_url: "/assets/leaflets/mock-relief-balm-promo.svg",
    product_ids: ["MOCK-P001"],
    category_tags: ["pain-relief"],
    display_priority: 10,
    source: "mock_vitaflow",
  },
  {
    id: "MOCK-LF-PROMO-002",
    kind: "promotion",
    title: "Supplement Savings Demo",
    description: "General active promotion leaflet.",
    branch_id: "SG-001",
    active: true,
    valid_from: "2025-01-01T00:00:00Z",
    valid_to: "2030-12-31T23:59:00Z",
    image_url: "/assets/leaflets/mock-supplement-promo.svg",
    product_ids: [],
    category_tags: ["supplement"],
    display_priority: 20,
    source: "mock_vitaflow",
  },
  {
    id: "MOCK-LF-CAMP-001",
    kind: "campaign",
    title: "Hydration Health Campaign",
    description: "Mock branch health campaign.",
    branch_id: "SG-001",
    active: true,
    valid_from: "2025-01-01T00:00:00Z",
    valid_to: "2030-12-31T23:59:00Z",
    image_url: "/assets/leaflets/mock-hydration-campaign.svg",
    product_ids: ["MOCK-P002"],
    category_tags: ["hydration"],
    display_priority: 30,
    source: "mock_vitaflow",
  },
];

function renderPromotionPoster(
  options: Partial<Parameters<typeof PromotionPoster>[0]> = {},
) {
  const onOpenLeaflet = vi.fn();
  render(
    <PromotionPoster
      mode="idle"
      leaflets={leaflets}
      selectedLeafletId={null}
      product={productWithPromotion}
      safetyOverride={false}
      onOpenLeaflet={onOpenLeaflet}
      onShowPromotions={vi.fn()}
      onShowCampaigns={vi.fn()}
      {...options}
    />,
  );

  return { onOpenLeaflet };
}

describe("PromotionPoster leaflet display", () => {
  function leafletButtons() {
    return screen.getAllByRole("button", { name: /open .* leaflet/i });
  }

  it("opens the enlarged viewer from the leaflet card itself without a separate Enlarge button", () => {
    const { onOpenLeaflet } = renderPromotionPoster();

    expect(screen.queryByRole("button", { name: /enlarge leaflet/i })).not.toBeInTheDocument();

    const leafletButton = screen.getByRole("button", {
      name: /open Relief Balm Demo Leaflet/i,
    });
    expect(leafletButton).toHaveClass("leaflet-poster");

    fireEvent.click(leafletButton);

    expect(onOpenLeaflet).toHaveBeenCalledWith(leaflets[0]);
  });

  it("shows exactly one clean hero leaflet in the collapsed promotion panel", () => {
    renderPromotionPoster();

    const buttons = leafletButtons();
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(/open Relief Balm Demo Leaflet/i);

    const panel = screen.getByRole("region", { name: "Promotion" });
    expect(panel).not.toHaveTextContent("Relief Balm Demo Leaflet");
    expect(panel).not.toHaveTextContent("Active branch promotion for Relief Balm.");
    expect(panel).not.toHaveTextContent("Mock VitaFlow");
    expect(panel).not.toHaveTextContent("Branch");
    expect(panel).not.toHaveTextContent("Valid");
  });

  it("defaults product-without-promotion mode to a single related campaign hero leaflet", () => {
    const { onOpenLeaflet } = renderPromotionPoster({
      mode: "product_options",
      product: productWithoutPromotion,
    });

    const panel = screen.getByRole("region", { name: "Promotion" });
    const buttons = within(panel).getAllByRole("button", { name: /open .* leaflet/i });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(/open Hydration Health Campaign/i);

    fireEvent.click(within(panel).getByRole("button", {
      name: /open Hydration Health Campaign/i,
    }));

    expect(onOpenLeaflet).toHaveBeenCalledWith(leaflets[2]);
  });

  it("shows one campaign hero first for product-not-found or no-product states", () => {
    renderPromotionPoster({
      mode: "idle",
      product: null,
    });

    const panel = screen.getByRole("region", { name: "Promotion" });
    const buttons = within(panel).getAllByRole("button", { name: /open .* leaflet/i });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(/open Hydration Health Campaign/i);
  });

  it("renders gallery mode as one main hero leaflet instead of split stacked cards", () => {
    const { onOpenLeaflet } = renderPromotionPoster({
      mode: "campaign_gallery",
      product: null,
    });

    const campaignButton = screen.getByRole("button", {
      name: /open Hydration Health Campaign/i,
    });
    expect(campaignButton).toHaveClass("leaflet-poster");
    expect(screen.queryByLabelText(/campaign gallery/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /open .* leaflet/i })).toHaveLength(1);
    expect(within(campaignButton).queryByRole("button")).not.toBeInTheDocument();

    fireEvent.click(campaignButton);
    expect(onOpenLeaflet).toHaveBeenCalledWith(leaflets[2]);
  });
});
