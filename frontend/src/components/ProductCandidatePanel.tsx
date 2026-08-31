import type { KioskTranslations } from "../i18n";
import { translations } from "../i18n";
import { formatCurrencyRm } from "../formatters";
import type { ProductSearchCandidate } from "../types";
import ProductImage from "./ProductImage";

interface ProductCandidatePanelProps {
  candidates: ProductSearchCandidate[];
  labels?: KioskTranslations;
  onSelect: (candidate: ProductSearchCandidate) => void;
}

function formatPrice(value: number | null, labels: KioskTranslations) {
  return formatCurrencyRm(value, labels.unavailable);
}

function sourceLabel(source: string, labels: KioskTranslations) {
  return source === "mock_vitaflow" ? labels.mockVitaFlow : source;
}

function matchLabel(candidate: ProductSearchCandidate, index: number, labels: KioskTranslations) {
  if (candidate.match_reason === "barcode_match") {
    return labels.barcodeMatch;
  }
  if (candidate.match_reason === "product_image_similarity") {
    return labels.bestVisualMatch;
  }
  if (candidate.match_reason === "ocr_text_match") {
    return labels.labelTextMatch;
  }
  if (candidate.match_reason.startsWith("near_")) {
    return labels.similarName;
  }
  return index === 0 ? labels.bestMatch : `Match ${index + 1}`;
}

function ProductCandidatePanel({
  candidates,
  labels = translations.en,
  onSelect,
}: ProductCandidatePanelProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <section
      className="panel product-candidate-panel"
      aria-label={labels.doYouMeanThisItem}
    >
      <div className="candidate-panel-heading">
        <span className="eyebrow">VitaFlow match</span>
        <h2>{labels.doYouMeanThisItem}</h2>
      </div>
      <div className="candidate-card-grid">
        {candidates.slice(0, 5).map((candidate, index) => {
          const { product } = candidate;
          return (
            <button
              type="button"
              className="candidate-card"
              key={`${product.id}-${candidate.matched_text}`}
              aria-label={`${labels.selectProductCandidate}: ${product.name}`}
              onClick={() => onSelect(candidate)}
            >
              <span className="candidate-rank">
                {matchLabel(candidate, index, labels)}
              </span>
              <ProductImage product={product} className="candidate-product-image" variant="candidate" />
              <strong>{product.name}</strong>
              <span>{product.id}</span>
              <dl>
                <div><dt>{labels.currentProductPrice}</dt><dd>{formatPrice(product.price, labels)}</dd></div>
                <div><dt>{labels.stock}</dt><dd>{product.stock ?? labels.unavailable}</dd></div>
                <div><dt>{labels.shelf}</dt><dd>{product.shelf_location ?? labels.unavailable}</dd></div>
                <div><dt>{labels.branch}</dt><dd>{product.branch_id}</dd></div>
                <div><dt>{labels.source}</dt><dd>{sourceLabel(product.source, labels)}</dd></div>
              </dl>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ProductCandidatePanel;
