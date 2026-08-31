import { translations, type KioskTranslations } from "../i18n";
import type { Leaflet, Product } from "../types";

export type PromotionPanelMode =
  | "idle"
  | "product_promotion"
  | "product_campaign"
  | "promotion_gallery"
  | "campaign_gallery"
  | "product_options";

interface PromotionPosterProps {
  mode: PromotionPanelMode;
  leaflets: Leaflet[];
  selectedLeafletId: string | null;
  product?: Product | null;
  safetyOverride: boolean;
  labels?: KioskTranslations;
  onOpenLeaflet: (leaflet: Leaflet) => void;
  onShowPromotions: () => void;
  onShowCampaigns: () => void;
}

function isProductLinked(leaflet: Leaflet, product: Product | null | undefined) {
  return Boolean(product && leaflet.product_ids.includes(product.id));
}

function productLinkedLeaflets(
  leaflets: Leaflet[],
  product: Product | null | undefined,
) {
  return product
    ? leaflets.filter((leaflet) => leaflet.product_ids.includes(product.id))
    : [];
}

function campaignFallbackLeaflets(
  campaignLeaflets: Leaflet[],
  product: Product | null | undefined,
) {
  if (!product) {
    return campaignLeaflets;
  }

  const linkedCampaigns = productLinkedLeaflets(campaignLeaflets, product);
  return uniqueLeaflets([
    ...linkedCampaigns,
    ...campaignLeaflets.filter((leaflet) => leaflet.product_ids.length === 0),
  ]);
}

function branchWideLeaflets(leaflets: Leaflet[]) {
  return leaflets.filter((leaflet) => leaflet.product_ids.length === 0);
}

function uniqueLeaflets(leaflets: Array<Leaflet | null | undefined>) {
  const seen = new Set<string>();
  return leaflets.filter((leaflet): leaflet is Leaflet => {
    if (!leaflet || seen.has(leaflet.id)) {
      return false;
    }

    seen.add(leaflet.id);
    return true;
  });
}

function orderedDisplayLeaflets({
  mode,
  promotionLeaflets,
  campaignLeaflets,
  productPromotionLeaflets,
  productCampaignLeaflets,
  selectedLeafletFromAction,
  product,
}: {
  mode: PromotionPanelMode;
  promotionLeaflets: Leaflet[];
  campaignLeaflets: Leaflet[];
  productPromotionLeaflets: Leaflet[];
  productCampaignLeaflets: Leaflet[];
  selectedLeafletFromAction: Leaflet | null;
  product?: Product | null;
}) {
  if (mode === "promotion_gallery") {
    return promotionLeaflets;
  }

  if (mode === "campaign_gallery") {
    return campaignLeaflets;
  }

  if (mode === "product_campaign") {
    return uniqueLeaflets([
      selectedLeafletFromAction,
      ...productCampaignLeaflets,
      ...campaignFallbackLeaflets(campaignLeaflets, product),
    ]);
  }

  if (productPromotionLeaflets.length > 0) {
    return uniqueLeaflets([
      selectedLeafletFromAction,
      ...productPromotionLeaflets,
      ...productCampaignLeaflets,
      ...branchWideLeaflets(promotionLeaflets),
      ...campaignFallbackLeaflets(campaignLeaflets, product),
    ]);
  }

  return uniqueLeaflets([
    selectedLeafletFromAction,
    ...productCampaignLeaflets,
    ...campaignFallbackLeaflets(campaignLeaflets, product),
  ]);
}

function PromotionPoster({
  mode,
  leaflets,
  selectedLeafletId,
  product,
  safetyOverride,
  labels = translations.en,
  onOpenLeaflet,
  onShowPromotions,
  onShowCampaigns,
}: PromotionPosterProps) {
  const promotionLeaflets = leaflets.filter((leaflet) => leaflet.kind === "promotion");
  const campaignLeaflets = leaflets.filter((leaflet) => leaflet.kind === "campaign");
  const productPromotionLeaflets = productLinkedLeaflets(promotionLeaflets, product);
  const productCampaignLeaflets = productLinkedLeaflets(campaignLeaflets, product);
  const selectedLeafletFromAction =
    leaflets.find((leaflet) => leaflet.id === selectedLeafletId) ?? null;
  const displayLeaflets = orderedDisplayLeaflets({
    mode,
    promotionLeaflets,
    campaignLeaflets,
    productPromotionLeaflets,
    productCampaignLeaflets,
    selectedLeafletFromAction,
    product,
  });

  if (safetyOverride) {
    return (
      <section className="panel promotion-panel" aria-label={labels.promotion}>
        <div className="poster-frame leaflet-safety-override">
          <span className="eyebrow">{labels.clinicalSafety}</span>
          <h2>{labels.pharmacistRequested}</h2>
          <p>
            Promotion and campaign browsing is paused while pharmacist assistance is
            requested.
          </p>
        </div>
      </section>
    );
  }

  if (mode === "product_options") {
    return (
      <section className="panel promotion-panel" aria-label={labels.promotion}>
        {displayLeaflets.length ? (
          <LeafletDisplayGrid
            leaflets={displayLeaflets}
            onOpenLeaflet={onOpenLeaflet}
          />
        ) : (
          <div className="poster-frame leaflet-empty-frame">
            <span className="eyebrow">Branch-aware display</span>
            <h2>No active leaflet</h2>
            <p>No active branch-valid promotion or campaign leaflet is available.</p>
          </div>
        )}
        <div className="leaflet-choice-buttons leaflet-choice-buttons-inline" aria-label="Browse active leaflet categories">
          <button type="button" onClick={onShowPromotions}>
            {labels.promotion}
          </button>
          <button type="button" onClick={onShowCampaigns}>
            {labels.campaign}
          </button>
        </div>
      </section>
    );
  }

  if (mode === "promotion_gallery" || mode === "campaign_gallery") {
    const galleryLeaflets = mode === "promotion_gallery" ? promotionLeaflets : campaignLeaflets;
    return (
      <section className="panel promotion-panel" aria-label={labels.promotion}>
        {galleryLeaflets.length ? (
          <LeafletDisplayGrid
            leaflets={galleryLeaflets}
            onOpenLeaflet={onOpenLeaflet}
          />
        ) : (
          <div className="poster-frame leaflet-empty-frame">
            <span className="eyebrow">Branch-aware display</span>
            <h2>No active leaflet</h2>
            <p>No active branch-valid leaflets are available.</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="panel promotion-panel" aria-label={labels.promotion}>
      {displayLeaflets.length ? (
        <LeafletDisplayGrid
          leaflets={displayLeaflets}
          onOpenLeaflet={onOpenLeaflet}
        />
      ) : (
        <div className="poster-frame leaflet-empty-frame">
          <span className="eyebrow">Branch-aware display</span>
          <h2>No active leaflet</h2>
          <p>No active branch-valid promotion or campaign leaflet is available.</p>
        </div>
      )}
    </section>
  );
}

function LeafletDisplayGrid({
  leaflets,
  onOpenLeaflet,
}: {
  leaflets: Leaflet[];
  onOpenLeaflet: (leaflet: Leaflet) => void;
}) {
  const displayLeaflets = leaflets.slice(0, 3);

  if (!displayLeaflets.length) {
    return null;
  }

  return (
    <div
      className="leaflet-display-grid"
      aria-label="Active leaflet display"
      data-leaflet-count={leaflets.length}
      data-visible-leaflets="responsive"
    >
      {displayLeaflets.map((leaflet) => (
        <LeafletPoster
          key={leaflet.id}
          leaflet={leaflet}
          onOpen={() => onOpenLeaflet(leaflet)}
        />
      ))}
    </div>
  );
}

function LeafletPoster({
  leaflet,
  onOpen,
}: {
  leaflet: Leaflet;
  onOpen: () => void;
}) {
  return (
    <button
      className={`poster-frame leaflet-poster leaflet-${leaflet.kind}`}
      type="button"
      onClick={onOpen}
      aria-label={`Open ${leaflet.title} leaflet`}
      data-leaflet-kind={leaflet.kind}
    >
      <div className="poster-grid" aria-hidden="true" />
      <div className="leaflet-image-stage">
        <img src={leaflet.image_url} alt="" />
      </div>
    </button>
  );
}

export default PromotionPoster;
