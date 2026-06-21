import { useCallback, useState } from "react";

import { api } from "./api/client";
import AvatarAssistant from "./components/AvatarAssistant";
import ErpDataPanel from "./components/ErpDataPanel";
import HoldToSpeakButton from "./components/HoldToSpeakButton";
import PharmacistEscalationPanel from "./components/PharmacistEscalationPanel";
import ProductCard from "./components/ProductCard";
import PromotionPoster from "./components/PromotionPoster";
import ShelfMap from "./components/ShelfMap";
import TapToSpeakButton from "./components/TapToSpeakButton";
import useKioskSocket from "./hooks/useKioskSocket";
import useVoiceInteraction from "./hooks/useVoiceInteraction";
import type { Product, Promotion } from "./types";


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

const MOCK_PROMOTION: Promotion = {
  id: "MOCK-PR001",
  title: "Relief Balm Demo Offer",
  branch_id: "SG-001",
  product_ids: ["MOCK-P001"],
  active: true,
  valid_from: "2025-01-01T00:00:00Z",
  valid_to: "2030-12-31T23:59:00Z",
  source: "mock_vitaflow",
};

const BRANCH_ID = "SG-001";

function createSessionId() {
  return `kiosk-${globalThis.crypto?.randomUUID?.() ?? "demo-session"}`;
}

function App() {
  const [sessionId] = useState(createSessionId);
  const [manualEscalationId, setManualEscalationId] = useState<string | null>(null);
  const socket = useKioskSocket(sessionId);
  const voice = useVoiceInteraction({
    sessionId,
    branchId: BRANCH_ID,
    api,
    serverState: socket.state,
    sendState: socket.sendState,
  });
  const product = voice.hasResult ? voice.product : MOCK_PRODUCT;
  const promotions = voice.hasResult ? voice.promotions : [MOCK_PROMOTION];
  const avatarState = manualEscalationId
    ? "pharmacist_escalation"
    : voice.state;
  const holdDisabled = ["thinking", "speaking", "pharmacist_escalation"].includes(avatarState);
  const connectionCopy = socket.connected ? "Connected" : "Local state mode";
  const requestAssistance = useCallback(() => {
    void api
      .escalatePharmacist(
        "customer requested assistance",
        BRANCH_ID,
        sessionId,
      )
      .then((escalation) => setManualEscalationId(escalation.id));
  }, [sessionId]);

  return (
    <div className={`kiosk-shell kiosk-state-${avatarState}`}>
      <div className="kiosk-ambient-grid" aria-hidden="true" />
      <header className="kiosk-header">
        <div className="wordmark" aria-label="VitaKiosk Labs">
          <span className="wordmark-mark" aria-hidden="true">V</span>
          <span>VitaKiosk <strong>Labs</strong></span>
        </div>
        <div className="connection-line" aria-label="Kiosk connection status">
          <span className="status-dot" aria-hidden="true" />
          {connectionCopy} · Mock mode · No customer data
        </div>
      </header>

      <main className="kiosk-layout">
        <aside className="assistant-column">
          <AvatarAssistant
            state={avatarState}
            audioActivity={voice.audioActivity}
            connected={socket.connected}
          />

          <section className="speak-region" aria-label="Voice assistant controls">
            <TapToSpeakButton
              state={avatarState}
              onStart={() => void voice.startRecording()}
              onStop={() => void voice.stopRecording()}
            />
            <small className="voice-feedback" aria-live="polite">
              {voice.error ?? voice.responseText ?? "Tap once to begin"}
            </small>
            <section className="hold-fallback" aria-label="Hold to Speak fallback">
              <span>Press-and-hold fallback</span>
              <HoldToSpeakButton
                onStart={() => void voice.startRecording()}
                onStop={() => void voice.stopRecording()}
                disabled={holdDisabled}
              />
            </section>
          </section>
        </aside>

        <section className="clinical-deck" aria-label="AI conversation deck">
          <div className="conversation-panel panel">
            <div className="conversation-bubble customer-question">
              <span>You</span>
              <p>
                {voice.hasResult
                  ? "Voice request received"
                  : "What can I help you find today?"}
              </p>
            </div>
            <div className="conversation-bubble ai-answer">
              <span>VitaKiosk AI</span>
              <p>
                {voice.responseText
                  || "Tap to Speak to ask about a product, price, stock, promotion, or shelf location."}
              </p>
            </div>
          </div>
          <ProductCard product={product} purchasingQueryId={voice.purchasingQueryId} />
          <ShelfMap product={product} />
        </section>

        <aside className="retail-safety-rail">
          <PromotionPoster
            promotion={promotions[0] ?? null}
            poster={voice.poster}
            product={product}
          />
          <ErpDataPanel product={product} connected={socket.connected} />
          <PharmacistEscalationPanel
            active={avatarState === "pharmacist_escalation"}
            escalationId={manualEscalationId ?? voice.escalationId}
            onRequest={requestAssistance}
          />
        </aside>
      </main>

      <footer className="kiosk-footer">
        <span><i className="status-dot" aria-hidden="true" /> {connectionCopy}</span>
        <span>VitaFlow ERP is the source of truth · Mock-first demo</span>
      </footer>
    </div>
  );
}

export default App;
