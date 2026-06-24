import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { translations, type KioskLanguage, type KioskTranslations } from "../i18n";
import type { LocalizedProductText, Product, ProductSummary } from "../types";

interface ProductCardProps {
  product: Product | null;
  purchasingQueryId: string | null;
  labels?: KioskTranslations;
  language?: KioskLanguage;
}

type ProductViewMode = "details" | "summary";
type ProductSummaryKey = keyof ProductSummary;

const SINGLE_TAP_DELAY_MS = 220;
const DOUBLE_TAP_WINDOW_MS = 280;

const DEFAULT_PRODUCT_SUMMARY: ProductSummary = {
  ingredient: {
    en: "Menthol, camphor, herbal soothing ingredients",
    zh: "Menthol、camphor、草本舒缓成分",
    ms: "Menthol, camphor, bahan herba yang menenangkan",
  },
  howToUse: {
    en: "Apply externally to the affected area as needed.",
    zh: "外用，适量涂抹在需要舒缓的部位。",
    ms: "Sapu secara luaran pada bahagian yang diperlukan.",
  },
  bestFor: {
    en: "Muscle discomfort, shoulder tension, general soothing use.",
    zh: "肌肉不适、肩颈紧绷、日常舒缓。",
    ms: "Ketidakselesaan otot, ketegangan bahu, kegunaan luaran umum.",
  },
  size: {
    en: "30g",
    zh: "30g",
    ms: "30g",
  },
  description: {
    en: "Cooling relief balm. Easy to apply. For external use only.",
    zh: "清凉舒缓膏，方便外用。只供外用。",
    ms: "Balm rasa sejuk untuk kegunaan luaran. Mudah digunakan.",
  },
};

const SUMMARY_FIELDS: Array<{ key: ProductSummaryKey; labelKey: keyof KioskTranslations }> = [
  { key: "ingredient", labelKey: "ingredient" },
  { key: "howToUse", labelKey: "howToUse" },
  { key: "bestFor", labelKey: "bestFor" },
  { key: "size", labelKey: "size" },
  { key: "description", labelKey: "description" },
];

function displayValue(
  value: string | number | null,
  labels: KioskTranslations,
  reason?: string | null,
) {
  return value ?? `${labels.unavailable} from VitaFlow${reason ? ` · ${reason}` : ""}`;
}

function mergeLocalizedField(
  fallback: LocalizedProductText,
  override?: Partial<LocalizedProductText>,
): LocalizedProductText {
  if (!override) {
    return fallback;
  }

  return {
    en: override?.en ?? fallback.en,
    zh: override.zh,
    ms: override.ms,
  };
}

function getProductSummary(product: Product): ProductSummary {
  return {
    ingredient: mergeLocalizedField(DEFAULT_PRODUCT_SUMMARY.ingredient, product.productSummary?.ingredient),
    howToUse: mergeLocalizedField(DEFAULT_PRODUCT_SUMMARY.howToUse, product.productSummary?.howToUse),
    bestFor: mergeLocalizedField(DEFAULT_PRODUCT_SUMMARY.bestFor, product.productSummary?.bestFor),
    size: mergeLocalizedField(DEFAULT_PRODUCT_SUMMARY.size, product.productSummary?.size),
    description: mergeLocalizedField(DEFAULT_PRODUCT_SUMMARY.description, product.productSummary?.description),
  };
}

function localizedText(field: LocalizedProductText, language: KioskLanguage) {
  return field[language] ?? field.en;
}

function ProductCard({
  product,
  purchasingQueryId,
  labels = translations.en,
  language = "en",
}: ProductCardProps) {
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [enlargedView, setEnlargedView] = useState<ProductViewMode | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchTapAt = useRef(0);
  const suppressNextClick = useRef(false);

  const clearPendingToggle = () => {
    if (singleTapTimer.current) {
      clearTimeout(singleTapTimer.current);
      singleTapTimer.current = null;
    }
  };

  useEffect(() => {
    setIsSummaryVisible(false);
    setEnlargedView(null);
    clearPendingToggle();
  }, [product?.id]);

  useEffect(() => () => clearPendingToggle(), []);

  useEffect(() => {
    if (!enlargedView) {
      return undefined;
    }

    const closeFromEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setEnlargedView(null);
      }
    };

    document.addEventListener("keydown", closeFromEscape);
    return () => document.removeEventListener("keydown", closeFromEscape);
  }, [enlargedView]);

  const summaryRows = product
    ? SUMMARY_FIELDS.map(({ key, labelKey }) => ({
        key,
        label: String(labels[labelKey]),
        value: localizedText(getProductSummary(product)[key], language),
      }))
    : [];

  const toggleSummary = () => {
    if (!product) {
      return;
    }

    setIsSummaryVisible((current) => !current);
  };

  const scheduleSummaryToggle = () => {
    clearPendingToggle();
    singleTapTimer.current = setTimeout(() => {
      toggleSummary();
      singleTapTimer.current = null;
    }, SINGLE_TAP_DELAY_MS);
  };

  const openEnlargedView = (mode: ProductViewMode) => {
    if (!product) {
      return;
    }

    clearPendingToggle();
    setEnlargedView(mode);
  };

  const handlePanelClick = (event: MouseEvent<HTMLElement>) => {
    if (!product) {
      return;
    }

    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }

    if (event.detail > 1) {
      clearPendingToggle();
      return;
    }

    scheduleSummaryToggle();
  };

  const handlePanelDoubleClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    openEnlargedView(isSummaryVisible ? "summary" : "details");
  };

  const handlePanelPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (!product || event.pointerType === "mouse") {
      return;
    }

    const now = performance.now();
    if (now - lastTouchTapAt.current <= DOUBLE_TAP_WINDOW_MS) {
      event.preventDefault();
      clearPendingToggle();
      suppressNextClick.current = true;
      openEnlargedView(isSummaryVisible ? "summary" : "details");
      lastTouchTapAt.current = 0;
      return;
    }

    lastTouchTapAt.current = now;
  };

  const toggleSummaryFromKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (!product || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    clearPendingToggle();
    toggleSummary();
  };

  const renderProductFacts = (className = "product-facts") => (
    <dl className={className}>
      <div><dt>{labels.stock}</dt><dd>{displayValue(product?.stock ?? null, labels, product?.unavailable_reason)}</dd></div>
      <div><dt>{labels.branch}</dt><dd>{product?.branch_id}</dd></div>
      <div><dt>{labels.shelf}</dt><dd>{displayValue(product?.shelf_location ?? null, labels, product?.unavailable_reason)}</dd></div>
      <div><dt>{labels.source}</dt><dd>{labels.mockVitaFlow}</dd></div>
    </dl>
  );

  const renderSummaryGrid = (className = "product-summary-grid") => (
    <dl className={className}>
      {summaryRows.map(({ key, label, value }) => (
        <div
          className={`product-summary-field${
            key === "description" ? " product-summary-field-wide" : ""
          }`}
          key={key}
        >
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );

  const viewer = product && enlargedView && typeof document !== "undefined"
    ? createPortal(
        <div
          aria-label={
            enlargedView === "summary"
              ? labels.enlargedProductSummary
              : labels.enlargedProductDetails
          }
          aria-modal="true"
          className="product-viewer-backdrop"
          data-product-view={enlargedView}
          onMouseDown={() => setEnlargedView(null)}
          role="dialog"
        >
          <article
            className="product-viewer-stage"
            data-product-view={enlargedView}
            data-testid="product-viewer-stage"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {enlargedView === "details" ? (
              <div className="product-viewer-detail">
                <div className="product-viewer-art" aria-hidden="true">
                  <span>{product.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="product-viewer-copy">
                  <span className="eyebrow">{labels.productVerified}</span>
                  <h2>{product.name}</h2>
                  <p>{product.id}</p>
                  <strong>
                    {product.price === null ? labels.unavailable : `$${product.price.toFixed(2)}`}
                  </strong>
                  <small>{labels.currentProductPrice}</small>
                  {renderProductFacts("product-viewer-facts")}
                </div>
              </div>
            ) : (
              <div className="product-viewer-summary">
                <div className="product-viewer-summary-heading">
                  <span className="eyebrow">{labels.productSummary}</span>
                  <h2>{product.name}</h2>
                </div>
                {renderSummaryGrid("product-viewer-summary-grid")}
              </div>
            )}
          </article>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <section
        className="panel product-panel"
        aria-label={labels.product}
        data-product-mode={product ? (isSummaryVisible ? "summary" : "details") : "empty"}
        tabIndex={product ? 0 : undefined}
        onClick={handlePanelClick}
        onDoubleClick={handlePanelDoubleClick}
        onKeyDown={toggleSummaryFromKeyboard}
        onPointerUp={handlePanelPointerUp}
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
                    <span className="eyebrow">{labels.productSummary}</span>
                    <h3>{product.name}</h3>
                  </div>
                </div>
                {renderSummaryGrid()}
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
                {renderProductFacts()}
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
      {viewer}
    </>
  );
}

export default ProductCard;
