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

function kindLabel(kind: Leaflet["kind"]) {
  return kind === "promotion" ? "Promotion" : "Campaign";
}

function PromotionPoster({
  mode,
  leaflets,
  selectedLeafletId,
  product,
  safetyOverride,
  onOpenLeaflet,
  onShowPromotions,
  onShowCampaigns,
}: PromotionPosterProps) {
  const promotionLeaflets = leaflets.filter((leaflet) => leaflet.kind === "promotion");
  const campaignLeaflets = leaflets.filter((leaflet) => leaflet.kind === "campaign");
  const selectedLeaflet =
    leaflets.find((leaflet) => leaflet.id === selectedLeafletId)
    ?? (mode === "product_campaign"
      ? campaignLeaflets.find((leaflet) => isProductLinked(leaflet, product))
      : promotionLeaflets.find((leaflet) => isProductLinked(leaflet, product)))
    ?? promotionLeaflets[0]
    ?? campaignLeaflets[0]
    ?? null;

  if (safetyOverride) {
    return (
      <section className="panel promotion-panel" aria-label="Promotion">
        <div className="poster-frame leaflet-safety-override">
          <span className="eyebrow">Safety priority</span>
          <h2>Pharmacist handoff active</h2>
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
      <section className="panel promotion-panel" aria-label="Promotion">
        <div className="poster-frame leaflet-choice-frame">
          <span className="eyebrow">No product-specific promotion</span>
          <h2>{product?.name ?? "Selected product"}</h2>
          <p>
            This product does not have a specific promotion now. You can browse
            other active branch promotions or health campaigns.
          </p>
          <div className="leaflet-choice-buttons">
            <button type="button" onClick={onShowPromotions}>
              Promotion
            </button>
            <button type="button" onClick={onShowCampaigns}>
              Campaign
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (mode === "promotion_gallery" || mode === "campaign_gallery") {
    const galleryLeaflets = mode === "promotion_gallery" ? promotionLeaflets : campaignLeaflets;
    const title = mode === "promotion_gallery" ? "Promotion gallery" : "Campaign gallery";
    return (
      <section className="panel promotion-panel" aria-label="Promotion">
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
                  onOpen={() => onOpenLeaflet(leaflet)}
                />
              ))}
            </div>
          ) : (
            <p>No active branch-valid {kindLabel(mode === "promotion_gallery" ? "promotion" : "campaign").toLowerCase()} leaflets are available.</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="panel promotion-panel" aria-label="Promotion">
      {selectedLeaflet ? (
        <LeafletPoster leaflet={selectedLeaflet} onOpen={() => onOpenLeaflet(selectedLeaflet)} />
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

function LeafletPoster({
  leaflet,
  onOpen,
}: {
  leaflet: Leaflet;
  onOpen: () => void;
}) {
  return (
    <article className={`poster-frame leaflet-poster leaflet-${leaflet.kind}`}>
      <div className="poster-grid" aria-hidden="true" />
      <div className="poster-topline">
        <span>{kindLabel(leaflet.kind)} leaflet</span>
        <strong>LIVE</strong>
      </div>
      <div className="leaflet-image-stage">
        <img src={leaflet.image_url} alt="" />
      </div>
      <div className="poster-copy">
        <span className="eyebrow">Mock VitaFlow sourced</span>
        <h2>{leaflet.title}</h2>
        <p>{leaflet.description}</p>
      </div>
      <dl className="poster-meta">
        <div>
          <dt>Branch</dt>
          <dd>{leaflet.branch_id}</dd>
        </div>
        <div>
          <dt>Valid</dt>
          <dd>{formatDate(leaflet.valid_from)} - {formatDate(leaflet.valid_to)}</dd>
        </div>
      </dl>
      <button className="leaflet-open-button" type="button" onClick={onOpen}>
        Enlarge leaflet
      </button>
    </article>
  );
}

function LeafletCard({
  leaflet,
  onOpen,
}: {
  leaflet: Leaflet;
  onOpen: () => void;
}) {
  return (
    <article className="leaflet-card">
      <img src={leaflet.image_url} alt="" />
      <span>{kindLabel(leaflet.kind)}</span>
      <h3>{leaflet.title}</h3>
      <p>{leaflet.description}</p>
      <button type="button" onClick={onOpen}>
        View leaflet
      </button>
    </article>
  );
}

export default PromotionPoster;
