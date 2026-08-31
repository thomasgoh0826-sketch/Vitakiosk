import { translations, type KioskTranslations } from "../i18n";
import type { Product, RuntimeStatusResponse } from "../types";

interface ErpDataPanelProps {
  product: Product | null;
  connected: boolean;
  branchId: string;
  runtimeStatus: RuntimeStatusResponse | null;
  labels?: KioskTranslations;
}

function ErpDataPanel({
  product,
  connected,
  branchId,
  runtimeStatus,
  labels = translations.en,
}: ErpDataPanelProps) {
  const readOnly = runtimeStatus?.vitaflow_provider === "readonly_api";
  const mock = runtimeStatus?.vitaflow_provider === "mock";
  const sourceLabel = mock ? labels.mockVitaFlow : labels.vitaFlowErp;
  const connectionOnline = readOnly ? runtimeStatus.vitaflow_reachable : connected;

  return (
    <section className="panel erp-panel" aria-label="ERP data">
      <div className="erp-heading">
        <div>
          <span className="eyebrow">{labels.systemProvenance}</span>
          <h2>{labels.vitaFlowErp}</h2>
        </div>
        <span className={`erp-connection${connectionOnline ? " is-connected" : ""}`}>
          {connectionOnline ? "Online" : "Unavailable"}
        </span>
      </div>
      <dl>
        <div><dt>{labels.source}</dt><dd>{sourceLabel}</dd></div>
        <div><dt>{labels.branch}</dt><dd>{product?.branch_id ?? branchId}</dd></div>
        <div><dt>{labels.mode}</dt><dd>{readOnly ? "Read-only" : mock ? labels.mockMode : "Checking"}</dd></div>
        <div><dt>{labels.data}</dt><dd>{readOnly ? "VitaFlow ERP product data" : mock ? labels.fictionalDemoData : labels.unavailable}</dd></div>
      </dl>
      <p>{labels.noCustomerData}</p>
    </section>
  );
}

export default ErpDataPanel;
