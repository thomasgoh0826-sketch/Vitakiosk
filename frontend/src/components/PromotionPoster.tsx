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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isProductLinked(leaflet: Leaflet, product: Product | null | undefined) {
  return Boolean(product && leaflet.product_ids.includes(product.id));
}

function kindLabel(kind: Leaflet["kind"], labels: KioskTranslations) {
  return kind === "promotion" ? labels.promotion : labels.campaign;
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
            labels={labels}
            onOpenLeaflet={onOpenLeaflet}
            contextCopyForFirst="Default active campaign"
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
    const title = mode === "promotion_gallery" ? `${labels.promotion} gallery` : `${labels.campaign} gallery`;
    return (
      <section className="panel promotion-panel" aria-label={labels.promotion}>
        <div className="poster-frame leaflet-gallery-frame">
          <div className="poster-topline">
            <span>Active for SG-001</span>
            <strong>{galleryLeaflets.length ? "LIVE" : "EMPTY"}</strong>
          </div>
          <h2>{title}</h2>
          {galleryLeaflets.length ? (
            <div className="leaflet-carousel" aria-label={title}>
              {galleryLeaflets.map((leaflet) => (
                <LeafletCard
                  key={leaflet.id}
                  leaflet={leaflet}
                  labels={labels}
                  onOpen={() => onOpenLeaflet(leaflet)}
                />
              ))}
            </div>
          ) : (
            <p>No active branch-valid {kindLabel(mode === "promotion_gallery" ? "promotion" : "campaign", labels).toLowerCase()} leaflets are available.</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="panel promotion-panel" aria-label={labels.promotion}>
      {displayLeaflets.length ? (
        <LeafletDisplayGrid
          leaflets={displayLeaflets}
          labels={labels}
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
  labels,
  onOpenLeaflet,
  contextCopyForFirst,
}: {
  leaflets: Leaflet[];
  labels: KioskTranslations;
  onOpenLeaflet: (leaflet: Leaflet) => void;
  contextCopyForFirst?: string;
}) {
  return (
    <div
      className="leaflet-display-grid"
      aria-label="Active promotion and campaign leaflets"
      data-leaflet-count={Math.min(leaflets.length, 4)}
      data-single-leaflet={String(leaflets.length === 1)}
    >
      {leaflets.map((leaflet, index) => (
        <LeafletPoster
          key={leaflet.id}
          leaflet={leaflet}
          labels={labels}
          onOpen={() => onOpenLeaflet(leaflet)}
          contextCopy={index === 0 ? contextCopyForFirst : undefined}
          priority={index + 1}
        />
      ))}
    </div>
  );
}

function LeafletPoster({
  leaflet,
  labels,
  onOpen,
  contextCopy,
  priority,
}: {
  leaflet: Leaflet;
  labels: KioskTranslations;
  onOpen: () => void;
  contextCopy?: string;
  priority?: number;
}) {
  return (
    <button
      className={`poster-frame leaflet-poster leaflet-${leaflet.kind}`}
      type="button"
      onClick={onOpen}
      aria-label={`Open ${leaflet.title} leaflet`}
      data-leaflet-priority={priority}
    >
      <div className="poster-grid" aria-hidden="true" />
      <div className="poster-topline">
        <span>{contextCopy ?? (leaflet.kind === "promotion" ? labels.promotionLeaflet : `${labels.campaign} Leaflet`)}</span>
        <strong>LIVE</strong>
      </div>
      <div className="leaflet-image-stage">
        <img src={leaflet.image_url} alt="" />
      </div>
      <div className="poster-copy">
        <span className="eyebrow">{labels.mockVitaFlow} sourced</span>
        <h2>{leaflet.title}</h2>
        <p>{leaflet.description}</p>
      </div>
      <dl className="poster-meta">
        <div>
          <dt>{labels.branch}</dt>
          <dd>{leaflet.branch_id}</dd>
        </div>
        <div>
          <dt>Valid</dt>
          <dd>{formatDate(leaflet.valid_from)} - {formatDate(leaflet.valid_to)}</dd>
        </div>
      </dl>
    </button>
  );
}

function LeafletCard({
  leaflet,
  labels,
  onOpen,
}: {
  leaflet: Leaflet;
  labels: KioskTranslations;
  onOpen: () => void;
}) {
  return (
    <button
      className="leaflet-card"
      type="button"
      onClick={onOpen}
      aria-label={`Open ${leaflet.title} leaflet`}
    >
      <img src={leaflet.image_url} alt="" />
      <span>{kindLabel(leaflet.kind, labels)}</span>
      <h3>{leaflet.title}</h3>
      <p>{leaflet.description}</p>
    </button>
  );
}

export default PromotionPoster;
