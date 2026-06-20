import type { Product } from "./types";
import AvatarAssistant from "./components/AvatarAssistant";
import HoldToSpeakButton from "./components/HoldToSpeakButton";


const MOCK_PRODUCT: Product = {
  id: "MOCK-P001",
  name: "Relief Balm",
  branch_id: "SG-001",
  price: 12.5,
  stock: 18,
  shelf_location: "A-03",
  source: "mock_vitaflow",
  unavailable_reason: null,
};

function App() {
  return (
    <div className="kiosk-shell">
      <header className="kiosk-header">
        <div className="wordmark" aria-label="VitaKiosk">
          Vita<span>Kiosk</span>
        </div>
        <div className="connection-line" aria-label="Kiosk connection status">
          <span className="status-dot" aria-hidden="true" />
          Connected · Mock mode
        </div>
      </header>

      <main className="kiosk-layout">
        <div className="assistant-column">
          <AvatarAssistant state="idle" audioActivity={0} connected />

          <section className="speak-region" aria-label="Hold to Speak">
            <HoldToSpeakButton onStart={() => undefined} onStop={() => undefined} disabled={false} />
            <small>Press and hold while speaking</small>
          </section>
        </div>

        <div className="information-grid">
          <section className="panel product-panel" aria-label="Product">
            <div className="panel-title-row">
              <h2>Product</h2>
              <span className="source-label">Mock VitaFlow</span>
            </div>
            <div className="product-summary">
              <div className="product-art" aria-hidden="true">RB</div>
              <div>
                <h3>{MOCK_PRODUCT.name}</h3>
                <p>{MOCK_PRODUCT.id}</p>
                <strong>${MOCK_PRODUCT.price?.toFixed(2)}</strong>
              </div>
            </div>
            <dl className="facts-row">
              <div>
                <dt>Stock</dt>
                <dd>{MOCK_PRODUCT.stock}</dd>
              </div>
              <div>
                <dt>Shelf</dt>
                <dd>{MOCK_PRODUCT.shelf_location}</dd>
              </div>
              <div>
                <dt>Branch</dt>
                <dd>{MOCK_PRODUCT.branch_id}</dd>
              </div>
            </dl>
          </section>

          <section className="panel promotion-panel" aria-label="Promotion">
            <div className="panel-title-row">
              <h2>Promotion</h2>
              <span className="active-label">Active</span>
            </div>
            <div className="poster-content">
              <strong>Relief Balm Demo Offer</strong>
              <span>Active for SG-001</span>
            </div>
            <p>Fictional mock promotion. No medical claim.</p>
          </section>

          <section className="panel shelf-panel" aria-label="Shelf navigation">
            <div className="panel-title-row">
              <h2>Shelf navigation</h2>
              <span>Shortest route</span>
            </div>
            <div className="shelf-route" aria-label="Route to shelf A-03">
              <span>You are here</span>
              <i aria-hidden="true" />
              <span>Aisle 01</span>
              <i aria-hidden="true" />
              <span>Aisle 02</span>
              <i aria-hidden="true" />
              <span className="route-current">Aisle 03</span>
            </div>
            <p>Go to Aisle 03, shelf A-03.</p>
          </section>

          <section className="panel erp-panel" aria-label="ERP data">
            <h2>ERP data</h2>
            <dl>
              <div><dt>Source</dt><dd>Mock VitaFlow</dd></div>
              <div><dt>Branch</dt><dd>SG-001</dd></div>
              <div><dt>Profile</dt><dd>Fictional demo data</dd></div>
              <div><dt>Mode</dt><dd>Mock mode</dd></div>
            </dl>
          </section>

          <section className="panel pharmacist-panel" aria-label="Pharmacist assistance">
            <div>
              <h2>Pharmacist assistance</h2>
              <p>Need help with this product? A pharmacist can assist in store.</p>
            </div>
            <button type="button">Request assistance</button>
            <span>Available</span>
          </section>
        </div>
      </main>

      <footer className="kiosk-footer">
        <span><i className="status-dot" aria-hidden="true" /> Connected</span>
        <span>Mock VitaFlow · No customer data</span>
      </footer>
    </div>
  );
}

export default App;
