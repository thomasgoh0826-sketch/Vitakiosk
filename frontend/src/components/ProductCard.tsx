import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { formatCurrencyRm } from "../formatters";
import { translations, type KioskLanguage, type KioskTranslations } from "../i18n";
import type { LocalizedProductText, Product, ProductSummary } from "../types";
import ProductImage from "./ProductImage";

interface ProductCardProps {
  product: Product | null;
  purchasingQueryId: string | null;
  labels?: KioskTranslations;
  language?: KioskLanguage;
  hasActivePromotion?: boolean;
  openDetailsToken?: number;
  openSummaryToken?: number;
}

type ProductViewMode = "details" | "summary";
type ProductSummaryKey = keyof ProductSummary;

const SINGLE_TAP_DELAY_MS = 220;
const DOUBLE_TAP_WINDOW_MS = 280;

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

function localizedText(
  field: Partial<LocalizedProductText> | undefined,
  language: KioskLanguage,
  unavailable: string,
) {
  const value = field?.[language] ?? field?.en;
  return typeof value === "string" && value.trim() ? value : unavailable;
}

function ProductCard({
  product,
  purchasingQueryId,
  labels = translations.en,
  language = "en",
  hasActivePromotion = false,
  openDetailsToken = 0,
  openSummaryToken = 0,
}: ProductCardProps) {
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [enlargedView, setEnlargedView] = useState<ProductViewMode | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchTapAt = useRef(0);
  const suppressNextClick = useRef(false);
  const productViewerStageRef = useRef<HTMLElement | null>(null);
  const outsideViewerPointerStartedRef = useRef(false);

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

  useEffect(() => {
    if (!product || openDetailsToken <= 0) {
      return;
    }

    clearPendingToggle();
    setEnlargedView("details");
  }, [openDetailsToken, product]);

  useEffect(() => {
    if (!product || openSummaryToken <= 0) {
      return;
    }

    clearPendingToggle();
    setIsSummaryVisible(true);
    setEnlargedView("summary");
  }, [openSummaryToken, product]);

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

  useEffect(() => {
    if (!enlargedView || typeof document === "undefined") {
      return undefined;
    }

    document.body.classList.add("product-expanded");
    document.documentElement.classList.add("product-expanded");

    return () => {
      document.body.classList.remove("product-expanded");
      document.documentElement.classList.remove("product-expanded");
    };
  }, [enlargedView]);

  const summaryRows = product
    ? SUMMARY_FIELDS.map(({ key, labelKey }) => ({
        key,
        label: String(labels[labelKey]),
        value: localizedText(product.productSummary?.[key], language, labels.unavailable),
      }))
    : [];
  const sourceLabel = product
    ? product.source === "vitaflow_erp"
      ? labels.vitaFlowErp
      : labels.mockVitaFlow
    : null;

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

  const toggleEnlargedView = () => {
    setEnlargedView((current) => {
      if (!current) {
        return current;
      }
      return current === "details" ? "summary" : "details";
    });
  };

  const isInsideProductViewerStage = (target: EventTarget | null) => {
    const stage = productViewerStageRef.current;
    return Boolean(stage && target instanceof Node && stage.contains(target));
  };

  const trackViewerOutsidePointerStart = (event: PointerEvent<HTMLDivElement>) => {
    outsideViewerPointerStartedRef.current = !isInsideProductViewerStage(event.target);
    if (outsideViewerPointerStartedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const trackViewerOutsideMouseStart = (event: MouseEvent<HTMLDivElement>) => {
    outsideViewerPointerStartedRef.current = !isInsideProductViewerStage(event.target);
    if (outsideViewerPointerStartedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const closeViewerFromOutsideClick = (event: MouseEvent<HTMLDivElement>) => {
    const startedOutside = outsideViewerPointerStartedRef.current;
    outsideViewerPointerStartedRef.current = false;
    if (!startedOutside || isInsideProductViewerStage(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setEnlargedView(null);
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
      <div><dt>{labels.source}</dt><dd>{sourceLabel}</dd></div>
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
          onPointerDown={trackViewerOutsidePointerStart}
          onMouseDown={trackViewerOutsideMouseStart}
          onClick={closeViewerFromOutsideClick}
          role="dialog"
        >
          <article
            ref={productViewerStageRef}
            className="product-viewer-stage"
            data-product-morph="holographic"
            data-product-view={enlargedView}
            data-testid="product-viewer-stage"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              toggleEnlargedView();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }
              event.preventDefault();
              toggleEnlargedView();
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {enlargedView === "details" ? (
              <div className="product-viewer-detail">
                <ProductImage product={product} className="product-viewer-art" variant="viewer" />
                <div className="product-viewer-copy">
                  <span className="eyebrow">{labels.productVerified}</span>
                  <h2>{product.name}</h2>
                  <p>{product.id}</p>
                  {hasActivePromotion ? (
                    <span className="product-promotion-badge">{labels.promotion}</span>
                  ) : null}
                  <strong>
                    {formatCurrencyRm(product.price, labels.unavailable)}
                  </strong>
                  <small>{labels.currentProductPrice}</small>
                  {renderProductFacts("product-viewer-facts")}
                </div>
              </div>
            ) : (
              <div className="product-viewer-summary">
                <div className="product-viewer-summary-heading">
                  <ProductImage product={product} className="product-viewer-summary-art" variant="viewer" />
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
          {sourceLabel ? <span className="source-label">{sourceLabel}</span> : null}
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
                  <ProductImage product={product} className="product-art" variant="panel" />
                  <div className="product-identity">
                    <span className="eyebrow">{labels.productVerified}</span>
                    <h3>{product.name}</h3>
                    <p>{product.id}</p>
                    <strong>{formatCurrencyRm(product.price, labels.unavailable)}</strong>
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
