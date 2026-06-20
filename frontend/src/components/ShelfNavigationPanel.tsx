import type { Product } from "../types";


function ShelfNavigationPanel({ product }: { product: Product | null }) {
  return (
    <section className="panel shelf-panel" aria-label="Shelf navigation">
      <div className="panel-title-row">
        <h2>Shelf navigation</h2>
        <span>{product?.shelf_location ? "Shortest route" : "Unavailable"}</span>
      </div>
      <div className="shelf-route" aria-label="Shelf route">
        <span>You are here</span><i aria-hidden="true" /><span>Aisle 01</span>
        <i aria-hidden="true" /><span>Aisle 02</span><i aria-hidden="true" />
        <span className="route-current">{product?.shelf_location ? "Aisle 03" : "No route"}</span>
      </div>
      <p>
        {product?.shelf_location
          ? `Go to Aisle 03, shelf ${product.shelf_location}.`
          : "Shelf location unavailable from VitaFlow."}
      </p>
    </section>
  );
}

export default ShelfNavigationPanel;
