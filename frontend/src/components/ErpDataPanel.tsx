import type { Product } from "../types";


interface ErpDataPanelProps {
  product: Product | null;
  connected: boolean;
}

function ErpDataPanel({ product, connected }: ErpDataPanelProps) {
  return (
    <section className="panel erp-panel" aria-label="ERP data">
      <div className="erp-heading">
        <div>
          <span className="eyebrow">System provenance</span>
          <h2>VitaFlow ERP</h2>
        </div>
        <span className={`erp-connection${connected ? " is-connected" : ""}`}>
          {connected ? "Online" : "Local"}
        </span>
      </div>
      <dl>
        <div><dt>Source</dt><dd>Mock VitaFlow</dd></div>
        <div><dt>Branch</dt><dd>{product?.branch_id ?? "SG-001"}</dd></div>
        <div><dt>Mode</dt><dd>Mock mode</dd></div>
        <div><dt>Data</dt><dd>Fictional demo data</dd></div>
      </dl>
      <p>No customer data</p>
    </section>
  );
}

export default ErpDataPanel;
