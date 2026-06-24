import { type KeyboardEvent, type MouseEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { translations, type KioskTranslations } from "../i18n";
import type { Product } from "../types";

const AISLE_NUMBER_PATTERN = /\d+/;

interface ShelfMapProps {
  product: Product | null;
  labels?: KioskTranslations;
}

interface ShelfRouteData {
  shelf: string | null;
  aisleNumber: string | null;
  aisle: string | null;
  hasRoute: boolean;
}

function getShelfRouteData(product: Product | null): ShelfRouteData {
  const shelf = product?.shelf_location?.trim() || null;
  const aisleNumber = shelf?.match(AISLE_NUMBER_PATTERN)?.[0]?.padStart(2, "0") ?? null;
  const aisle = aisleNumber ? `Aisle ${aisleNumber}` : null;

  return {
    shelf,
    aisleNumber,
    aisle,
    hasRoute: Boolean(shelf && aisle),
  };
}

function ShelfMapVisual({
  route,
  labels,
}: {
  route: ShelfRouteData;
  labels: KioskTranslations;
}) {
  const { shelf, aisleNumber, aisle, hasRoute } = route;

  return (
    <>
      <div
        className={`shelf-map-canvas${hasRoute ? "" : " map-unavailable"}`}
        data-testid="pharmacy-map-canvas"
      >
        <div className="map-grid" aria-hidden="true" />
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

        {hasRoute ? (
          <svg
            className="map-route-line"
            viewBox="0 0 600 260"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Route from Entrance to ${aisle}, Shelf ${shelf}`}
          >
            <path
              className="route-glow"
              d="M70 228 L170 228 L170 176 L430 176 L430 82 L500 82"
            />
            <path
              className="route-core"
              data-testid="pharmacy-route-path"
              d="M70 228 L170 228 L170 176 L430 176 L430 82 L500 82"
            />
          </svg>
        ) : null}

        <div className="map-marker map-you-are-here" aria-label={`${labels.youAreHere} at Entrance`}>
          <i aria-hidden="true" />
          <span>{labels.youAreHere}</span>
          <small>Entrance</small>
        </div>

        {hasRoute ? (
          <div
            className="map-marker map-target"
            aria-label={`Target location Shelf ${shelf} in ${aisle}`}
          >
            <i aria-hidden="true" />
            <span>{labels.target}</span>
            <small>{labels.shelf} {shelf}</small>
          </div>
        ) : null}
      </div>

      {hasRoute ? (
        <>
          <dl className="map-location-data" aria-label="Target shelf details">
            <div>
              <dt>{labels.aisle}</dt>
              <dd>{aisleNumber}</dd>
            </div>
            <div>
              <dt>{labels.shelf}</dt>
              <dd>{shelf}</dd>
            </div>
            <div>
              <dt>{labels.level}</dt>
              <dd>02</dd>
            </div>
          </dl>
          <p className="map-route-summary">
            <span>{labels.route}</span>
            Entrance → {aisle} → Shelf {shelf}
          </p>
        </>
      ) : (
        <p className="map-route-summary map-route-missing" role="status">
          Shelf location unavailable from VitaFlow.
        </p>
      )}
    </>
  );
}

function ShelfMapViewer({
  route,
  labels,
  onClose,
}: {
  route: ShelfRouteData;
  labels: KioskTranslations;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const modal = (
    <div
      className="shelf-map-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged shelf navigation map"
      onMouseDown={closeFromBackdrop}
    >
      <article
        className="shelf-map-viewer-stage"
        aria-label="Expanded pharmacy route stage"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shelf-map-viewer-heading">
          <span className="map-kicker">Enlarged pharmacy route</span>
          <span className="map-route-status">
            {route.hasRoute ? labels.shortestRoute : labels.unavailable}
          </span>
        </div>
        <div className="shelf-map-viewer-map">
          <ShelfMapVisual route={route} labels={labels} />
        </div>
        {route.hasRoute ? (
          <div className="shelf-map-viewer-callouts" aria-hidden="true">
            <span>Entrance</span>
            <span>{route.aisle}</span>
            <span>Shelf {route.shelf}</span>
            <span>Level 02</span>
          </div>
        ) : null}
      </article>
    </div>
  );

  return createPortal(modal, document.body);
}

function ShelfMap({ product, labels = translations.en }: ShelfMapProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const route = getShelfRouteData(product);

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
            {route.hasRoute ? labels.shortestRoute : labels.unavailable}
          </span>
        </div>

        <ShelfMapVisual route={route} labels={labels} />
      </section>

      {isViewerOpen ? (
        <ShelfMapViewer
          route={route}
          labels={labels}
          onClose={() => setIsViewerOpen(false)}
        />
      ) : null}
    </>
  );
}

export default ShelfMap;
