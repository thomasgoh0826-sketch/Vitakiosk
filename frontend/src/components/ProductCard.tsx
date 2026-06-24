import { translations, type KioskTranslations } from "../i18n";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product | null;
  purchasingQueryId: string | null;
  labels?: KioskTranslations;
}

function displayValue(
  value: string | number | null,
  labels: KioskTranslations,
  reason?: string | null,
) {
  return value ?? `${labels.unavailable} from VitaFlow${reason ? ` · ${reason}` : ""}`;
}

function ProductCard({
  product,
  purchasingQueryId,
  labels = translations.en,
}: ProductCardProps) {
  return (
    <section className="panel product-panel" aria-label={labels.product}>
      <div className="panel-title-row">
        <h2>{labels.product}</h2>
        <span className="source-label">{labels.mockVitaFlow}</span>
      </div>
      {product ? (
        <>
          <div className="product-hero">
            <div className="product-art" aria-hidden="true">
              <span>{product.name.slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="product-identity">
              <span className="eyebrow">{labels.productVerified}</span>
              <h3>{product.name}</h3>
              <p>{product.id}</p>
              <strong>{product.price === null ? labels.unavailable : `$${product.price.toFixed(2)}`}</strong>
              <small>{labels.currentProductPrice}</small>
            </div>
          </div>
          <dl className="product-facts">
            <div><dt>{labels.stock}</dt><dd>{displayValue(product.stock, labels, product.unavailable_reason)}</dd></div>
            <div><dt>{labels.branch}</dt><dd>{product.branch_id}</dd></div>
            <div><dt>{labels.shelf}</dt><dd>{displayValue(product.shelf_location, labels, product.unavailable_reason)}</dd></div>
            <div><dt>{labels.source}</dt><dd>{labels.mockVitaFlow}</dd></div>
          </dl>
        </>
      ) : (
        <div className="empty-product" role="status">
          <span className="empty-product-orbit" aria-hidden="true" />
          <h3>{purchasingQueryId ? labels.productNotFound : labels.readyForProductSearch}</h3>
          <p>
            {purchasingQueryId
              ? `Purchasing query ${purchasingQueryId} created. ${labels.noProductGuess}`
              : labels.askForProduct}
          </p>
        </div>
      )}
    </section>
  );
}

export default ProductCard;
