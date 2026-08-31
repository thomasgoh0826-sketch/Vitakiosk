import { type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { translations, type KioskTranslations } from "../i18n";
import type { BranchShelfMap, Product, ShelfMapRegion } from "../types";
import {
  MAP_VIEWBOX,
  buildOrthogonalRoute,
  centerOfRegion,
  displayRegionLabel,
  regionRect,
  routeToSvgPath,
} from "./shelfMapGeometry";

const AISLE_NUMBER_PATTERN = /\d+/;
const REPEATED_LOCATION_PREFIX_PATTERN = /^(shelf|counter|aisle|level|zone|room)\s+\1\b\s*/i;
const FALLBACK_ROUTE_PATH = "M70 228 L170 228 L170 176 L430 176 L430 82 L500 82";

interface ShelfMapProps {
  product: Product | null;
  branchMap?: BranchShelfMap | null;
  mapUnavailableReason?: string | null;
  labels?: KioskTranslations;
  openMapToken?: number;
}

interface ShelfRouteData {
  shelf: string | null;
  aisleNumber: string | null;
  aisle: string | null;
  areaZone: string | null;
  binPosition: string | null;
  locationCode: string | null;
  locationNote: string | null;
  pinX: number | null;
  pinY: number | null;
  rowLevel: string | null;
  regionName: string | null;
  shelfRackBay: string | null;
  targetRegion: ShelfMapRegion | null;
  routePath: string | null;
  hasRoute: boolean;
  hasMap: boolean;
  hasPin: boolean;
  exactPinMissing: boolean;
  allowMockFallback: boolean;
}

function clampPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Math.min(Math.max(value, 0), 100);
}

function withDisplayLabel(label: string, value: string | null | undefined) {
  const normalizedLabel = label.trim().toLocaleLowerCase();
  if (!value?.trim()) {
    return label;
  }
  const normalizedValue = value.trim().toLocaleLowerCase();
  return normalizedValue === normalizedLabel || normalizedValue.startsWith(`${normalizedLabel} `)
    ? value
    : `${label} ${value}`;
}

function targetLocationDisplay(route: ShelfRouteData, label: string) {
  const value = route.shelfRackBay ?? route.shelf ?? "item";
  const targetKind = `${route.targetRegion?.type ?? ""} ${route.targetRegion?.layer_kind ?? ""}`
    .trim()
    .toLocaleLowerCase();
  return targetKind.includes("counter") ? value : withDisplayLabel(label, value);
}

function uniqueRouteSteps(...steps: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return steps.flatMap((step) => {
    const value = step?.trim().replace(REPEATED_LOCATION_PREFIX_PATTERN, "$1 ").trim();
    if (!value) {
      return [];
    }
    const normalized = value.toLocaleLowerCase();
    if (seen.has(normalized)) {
      return [];
    }
    seen.add(normalized);
    return [value];
  });
}

function findTargetRegion(
  branchMap: BranchShelfMap | null | undefined,
  regionName: string | null,
  shelf: string | null,
) {
  if (!branchMap || (!regionName && !shelf)) {
    return null;
  }
  const normalizedRegion = regionName?.trim().toLowerCase();
  const normalizedShelf = shelf?.trim().toLowerCase();
  return branchMap.regions.find((region) => {
    const regionText = `${region.id} ${region.name} ${region.label ?? ""}`.toLowerCase();
    return Boolean(
      (normalizedRegion && regionText.includes(normalizedRegion))
      || (normalizedShelf && regionText.includes(normalizedShelf)),
    );
  }) ?? null;
}

function buildGeneratedRoute(
  branchMap: BranchShelfMap | null | undefined,
  targetRegion: ShelfMapRegion | null,
  pinX: number | null,
  pinY: number | null,
) {
  if (!branchMap) {
    return null;
  }
  const entrance = branchMap.entrance;
  const regionCenter = centerOfRegion(targetRegion);
  const targetX = pinX ?? regionCenter?.x ?? null;
  const targetY = pinY ?? regionCenter?.y ?? null;
  if (!entrance || targetX === null || targetY === null) {
    return null;
  }
  const obstacles = branchMap.regions
    .filter((region) => region.id !== targetRegion?.id)
    .filter((region) => {
      const kind = `${region.type} ${region.layer_kind ?? ""}`.toLocaleLowerCase();
      return !kind.includes("aisle") && !kind.includes("entrance") && !kind.includes("walkable");
    })
    .map(regionRect);
  const route = buildOrthogonalRoute(
    { x: entrance.x, y: entrance.y },
    { x: targetX, y: targetY },
    obstacles,
  );
  return route ? routeToSvgPath(route) : null;
}

function getShelfRouteData(
  product: Product | null,
  branchMap: BranchShelfMap | null | undefined,
): ShelfRouteData {
  const shelf = product?.shelf_location?.trim() || null;
  const location = product?.location ?? null;
  const aisleNumber = shelf?.match(AISLE_NUMBER_PATTERN)?.[0]?.padStart(2, "0") ?? null;
  const regionName = location?.regionName?.trim() || null;
  const aisle = regionName ?? (aisleNumber ? `Aisle ${aisleNumber}` : null);
  const shelfRackBay = location?.shelfRackBay?.trim() || shelf;
  const rowLevel = location?.rowLevel?.trim() || (shelf ? "02" : null);
  const pinX = clampPercent(location?.pinX);
  const pinY = clampPercent(location?.pinY);
  const targetRegion = findTargetRegion(branchMap, regionName, shelfRackBay);
  const routePath = buildGeneratedRoute(branchMap, targetRegion, pinX, pinY);
  const hasMap = Boolean(branchMap);
  const hasPin = pinX !== null && pinY !== null;
  const allowMockFallback = product?.source === "mock_vitaflow" && !hasMap;

  return {
    shelf,
    aisleNumber,
    aisle,
    areaZone: location?.areaZone?.trim() || null,
    binPosition: location?.binPosition?.trim() || null,
    locationCode: location?.locationCode?.trim() || shelf,
    locationNote: location?.locationNote?.trim() || null,
    pinX,
    pinY,
    rowLevel,
    regionName,
    shelfRackBay,
    targetRegion,
    routePath,
    hasRoute: Boolean((routePath && hasMap) || (allowMockFallback && shelf && aisle)),
    hasMap,
    hasPin,
    exactPinMissing: Boolean(hasMap && (targetRegion || regionName) && !hasPin),
    allowMockFallback,
  };
}

function ShelfMapVisual({
  branchMap,
  hasProduct,
  mapUnavailableReason,
  route,
  labels,
  density,
}: {
  branchMap?: BranchShelfMap | null;
  hasProduct: boolean;
  mapUnavailableReason?: string | null;
  route: ShelfRouteData;
  labels: KioskTranslations;
  density: "compact" | "expanded";
}) {
  const {
    shelf,
    aisleNumber,
    aisle,
    areaZone,
    binPosition,
    locationCode,
    pinX,
    pinY,
    rowLevel,
    shelfRackBay,
    hasRoute,
    allowMockFallback,
  } = route;
  const renderErpMap = Boolean(branchMap);
  const routePath = route.routePath ?? (allowMockFallback ? FALLBACK_ROUTE_PATH : "");
  const entranceLabel = branchMap?.entrance?.label ?? "Entrance";
  const targetLabel = shelfRackBay ?? shelf ?? "item";
  const targetDisplayLabel = targetLocationDisplay(route, labels.shelf);
  const targetAriaLabel = aisle?.trim().toLocaleLowerCase() === targetLabel.trim().toLocaleLowerCase()
    ? `Target location ${targetLabel}`
    : `Target location ${targetLabel}${aisle ? ` in ${aisle}` : ""}`;
  const routeSteps = uniqueRouteSteps(
    entranceLabel,
    aisle ?? route.targetRegion?.name ?? "Region",
    locationCode ?? targetDisplayLabel,
  );
  const referenceImageIsNeutralShell = Boolean(
    branchMap?.image_url
      && (
        branchMap.image_url.includes("inventory-location-neutral-shell")
        || branchMap.image_url.includes("Neutral%20reference%20shell")
      ),
  );
  const visibleMapRegions = branchMap?.regions ?? [];
  const routeLabel = route.hasMap
    ? `Route to item from ${entranceLabel} to ${aisle ?? targetLabel}`
    : `Route from Entrance to ${aisle}, ${withDisplayLabel("Shelf", shelf)}`;

  return (
    <>
      <div
        className={`shelf-map-canvas${hasRoute ? "" : " map-unavailable"}${renderErpMap ? " shelf-map-canvas-erp" : ""}`}
        data-testid="pharmacy-map-canvas"
        data-map-density={density}
      >
        <div
          className={`map-plan-surface${referenceImageIsNeutralShell ? " map-plan-surface-neutral" : ""}`}
          data-testid="pharmacy-map-surface"
          data-map-ratio="5:3"
          data-map-density={density}
        >
          <div className="map-grid" aria-hidden="true" />
          {branchMap?.image_url && !referenceImageIsNeutralShell ? (
            <img className="map-reference-image" src={branchMap.image_url} alt="" aria-hidden="true" />
          ) : null}

          {renderErpMap ? (
            <>
              {!branchMap?.image_url || referenceImageIsNeutralShell ? (
                <div className="map-fixture map-wall-top" aria-hidden="true">
                  {branchMap?.name ?? "PHARMACY"}
                </div>
              ) : null}
              {visibleMapRegions.map((region) => {
                const isEntranceRegion = Boolean(
                  branchMap?.entrance?.label
                  && region.name.trim().toLocaleLowerCase()
                    === branchMap.entrance.label.trim().toLocaleLowerCase()
                );
                const isTargetRegion = route.targetRegion?.id === region.id;
                const regionKind = region.type
                  .toLocaleLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "");
                const shape = region.shape === "pill" || region.shape === "square"
                  ? region.shape
                  : "rounded";
                const regionStyle = {
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                  transform: `translate(-50%, -50%) rotate(${region.rotation ?? 0}deg)`,
                  zIndex: (region.z_index ?? 0) + 10,
                  "--region-color": region.color ?? "#6d8092",
                } as CSSProperties;
                return (
                  <div
                    key={region.id}
                    className={`map-fixture map-erp-region map-region-${regionKind} map-shape-${shape}${isEntranceRegion ? " map-region-entrance" : ""}${isTargetRegion ? " map-region-target" : ""}`}
                    style={regionStyle}
                    role="group"
                    aria-label={`${region.name}, ${region.type.toLocaleLowerCase()}`}
                    title={`${region.name} (${region.type})`}
                  >
                    {density === "expanded"
                      && !isEntranceRegion
                      && !isTargetRegion
                      && region.type.trim().toLocaleLowerCase() !== region.name.trim().toLocaleLowerCase()
                      ? <span>{region.type.toUpperCase()}</span>
                      : null}
                    {isEntranceRegion || isTargetRegion
                      ? null
                      : <strong>{displayRegionLabel(region)}</strong>}
                  </div>
                );
              })}
            </>
          ) : allowMockFallback ? (
            <>
              <div className="map-fixture map-wall-top" aria-hidden="true">
                PHARMACY
              </div>
              <div className="map-fixture map-aisle map-aisle-01" aria-hidden="true">
                <span>AISLE</span>01
              </div>
              <div className="map-fixture map-aisle map-aisle-02" aria-hidden="true">
                <span>AISLE</span>02
              </div>
              <div className="map-fixture map-aisle map-aisle-03" aria-hidden="true">
                <span>AISLE</span>03
              </div>
              <div className="map-fixture map-counter" aria-hidden="true">
                PHARMACIST
              </div>
            </>
          ) : null}

          {hasRoute ? (
            <svg
              className="map-route-line"
              viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={routeLabel}
            >
              <path className="route-glow" d={routePath} />
              <path
                className="route-core"
                data-testid="pharmacy-route-path"
                d={routePath}
              />
            </svg>
          ) : null}

          {branchMap?.entrance || allowMockFallback ? (
            <div
              className="map-marker map-you-are-here"
              aria-label={`${labels.youAreHere} at ${entranceLabel}`}
              style={branchMap?.entrance ? {
                left: `${branchMap.entrance.x}%`,
                top: `${branchMap.entrance.y}%`,
              } : undefined}
            >
              <i aria-hidden="true" />
              <span>{labels.youAreHere}</span>
              <small>{entranceLabel}</small>
            </div>
          ) : null}

          {hasRoute && (route.hasPin || allowMockFallback) ? (
            <div
              className="map-marker map-target"
              aria-label={targetAriaLabel}
              style={route.hasPin && pinX !== null && pinY !== null ? {
                left: `${pinX}%`,
                top: `${pinY}%`,
              } : undefined}
            >
              <i aria-hidden="true" />
              <span>{labels.target}</span>
              <small>{targetDisplayLabel}</small>
            </div>
          ) : null}
        </div>
      </div>

      {hasRoute ? (
        <>
          <dl className="map-location-data" aria-label="Target shelf details">
            <div>
              <dt>{labels.aisle}</dt>
              <dd>{aisleNumber ?? areaZone ?? "--"}</dd>
            </div>
            <div>
              <dt>{labels.shelf}</dt>
              <dd>{targetLabel}</dd>
            </div>
            <div>
              <dt>{labels.level}</dt>
              <dd>{rowLevel ?? binPosition ?? "--"}</dd>
            </div>
          </dl>
          <p className="map-route-summary">
            <span>{route.hasMap ? "Suggested route" : labels.route}</span>
            {routeSteps.join(" → ")}
          </p>
          {route.exactPinMissing ? (
            <p className="map-route-summary map-route-missing" role="status">
              Exact pin not set. Showing ERP region highlight.
            </p>
          ) : null}
        </>
      ) : (
        <p className="map-route-summary map-route-missing" role="status">
          {branchMap && !hasProduct
            ? "Ask for a product to show its shelf route."
            : mapUnavailableReason ?? "Shelf location unavailable from VitaFlow."}
        </p>
      )}
    </>
  );
}

function ShelfMapViewer({
  branchMap,
  hasProduct,
  mapUnavailableReason,
  route,
  labels,
  onClose,
}: {
  branchMap?: BranchShelfMap | null;
  hasProduct: boolean;
  mapUnavailableReason?: string | null;
  route: ShelfRouteData;
  labels: KioskTranslations;
  onClose: () => void;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const outsidePointerStartedRef = useRef(false);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const isInsideViewerContent = (target: EventTarget | null) => {
    const content = contentRef.current;
    return Boolean(content && target instanceof Node && content.contains(target));
  };

  const trackOutsidePointerStart = (event: PointerEvent<HTMLDivElement>) => {
    outsidePointerStartedRef.current = !isInsideViewerContent(event.target);
    if (outsidePointerStartedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const trackOutsideMouseStart = (event: MouseEvent<HTMLDivElement>) => {
    outsidePointerStartedRef.current = !isInsideViewerContent(event.target);
    if (outsidePointerStartedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const closeFromOutsideClick = (event: MouseEvent<HTMLDivElement>) => {
    const startedOutside = outsidePointerStartedRef.current;
    outsidePointerStartedRef.current = false;
    if (!startedOutside || isInsideViewerContent(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  const modal = (
    <div
      className="shelf-map-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged shelf navigation map"
      onPointerDown={trackOutsidePointerStart}
      onMouseDown={trackOutsideMouseStart}
      onClick={closeFromOutsideClick}
    >
      <article
        className="shelf-map-viewer-stage"
        aria-label="Expanded pharmacy route stage"
        onPointerDown={trackOutsidePointerStart}
        onMouseDown={trackOutsideMouseStart}
        onClick={closeFromOutsideClick}
      >
        <div
          ref={contentRef}
          className="shelf-map-viewer-content"
          aria-label="Expanded pharmacy route content"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="shelf-map-viewer-heading">
            <span className="map-kicker">Enlarged pharmacy route</span>
            <span className="map-route-status">
              {route.hasRoute ? "Route to item" : labels.unavailable}
            </span>
          </div>
          <div className="shelf-map-viewer-map">
            <ShelfMapVisual
              branchMap={branchMap}
              hasProduct={hasProduct}
              mapUnavailableReason={mapUnavailableReason}
              route={route}
              labels={labels}
              density="expanded"
            />
          </div>
          {route.hasRoute ? (
            <div className="shelf-map-viewer-callouts" aria-hidden="true">
              <span>{branchMap?.entrance?.label ?? "Entrance"}</span>
              <span>{route.aisle ?? route.targetRegion?.name}</span>
              <span>{targetLocationDisplay(route, labels.shelf)}</span>
              <span>Level {route.rowLevel ?? "--"}</span>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );

  return createPortal(modal, document.body);
}

function ShelfMap({
  product,
  branchMap,
  mapUnavailableReason,
  labels = translations.en,
  openMapToken = 0,
}: ShelfMapProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const route = getShelfRouteData(product, branchMap);
  const productId = product?.id ?? null;

  useEffect(() => {
    setIsViewerOpen(false);
  }, [productId]);

  useEffect(() => {
    if (!product || openMapToken <= 0) {
      return;
    }

    setIsViewerOpen(true);
  }, [openMapToken]);

  const openViewer = () => {
    setIsViewerOpen(true);
  };

  const openViewerFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openViewer();
    }
  };

  return (
    <>
      <section
        className="panel shelf-map-panel shelf-map-panel-interactive"
        aria-label={labels.shelfNavigationMap}
        data-map-viewer={isViewerOpen ? "open" : "closed"}
        tabIndex={0}
        onClick={openViewer}
        onKeyDown={openViewerFromKeyboard}
      >
        <div className="panel-title-row shelf-map-heading">
          <div>
            <span className="map-kicker">{labels.indoorPharmacyMap}</span>
            <h2>{labels.shelfNavigation}</h2>
          </div>
          <span className="map-route-status">
            {route.hasRoute
              ? (route.hasMap ? "Route to item" : labels.shortestRoute)
              : branchMap && !product
                ? "Map loaded"
                : labels.unavailable}
          </span>
        </div>

        <ShelfMapVisual
          branchMap={branchMap}
          hasProduct={Boolean(product)}
          mapUnavailableReason={mapUnavailableReason}
          route={route}
          labels={labels}
          density="compact"
        />
      </section>

      {isViewerOpen ? (
        <ShelfMapViewer
          branchMap={branchMap}
          hasProduct={Boolean(product)}
          mapUnavailableReason={mapUnavailableReason}
          route={route}
          labels={labels}
          onClose={() => setIsViewerOpen(false)}
        />
      ) : null}
    </>
  );
}

export default ShelfMap;
