import type { Poster, Promotion } from "../types";


interface PromotionPosterProps {
  promotion: Promotion | null;
  poster: Poster | null;
}

function PromotionPoster({ promotion, poster }: PromotionPosterProps) {
  const title = promotion?.title ?? poster?.title ?? "No active promotion";
  const validity = promotion
    ? `${new Date(promotion.valid_from).toLocaleDateString("en-SG")} — ${new Date(
        promotion.valid_to,
      ).toLocaleDateString("en-SG")}`
    : null;

  return (
    <section className="panel promotion-panel" aria-label="Promotion">
      <div className="poster-frame">
        <div className="poster-grid" aria-hidden="true" />
        <div className="poster-topline">
          <span>VitaFlow active offer</span>
          <strong>{promotion?.active ? "LIVE" : "IDLE"}</strong>
        </div>
        <div className="poster-product-orb" aria-hidden="true">
          <span>VK</span>
        </div>
        <div className="poster-copy">
          <span className="eyebrow">Branch-aware promotion</span>
          <h2>{title}</h2>
          <p>
            {promotion
              ? `Active for ${promotion.branch_id}`
              : "No active branch promotion is available."}
          </p>
        </div>
        <dl className="poster-meta">
          <div>
            <dt>Branch</dt>
            <dd>{promotion?.branch_id ?? poster?.branch_id ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt>Validity</dt>
            <dd>{validity ?? "No active period"}</dd>
          </div>
        </dl>
        <small>Fictional mock promotion · No medical claim</small>
      </div>
    </section>
  );
}

export default PromotionPoster;
