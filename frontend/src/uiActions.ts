import type { UiAction } from "./types";


const APPROVED_ACTION_TYPES = new Set<UiAction["type"]>([
  "SHOW_PRODUCT",
  "HIGHLIGHT_PRODUCT",
  "OPEN_PRODUCT_DETAIL",
  "SHOW_PROMOTION_LEAFLET",
  "HIGHLIGHT_PROMOTION",
  "OPEN_PROMOTION_LEAFLET",
  "OPEN_PROMOTION_MODAL",
  "SHOW_CAMPAIGN_LEAFLET",
  "OPEN_CAMPAIGN_LEAFLET",
  "OPEN_CAMPAIGN_MODAL",
  "SHOW_PROMOTION_GALLERY",
  "SHOW_CAMPAIGN_GALLERY",
  "SHOW_LEAFLET_GALLERY",
  "HIGHLIGHT_SHELF_ROUTE",
  "OPEN_SHELF_MAP",
  "ASK_PHARMACIST_CONFIRMATION",
  "REQUEST_PHARMACIST_ASSISTANCE",
  "CLOSE_ACTIVE_OVERLAY",
  "RESET_KIOSK",
]);

export function isApprovedUiAction(action: unknown): action is UiAction {
  if (!action || typeof action !== "object") {
    return false;
  }
  const candidate = action as { type?: unknown };
  return (
    typeof candidate.type === "string"
    && APPROVED_ACTION_TYPES.has(candidate.type as UiAction["type"])
  );
}
