import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LeafletModal from "./LeafletModal";
import type { Leaflet } from "../types";

const leaflets: Leaflet[] = [
  {
    id: "LF-001",
    kind: "promotion",
    title: "ProbioGut Demo Offer",
    description: "Active product-linked promotion from mock VitaFlow.",
    branch_id: "SG-001",
    active: true,
    valid_from: "2026-01-01T00:00:00Z",
    valid_to: "2026-12-31T23:59:00Z",
    image_url: "/assets/leaflets/mock-probiogut-promo.svg",
    product_ids: ["MOCK-PROBIOGUT"],
    category_tags: ["gut-health"],
    display_priority: 10,
    source: "mock_vitaflow",
  },
  {
    id: "LF-002",
    kind: "campaign",
    title: "Supplement Wellness Campaign",
    description: "Active branch campaign from mock VitaFlow.",
    branch_id: "SG-001",
    active: true,
    valid_from: "2026-02-01T00:00:00Z",
    valid_to: "2026-10-31T23:59:00Z",
    image_url: "/assets/leaflets/mock-supplement-campaign.svg",
    product_ids: [],
    category_tags: ["supplement"],
    display_priority: 20,
    source: "mock_vitaflow",
  },
  {
    id: "LF-003",
    kind: "promotion",
    title: "Vitamin C Demo Promo",
    description: "Active branch promotion from mock VitaFlow.",
    branch_id: "SG-001",
    active: true,
    valid_from: "2026-03-01T00:00:00Z",
    valid_to: "2026-09-30T23:59:00Z",
    image_url: "/assets/leaflets/mock-vitamin-c-promo.svg",
    product_ids: ["MOCK-VITC-1000"],
    category_tags: ["vitamin"],
    display_priority: 30,
    source: "mock_vitaflow",
  },
];

function renderModal(
  activeLeafletId = "LF-001",
  modalLeaflets: Leaflet[] = leaflets,
) {
  const onClose = vi.fn();
  const onSelect = vi.fn();

  render(
    <LeafletModal
      leaflets={modalLeaflets}
      activeLeafletId={activeLeafletId}
      onClose={onClose}
      onSelect={onSelect}
    />,
  );

  return { onClose, onSelect };
}

describe("LeafletModal holographic gallery", () => {
  it("renders multiple leaflets as a flat horizontal floating deck without a modal header or dark container", () => {
    renderModal("LF-002");

    const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
    const stage = within(dialog).getByLabelText("Floating holographic leaflet card");
    expect(stage).toHaveClass("leaflet-floating-stage");
    expect(dialog).toHaveAttribute("data-animation-state", "opening");
    expect(stage).not.toHaveClass("leaflet-modal");
    expect(within(stage).getByRole("listbox", { name: /floating leaflet swipe surface/i })).toBeInTheDocument();
    expect(within(dialog).getAllByRole("option")).toHaveLength(3);
    expect(within(dialog).getByRole("listbox", { name: /floating leaflet swipe surface/i }))
      .toHaveAttribute("data-deck-pattern", "flat-horizontal");
    expect(dialog.querySelector(".leaflet-flat-deck-track")).toBeInTheDocument();
    expect(dialog.querySelector(".leaflet-depth-track")).toBeNull();
    expect(within(dialog).queryByRole("banner")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("heading")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/holographic leaflet/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Swipe to browse")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /close leaflet preview/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByText("2 / 3")).not.toBeInTheDocument();
    expect(dialog.querySelector(".leaflet-page-indicator")).toBeNull();
    expect(dialog.querySelector(".leaflet-page-dots")).toBeNull();
    expect(dialog.querySelector(".leaflet-light-trail")).toBeNull();
    expect(dialog.querySelector(".leaflet-gallery-shell")).toBeNull();
    expect(dialog.querySelector(".leaflet-gallery-viewport")).toBeNull();
    expect(dialog.querySelector(".leaflet-modal-header")).toBeNull();
    expect(dialog.querySelector(".leaflet-stage-header")).toBeNull();
    expect(dialog.querySelector(".leaflet-card-kind")).toBeNull();
    expect(within(dialog).getByRole("option", { name: /Supplement Wellness Campaign, 2 of 3/i }))
      .toHaveAttribute("aria-current", "true");
  });

  it("keeps previous and next leaflets visible as flat left-right neighbors", () => {
    renderModal("LF-002");

    const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
    const previous = dialog.querySelector('[data-deck-position="previous"]');
    const active = dialog.querySelector('[data-deck-position="active"]');
    const next = dialog.querySelector('[data-deck-position="next"]');

    expect(previous).toBeInTheDocument();
    expect(active).toBeInTheDocument();
    expect(next).toBeInTheDocument();
    expect(previous).toHaveClass("is-neighbor");
    expect(next).toHaveClass("is-neighbor");
    expect(previous).toHaveStyle({
      "--leaflet-deck-opacity": "0.72",
      "--leaflet-deck-scale": "0.780",
      "--leaflet-deck-x": "-393px",
    });
    expect(next).toHaveStyle({
      "--leaflet-deck-opacity": "0.72",
      "--leaflet-deck-scale": "0.780",
      "--leaflet-deck-x": "393px",
    });
    expect(active).toHaveStyle({
      "--leaflet-deck-opacity": "1",
      "--leaflet-deck-scale": "1",
      "--leaflet-deck-x": "0px",
    });
    expect(previous?.getAttribute("style")).not.toContain("rotate");
    expect(next?.getAttribute("style")).not.toContain("rotate");
  });

  it("keeps the existing metadata panel separate from the flat leaflet deck", () => {
    renderModal("LF-002");

    const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
    const metadata = within(dialog).getByRole("complementary", { name: /active leaflet metadata/i });
    const deck = dialog.querySelector(".leaflet-flat-deck-track");

    expect(metadata).toHaveClass("leaflet-meta-panel");
    expect(metadata).toHaveTextContent("Supplement Wellness Campaign");
    expect(metadata).toHaveTextContent("SG-001");
    expect(metadata).toHaveTextContent("Mock VitaFlow");
    expect(deck).not.toContainElement(metadata);
  });

  it("renders a single leaflet centered without fake carousel navigation", () => {
    renderModal("LF-001", [leaflets[0]]);

    const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
    const stageViewer = within(dialog).getByRole("listbox", { name: /floating leaflet swipe surface/i });
    expect(within(stageViewer).getAllByRole("option")).toHaveLength(1);
    expect(stageViewer).toHaveAttribute("data-carousel-mode", "single");
    expect(within(dialog).queryByText("1 / 1")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  it("changes the active leaflet by dragging the whole clean leaflet stage", () => {
    const { onSelect } = renderModal("LF-001");
    const stage = screen.getByLabelText("Floating holographic leaflet card");

    fireEvent.mouseDown(stage, { clientX: 420 });
    fireEvent.mouseMove(stage, { clientX: 240 });
    fireEvent.mouseUp(stage, { clientX: 240 });

    expect(onSelect).toHaveBeenCalledWith("LF-002");
    expect(screen.getByRole("option", { name: /Supplement Wellness Campaign, 2 of 3/i }))
      .toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("complementary", { name: /active leaflet metadata/i }))
      .toHaveTextContent("Supplement Wellness Campaign");
  });

  it("supports keyboard arrows as accessible navigation fallbacks", () => {
    const { onSelect } = renderModal("LF-002");
    const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(onSelect).toHaveBeenLastCalledWith("LF-003");
    expect(screen.getByRole("option", { name: /Vitamin C Demo Promo, 3 of 3/i }))
      .toHaveAttribute("aria-current", "true");

    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(onSelect).toHaveBeenLastCalledWith("LF-002");
  });

  it("closes with a smooth return animation from Escape even when focus is not inside the leaflet stage", () => {
    vi.useFakeTimers();
    const { onClose } = renderModal("LF-001");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("dialog", { name: /leaflet preview/i }))
      .toHaveAttribute("data-animation-state", "closing");
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("supports trackpad horizontal wheel navigation with boundary resistance", () => {
    const { onSelect } = renderModal("LF-001");
    const stage = screen.getByLabelText("Floating holographic leaflet card");

    fireEvent.wheel(stage, { deltaX: 120, deltaY: 0 });
    expect(onSelect).toHaveBeenCalledWith("LF-002");

    fireEvent.wheel(stage, { deltaX: -120, deltaY: 0 });
    expect(onSelect).toHaveBeenLastCalledWith("LF-001");

    fireEvent.wheel(stage, { deltaX: -120, deltaY: 0 });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("keeps reduced-motion mode functional without heavy animation", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { onSelect } = renderModal("LF-001");
    const stageViewer = screen.getByRole("listbox", { name: /floating leaflet swipe surface/i });

    expect(stageViewer).toHaveAttribute("data-reduced-motion", "true");
    fireEvent.keyDown(screen.getByRole("dialog", { name: /leaflet preview/i }), { key: "ArrowRight" });
    expect(onSelect).toHaveBeenCalledWith("LF-002");
  });

  it("closes from outside clicks with collapse animation but keeps inside stage clicks open", () => {
    vi.useFakeTimers();
    const { onClose } = renderModal("LF-001");
    const dialog = screen.getByRole("dialog", { name: /leaflet preview/i });
    const stage = screen.getByLabelText("Floating holographic leaflet card");

    fireEvent.mouseDown(stage, { clientX: 320 });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(dialog, { clientX: 8 });
    expect(dialog).toHaveAttribute("data-animation-state", "closing");
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
