import { type KeyboardEvent, type MouseEvent, useEffect, useState } from "react";

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

const PRODUCT_SUMMARY = [
  ["Ingredient", "Menthol, camphor, herbal soothing ingredients"],
  ["Use", "External relief balm for minor discomfort"],
  ["Best for", "Muscle discomfort, shoulder tension, general soothing use"],
  ["Size", "30g"],
  ["Description", "Cooling relief balm. Easy to apply. Suitable for quick external use."],
] as const;

function ProductCard({
  product,
  purchasingQueryId,
  labels = translations.en,
}: ProductCardProps) {
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);

  useEffect(() => {
    setIsSummaryVisible(false);
  }, [product?.id]);

  const toggleSummary = () => {
    if (!product) {
      return;
    }

    setIsSummaryVisible((current) => !current);
  };

  const toggleSummaryFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (!product || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    toggleSummary();
  };

  const returnToDetails = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsSummaryVisible(false);
  };

  return (
    <section
      className="panel product-panel"
      aria-label={labels.product}
      data-product-mode={product ? (isSummaryVisible ? "summary" : "details") : "empty"}
      tabIndex={product ? 0 : undefined}
      onClick={toggleSummary}
      onKeyDown={toggleSummaryFromKeyboard}
    >
      <div className="panel-title-row">
        <h2>{labels.product}</h2>
        <span className="source-label">{labels.mockVitaFlow}</span>
      </div>
      {product ? (
        <div className="product-transform-shell" aria-live="polite">
          {isSummaryVisible ? (
            <div className="product-summary-view">
              <div className="product-summary-heading">
                <div>
                  <span className="eyebrow">Product summary</span>
                  <h3>{product.name}</h3>
                </div>
                <button
                  className="product-summary-back"
                  type="button"
                  onClick={returnToDetails}
                >
                  Back to product details
                </button>
              </div>
              <dl className="product-summary-grid">
                {PRODUCT_SUMMARY.map(([label, value]) => (
                  <div
                    className={`product-summary-field${
                      label === "Description" ? " product-summary-field-wide" : ""
                    }`}
                    key={label}
                  >
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
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
          )}
        </div>
      ) : (
        <div className="product-transform-shell">
          <div className="empty-product" role="status">
            <span className="empty-product-orbit" aria-hidden="true" />
            <h3>{purchasingQueryId ? labels.productNotFound : labels.readyForProductSearch}</h3>
            <p>
              {purchasingQueryId
                ? `Purchasing query ${purchasingQueryId} created. ${labels.noProductGuess}`
                : labels.askForProduct}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProductCard;
