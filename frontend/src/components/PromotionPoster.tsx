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

function firstProductLinked(
  leaflets: Leaflet[],
  product: Product | null | undefined,
) {
  return leaflets.find((leaflet) => isProductLinked(leaflet, product)) ?? null;
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
  leaflets,
  promotionLeaflets,
  campaignLeaflets,
  productPromotionLeaflet,
  productCampaignLeaflet,
  selectedLeafletFromAction,
}: {
  mode: PromotionPanelMode;
  leaflets: Leaflet[];
  promotionLeaflets: Leaflet[];
  campaignLeaflets: Leaflet[];
  productPromotionLeaflet: Leaflet | null;
  productCampaignLeaflet: Leaflet | null;
  selectedLeafletFromAction: Leaflet | null;
}) {
  if (mode === "promotion_gallery") {
    return promotionLeaflets;
  }

  if (mode === "campaign_gallery") {
    return campaignLeaflets;
  }

  const hasProductPromotion = Boolean(productPromotionLeaflet);
  const defaultCampaign = productCampaignLeaflet ?? campaignLeaflets[0] ?? null;
  const primaryLeaflets =
    hasProductPromotion
      ? [
          selectedLeafletFromAction,
          mode === "product_campaign" ? productCampaignLeaflet : null,
          productPromotionLeaflet,
          productCampaignLeaflet,
          ...promotionLeaflets,
          ...campaignLeaflets,
        ]
      : [
          selectedLeafletFromAction,
          defaultCampaign,
          ...campaignLeaflets,
          ...promotionLeaflets,
        ];

  return uniqueLeaflets([
    ...primaryLeaflets,
    ...leaflets,
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
  const productPromotionLeaflet = firstProductLinked(promotionLeaflets, product);
  const productCampaignLeaflet = firstProductLinked(campaignLeaflets, product);
  const selectedLeafletFromAction =
    leaflets.find((leaflet) => leaflet.id === selectedLeafletId) ?? null;
  const displayLeaflets = orderedDisplayLeaflets({
    mode,
    leaflets,
    promotionLeaflets,
    campaignLeaflets,
    productPromotionLeaflet,
    productCampaignLeaflet,
    selectedLeafletFromAction,
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
  const primaryLeaflet = leaflets[0] ?? null;

  if (!primaryLeaflet) {
    return null;
  }

  return (
    <div
      className="leaflet-display-grid"
      aria-label="Active leaflet hero"
      data-leaflet-count={leaflets.length}
      data-visible-leaflets="1"
    >
      <LeafletPoster
        leaflet={primaryLeaflet}
        onOpen={() => onOpenLeaflet(primaryLeaflet)}
      />
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
