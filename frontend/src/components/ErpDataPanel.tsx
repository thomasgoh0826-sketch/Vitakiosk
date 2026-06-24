import { translations, type KioskTranslations } from "../i18n";
import type { Product } from "../types";

interface ErpDataPanelProps {
  product: Product | null;
  connected: boolean;
  labels?: KioskTranslations;
}

function ErpDataPanel({
  product,
  connected,
  labels = translations.en,
}: ErpDataPanelProps) {
  return (
    <section className="panel erp-panel" aria-label="ERP data">
      <div className="erp-heading">
        <div>
          <span className="eyebrow">{labels.systemProvenance}</span>
          <h2>{labels.vitaFlowErp}</h2>
        </div>
        <span className={`erp-connection${connected ? " is-connected" : ""}`}>
          {connected ? "Online" : "Local"}
        </span>
      </div>
      <dl>
        <div><dt>{labels.source}</dt><dd>{labels.mockVitaFlow}</dd></div>
        <div><dt>{labels.branch}</dt><dd>{product?.branch_id ?? "SG-001"}</dd></div>
        <div><dt>{labels.mode}</dt><dd>{labels.mockMode}</dd></div>
        <div><dt>{labels.data}</dt><dd>{labels.fictionalDemoData}</dd></div>
      </dl>
      <p>{labels.noCustomerData}</p>
    </section>
  );
}

export default ErpDataPanel;
