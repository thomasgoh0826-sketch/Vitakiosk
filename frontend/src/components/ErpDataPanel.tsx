import type { Product } from "../types";


interface ErpDataPanelProps {
  product: Product | null;
  connected: boolean;
}

function ErpDataPanel({ product, connected }: ErpDataPanelProps) {
  return (
    <section className="panel erp-panel" aria-label="ERP data">
      <h2>ERP data</h2>
      <dl>
        <div><dt>Source</dt><dd>Mock VitaFlow</dd></div>
        <div><dt>Branch</dt><dd>{product?.branch_id ?? "SG-001"}</dd></div>
        <div><dt>Profile</dt><dd>Fictional demo data</dd></div>
        <div><dt>Realtime</dt><dd>{connected ? "Connected" : "Local state mode"}</dd></div>
      </dl>
    </section>
  );
}

export default ErpDataPanel;
