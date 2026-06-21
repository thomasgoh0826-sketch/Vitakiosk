import type { Product } from "../types";


const AISLE_NUMBER_PATTERN = /\d+/;


function ShelfMap({ product }: { product: Product | null }) {
  const shelf = product?.shelf_location?.trim() || null;
  const aisleNumber = shelf?.match(AISLE_NUMBER_PATTERN)?.[0]?.padStart(2, "0") ?? null;
  const aisle = aisleNumber ? `Aisle ${aisleNumber}` : null;
  const hasRoute = Boolean(shelf && aisle);

  return (
    <section className="panel shelf-map-panel" aria-label="Shelf navigation map">
      <div className="panel-title-row shelf-map-heading">
        <div>
          <span className="map-kicker">Indoor pharmacy map</span>
          <h2>Shelf navigation</h2>
        </div>
        <span className="map-route-status">
          {hasRoute ? "Shortest route" : "Unavailable"}
        </span>
      </div>

      <div className={`shelf-map-canvas${hasRoute ? "" : " map-unavailable"}`}>
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
              d="M70 228 L170 228 L170 176 L430 176 L430 82 L500 82"
            />
          </svg>
        ) : null}

        <div className="map-marker map-you-are-here" aria-label="You are here at Entrance">
          <i aria-hidden="true" />
          <span>You are here</span>
          <small>Entrance</small>
        </div>

        {hasRoute ? (
          <div
            className="map-marker map-target"
            aria-label={`Target location Shelf ${shelf} in ${aisle}`}
          >
            <i aria-hidden="true" />
            <span>Target</span>
            <small>Shelf {shelf}</small>
          </div>
        ) : null}
      </div>

      {hasRoute ? (
        <>
          <dl className="map-location-data" aria-label="Target shelf details">
            <div>
              <dt>Aisle</dt>
              <dd>{aisleNumber}</dd>
            </div>
            <div>
              <dt>Shelf</dt>
              <dd>{shelf}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>02</dd>
            </div>
          </dl>
          <p className="map-route-summary">
            <span>Route</span>
            Entrance → {aisle} → Shelf {shelf}
          </p>
        </>
      ) : (
        <p className="map-route-summary map-route-missing" role="status">
          Shelf location unavailable from VitaFlow.
        </p>
      )}
    </section>
  );
}

export default ShelfMap;
