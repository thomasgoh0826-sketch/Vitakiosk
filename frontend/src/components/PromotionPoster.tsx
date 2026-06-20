import type { Poster, Promotion } from "../types";


interface PromotionPosterProps {
  promotion: Promotion | null;
  poster: Poster | null;
}

function PromotionPoster({ promotion, poster }: PromotionPosterProps) {
  return (
    <section className="panel promotion-panel" aria-label="Promotion">
      <div className="panel-title-row">
        <h2>Promotion</h2>
        <span className={promotion?.active ? "active-label" : "source-label"}>
          {promotion?.active ? "Active" : "No match"}
        </span>
      </div>
      <div className="poster-content">
        <strong>{promotion?.title ?? poster?.title ?? "No active promotion"}</strong>
        <span>{promotion ? `Active for ${promotion.branch_id}` : "Branch-aware matching"}</span>
      </div>
      <p>Fictional mock promotion. No medical claim.</p>
    </section>
  );
}

export default PromotionPoster;
