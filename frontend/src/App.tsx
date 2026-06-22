import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "./api/client";
import AvatarAssistant from "./components/AvatarAssistant";
import ConversationPanel from "./components/ConversationPanel";
import ErpDataPanel from "./components/ErpDataPanel";
import LeafletModal from "./components/LeafletModal";
import PharmacistEscalationPanel from "./components/PharmacistEscalationPanel";
import ProductCard from "./components/ProductCard";
import PromotionPoster, { type PromotionPanelMode } from "./components/PromotionPoster";
import ShelfMap from "./components/ShelfMap";
import TapToSpeakButton from "./components/TapToSpeakButton";
import useKioskSocket from "./hooks/useKioskSocket";
import useVoiceInteraction from "./hooks/useVoiceInteraction";
import { MOCK_LEAFLETS } from "./mockLeaflets";
import type { AvatarState, Leaflet, Product, UiAction } from "./types";
import { isApprovedUiAction } from "./uiActions";


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

const BRANCH_ID = "SG-001";
let fallbackSessionCounter = 0;

function createSessionId() {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) {
    return `kiosk-${randomId}`;
  }
  fallbackSessionCounter += 1;
  return `kiosk-demo-session-${fallbackSessionCounter}`;
}

function isLeafletActiveForBranch(leaflet: Leaflet, branchId: string) {
  const now = Date.now();
  return (
    leaflet.active
    && leaflet.branch_id === branchId
    && Date.parse(leaflet.valid_from) <= now
    && now <= Date.parse(leaflet.valid_to)
  );
}

function findLeaflet(leaflets: Leaflet[], action: UiAction) {
  if ("promotionId" in action) {
    return leaflets.find((leaflet) => leaflet.id === action.promotionId) ?? null;
  }
  if ("campaignId" in action) {
    return leaflets.find((leaflet) => leaflet.id === action.campaignId) ?? null;
  }
  return null;
}

function voiceFeedbackCopy(state: AvatarState, error: string | null) {
  if (error) {
    return "Please try again or press Start.";
  }
  switch (state) {
    case "listening":
      return "Listening...";
    case "thinking":
      return "Preparing answer...";
    case "speaking":
      return "Speaking...";
    case "pharmacist_escalation":
      return "Pharmacist assistance requested.";
    default:
      return "Tap once to begin";
  }
}

function App() {
  const [sessionId, setSessionId] = useState(createSessionId);
  const [manualEscalationId, setManualEscalationId] = useState<string | null>(null);
  const [promotionPanelMode, setPromotionPanelMode] =
    useState<PromotionPanelMode>("idle");
  const [selectedLeafletId, setSelectedLeafletId] = useState<string | null>(null);
  const [modalLeafletId, setModalLeafletId] = useState<string | null>(null);
  const [pharmacistConfirmationRequested, setPharmacistConfirmationRequested] =
    useState(false);
  const socket = useKioskSocket(sessionId);
  const voice = useVoiceInteraction({
    sessionId,
    branchId: BRANCH_ID,
    api,
    serverState: socket.state,
    sendState: socket.sendState,
  });
  const product = voice.hasResult ? voice.product : MOCK_PRODUCT;
  const leaflets = useMemo(
    () => (voice.hasResult ? (voice.leaflets ?? []) : MOCK_LEAFLETS)
      .filter((leaflet) => isLeafletActiveForBranch(leaflet, BRANCH_ID)),
    [voice.hasResult, voice.leaflets],
  );
  const uiActions = useMemo(
    () => (voice.uiActions ?? []).filter(isApprovedUiAction),
    [voice.uiActions],
  );
  const avatarState = manualEscalationId
    ? "pharmacist_escalation"
    : voice.state;
  const escalationActive = avatarState === "pharmacist_escalation";
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

  const startNewCustomer = useCallback(() => {
    setManualEscalationId(null);
    setPharmacistConfirmationRequested(false);
    setPromotionPanelMode("idle");
    setSelectedLeafletId(null);
    setModalLeafletId(null);
    voice.reset();
    socket.sendState("idle");
    setSessionId(createSessionId());
  }, [socket, voice]);

  const showPromotionGallery = useCallback(() => {
    setPromotionPanelMode("promotion_gallery");
    setSelectedLeafletId(null);
    setModalLeafletId(null);
  }, []);

  const showCampaignGallery = useCallback(() => {
    setPromotionPanelMode("campaign_gallery");
    setSelectedLeafletId(null);
    setModalLeafletId(null);
  }, []);

  const openLeaflet = useCallback((leaflet: Leaflet) => {
    setSelectedLeafletId(leaflet.id);
    setModalLeafletId(leaflet.id);
  }, []);

  useEffect(() => {
    if (!voice.hasResult) {
      return;
    }

    if (escalationActive) {
      setModalLeafletId(null);
      return;
    }

    let panelWasControlled = false;
    for (const action of uiActions) {
      switch (action.type) {
        case "SHOW_PROMOTION_LEAFLET": {
          const leaflet = findLeaflet(leaflets, action);
          if (leaflet) {
            setSelectedLeafletId(leaflet.id);
            setPromotionPanelMode("product_promotion");
            panelWasControlled = true;
          }
          break;
        }
        case "OPEN_PROMOTION_MODAL": {
          const leaflet = findLeaflet(leaflets, action);
          if (leaflet) {
            setSelectedLeafletId(leaflet.id);
            setPromotionPanelMode("product_promotion");
            setModalLeafletId(leaflet.id);
            panelWasControlled = true;
          }
          break;
        }
        case "SHOW_CAMPAIGN_LEAFLET": {
          const leaflet = findLeaflet(leaflets, action);
          if (leaflet) {
            setSelectedLeafletId(leaflet.id);
            setPromotionPanelMode("product_campaign");
            panelWasControlled = true;
          }
          break;
        }
        case "OPEN_CAMPAIGN_MODAL": {
          const leaflet = findLeaflet(leaflets, action);
          if (leaflet) {
            setSelectedLeafletId(leaflet.id);
            setPromotionPanelMode("product_campaign");
            setModalLeafletId(leaflet.id);
            panelWasControlled = true;
          }
          break;
        }
        case "SHOW_PROMOTION_GALLERY":
          showPromotionGallery();
          panelWasControlled = true;
          break;
        case "SHOW_CAMPAIGN_GALLERY":
          showCampaignGallery();
          panelWasControlled = true;
          break;
        case "ASK_PHARMACIST_CONFIRMATION":
          setPharmacistConfirmationRequested(true);
          break;
        case "REQUEST_PHARMACIST_ASSISTANCE":
          setModalLeafletId(null);
          break;
        case "RESET_KIOSK":
          startNewCustomer();
          panelWasControlled = true;
          break;
        case "SHOW_PRODUCT":
          break;
      }
    }

    const productHasPromotion = Boolean(
      product && leaflets.some((leaflet) =>
        leaflet.kind === "promotion" && leaflet.product_ids.includes(product.id),
      ),
    );
    if (!panelWasControlled && product && !productHasPromotion) {
      setPromotionPanelMode("product_options");
      setSelectedLeafletId(null);
      setModalLeafletId(null);
    }
  }, [
    escalationActive,
    leaflets,
    product,
    showCampaignGallery,
    showPromotionGallery,
    startNewCustomer,
    uiActions,
    voice.hasResult,
    voice.resultId,
  ]);

  useEffect(() => {
    if (!escalationActive) {
      return undefined;
    }
    const resetTimer = window.setTimeout(startNewCustomer, 15_000);
    return () => window.clearTimeout(resetTimer);
  }, [escalationActive, startNewCustomer]);

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
              {voiceFeedbackCopy(avatarState, voice.error)}
            </small>
            <section className="customer-reset" aria-label="New customer reset">
              <span>Fresh session</span>
              <button
                className="customer-reset-button"
                type="button"
                onClick={startNewCustomer}
              >
                <span aria-hidden="true">↻</span>
                Start
              </button>
            </section>
          </section>
        </aside>

        <section className="clinical-deck" aria-label="AI conversation deck">
          <ConversationPanel
            transcript={voice.transcript ?? ""}
            responseText={voice.responseText}
            state={avatarState}
            error={voice.error}
          />
          <ProductCard product={product} purchasingQueryId={voice.purchasingQueryId} />
          <ShelfMap product={product} />
        </section>

        <aside className="retail-safety-rail">
          <PromotionPoster
            mode={promotionPanelMode}
            leaflets={leaflets}
            selectedLeafletId={selectedLeafletId}
            product={product}
            safetyOverride={escalationActive}
            onOpenLeaflet={openLeaflet}
            onShowPromotions={showPromotionGallery}
            onShowCampaigns={showCampaignGallery}
          />
          <ErpDataPanel product={product} connected={socket.connected} />
          <PharmacistEscalationPanel
            active={escalationActive}
            confirmationRequested={pharmacistConfirmationRequested}
            escalationId={manualEscalationId ?? voice.escalationId}
            onRequest={requestAssistance}
            onStartNewCustomer={startNewCustomer}
          />
        </aside>
      </main>

      <LeafletModal
        leaflets={leaflets}
        activeLeafletId={escalationActive ? null : modalLeafletId}
        onClose={() => setModalLeafletId(null)}
        onSelect={setModalLeafletId}
      />

      <footer className="kiosk-footer">
        <span><i className="status-dot" aria-hidden="true" /> {connectionCopy}</span>
        <span>VitaFlow ERP is the source of truth · Mock-first demo</span>
      </footer>
    </div>
  );
}

export default App;
