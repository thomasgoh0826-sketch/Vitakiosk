import type { Leaflet } from "../types";


interface LeafletModalProps {
  leaflets: Leaflet[];
  activeLeafletId: string | null;
  onClose: () => void;
  onSelect: (leafletId: string) => void;
}

function LeafletModal({
  leaflets,
  activeLeafletId,
  onClose,
  onSelect,
}: LeafletModalProps) {
  const activeIndex = leaflets.findIndex((leaflet) => leaflet.id === activeLeafletId);
  const activeLeaflet = activeIndex >= 0 ? leaflets[activeIndex] : null;

  if (!activeLeaflet) {
    return null;
  }

  const previousLeaflet = leaflets[(activeIndex - 1 + leaflets.length) % leaflets.length];
  const nextLeaflet = leaflets[(activeIndex + 1) % leaflets.length];
  const hasCarousel = leaflets.length > 1;

  return (
    <div
      className="leaflet-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Leaflet preview"
    >
      <article className="leaflet-modal">
        <button
          className="leaflet-modal-close"
          type="button"
          aria-label="Close leaflet preview"
          onClick={onClose}
        >
          ×
        </button>
        <div className="leaflet-modal-art">
          <img src={activeLeaflet.image_url} alt="" />
        </div>
        <div className="leaflet-modal-copy">
          <span className="eyebrow">
            {activeLeaflet.kind === "promotion" ? "Promotion leaflet" : "Campaign leaflet"}
          </span>
          <h2>{activeLeaflet.title}</h2>
          <p>{activeLeaflet.description}</p>
          <dl>
            <div>
              <dt>Branch</dt>
              <dd>{activeLeaflet.branch_id}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>Mock VitaFlow</dd>
            </div>
          </dl>
        </div>
        {hasCarousel ? (
          <div className="leaflet-modal-controls">
            <button type="button" onClick={() => onSelect(previousLeaflet.id)}>
              Previous
            </button>
            <button type="button" onClick={() => onSelect(nextLeaflet.id)}>
              Next
            </button>
          </div>
        ) : null}
      </article>
    </div>
  );
}

export default LeafletModal;
