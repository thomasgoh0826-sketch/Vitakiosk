import type { Product } from "../types";


interface ProductCardProps {
  product: Product | null;
  purchasingQueryId: string | null;
}

function displayValue(value: string | number | null, reason?: string | null) {
  return value ?? `Unavailable from VitaFlow${reason ? ` · ${reason}` : ""}`;
}

function ProductCard({ product, purchasingQueryId }: ProductCardProps) {
  return (
    <section className="panel product-panel" aria-label="Product">
      <div className="panel-title-row">
        <h2>Product</h2>
        <span className="source-label">Mock VitaFlow</span>
      </div>
      {product ? (
        <>
          <div className="product-summary">
            <div className="product-art" aria-hidden="true">{product.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <h3>{product.name}</h3>
              <p>{product.id}</p>
              <strong>{product.price === null ? "Unavailable" : `$${product.price.toFixed(2)}`}</strong>
            </div>
          </div>
          <dl className="facts-row">
            <div><dt>Stock</dt><dd>{displayValue(product.stock, product.unavailable_reason)}</dd></div>
            <div><dt>Shelf</dt><dd>{displayValue(product.shelf_location, product.unavailable_reason)}</dd></div>
            <div><dt>Branch</dt><dd>{product.branch_id}</dd></div>
          </dl>
        </>
      ) : (
        <div className="empty-product" role="status">
          <h3>{purchasingQueryId ? "Product not found" : "Ready for product search"}</h3>
          <p>
            {purchasingQueryId
              ? `Purchasing query ${purchasingQueryId} created. No product details were guessed.`
              : "Hold the button and ask for a product."}
          </p>
        </div>
      )}
    </section>
  );
}

export default ProductCard;
