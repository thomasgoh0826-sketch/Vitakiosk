import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HandHeart, Languages, Mic, ScanLine, X } from "lucide-react";
import {
  demoLanguageLabels,
  demoProduct,
  demoTranscriptStates,
  DemoLanguage,
  DemoMode,
} from "../content/interactiveDemoStates";
import { aiPharmacyAssistantAvatar } from "../content/demoAssets";

const formatPrice = (price: number) => `$${price.toFixed(2)}`;
type MobilePanel = "voice" | "product" | "promotion" | "shelf" | "scan" | "assistance";

const mobilePanels: Array<{ id: MobilePanel; label: string }> = [
  { id: "voice", label: "Voice" },
  { id: "product", label: "Product" },
  { id: "promotion", label: "Promotion" },
  { id: "shelf", label: "Shelf" },
  { id: "scan", label: "Scan" },
  { id: "assistance", label: "Assistance" },
];

function DemoStateMachine({ mode }: { mode: DemoMode }) {
  return (
    <span className="sr-only" data-testid="demo-state-machine" data-state={mode}>
      {mode}
    </span>
  );
}

function KioskPanel({
  as = "section",
  className,
  children,
  ...props
}: {
  as?: "section" | "article" | "div";
  className: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const Component = as;
  return (
    <Component className={`mini-kiosk-panel ${className}`} {...props}>
      {children}
    </Component>
  );
}

function KioskAvatarPanel({ mode }: { mode: DemoMode }) {
  const isListening = mode === "listening";
  return (
    <KioskPanel className="mini-avatar-panel" aria-label="AI assistant">
      <div className="mini-panel-kicker">VitaKiosk Labs</div>
      <h3>AI Pharmacy Assistant</h3>
      <div className="mini-avatar-stage" data-active={isListening ? "true" : "false"}>
        <span className="mini-avatar-orbit orbit-a" />
        <span className="mini-avatar-orbit orbit-b" />
        <img
          className="mini-avatar-image"
          src={aiPharmacyAssistantAvatar.src}
          alt={aiPharmacyAssistantAvatar.alt}
          loading="eager"
          decoding="async"
        />
      </div>
      <div className="mini-avatar-wave" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, index) => (
          <i key={index} />
        ))}
      </div>
      <strong className="mini-ready-dot">{isListening ? "LISTENING" : "READY"}</strong>
      <small>Information support only. A pharmacist remains available.</small>
    </KioskPanel>
  );
}

function KioskSubtitlePanel({ mode, language }: { mode: DemoMode; language: DemoLanguage }) {
  const labels = demoLanguageLabels[language];
  const text =
    mode === "listening"
      ? demoTranscriptStates.listening
      : mode === "answering"
        ? demoTranscriptStates.answering
        : mode === "fuzzy_match"
          ? demoTranscriptStates.fuzzy_match
          : mode === "scan_product"
            ? demoTranscriptStates.scan_product
            : mode === "pharmacist_handoff"
              ? demoTranscriptStates.pharmacist_handoff
              : demoTranscriptStates.idle;

  return (
    <KioskPanel className="mini-subtitle-panel" aria-live="polite">
      <div className="mini-subtitle-chrome">
        <span>AI subtitle</span>
        <span>{mode === "answering" ? labels.response : labels.ready}</span>
      </div>
      <strong>{text}</strong>
      {mode === "listening" && (
        <div className="mini-subtitle-wave" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, index) => (
            <i key={index} />
          ))}
        </div>
      )}
    </KioskPanel>
  );
}

function KioskProductPanel({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  return (
    <button
      className="mini-kiosk-panel mini-product-panel"
      data-active={active ? "true" : "false"}
      onClick={onOpen}
      type="button"
      aria-label="Product panel"
    >
      <div className="mini-product-hero">
        <span className="mini-product-medallion">RE</span>
        <div>
          <span className="mini-panel-kicker">Product verified</span>
          <h3>{demoProduct.name}</h3>
          <small>Product education</small>
          <strong>{formatPrice(demoProduct.price)}</strong>
          <p>Current product education price</p>
        </div>
      </div>
      <div className="mini-product-facts">
        <span>
          <b>Stock</b>
          {demoProduct.stock}
        </span>
        <span>
          <b>Branch</b>
          {demoProduct.branch}
        </span>
        <span>
          <b>Shelf</b>
          {demoProduct.shelf}
        </span>
        <span>
          <b>Data</b>
          Connected
        </span>
      </div>
    </button>
  );
}

function KioskShelfMap({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  return (
    <button
      className="mini-kiosk-panel mini-shelf-panel"
      data-active={active ? "true" : "false"}
      onClick={onOpen}
      type="button"
      aria-label="Shelf navigation map"
    >
      <span className="mini-panel-kicker">Indoor pharmacy map</span>
      <h3>Shelf navigation</h3>
      <div className="mini-shelf-map" data-route-active={active ? "true" : "false"}>
        <span className="mini-pharmacy-label">Pharmacy</span>
        <span className="mini-aisle aisle-01">01</span>
        <span className="mini-aisle aisle-02">02</span>
        <span className="mini-aisle aisle-03">03</span>
        <span className="mini-map-start">You are here</span>
        <span className="mini-route-segment route-one" />
        <span className="mini-route-segment route-two" />
        <span className="mini-route-segment route-three" />
        <span className="mini-map-target">Target<br />Shelf A-03</span>
        <span className="mini-pharmacist-label">Pharmacist</span>
      </div>
      <div className="mini-map-data">
        <span>Aisle <b>03</b></span>
        <span>Shelf <b>{demoProduct.shelf}</b></span>
        <span>Level <b>02</b></span>
      </div>
      <small>{"Route: Entrance -> Aisle 03 -> Shelf A-03"}</small>
    </button>
  );
}

function KioskPromotionPanel({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  return (
    <button
      className="mini-promotion-panel"
      data-active={active ? "true" : "false"}
      onClick={onOpen}
      type="button"
      aria-label="Promotion leaflet"
    >
      <article>
        <span>VitaKiosk</span>
        <i className="mini-leaflet-icon" />
        <strong>{demoProduct.name}</strong>
        <b>{demoProduct.promotion.replace("Relief Balm ", "")}</b>
        <small>Active for {demoProduct.branch}</small>
        <em>Product education only</em>
      </article>
      <article>
        <span>VitaKiosk</span>
        <i className="mini-leaflet-icon alt" />
        <strong>Supplement</strong>
        <b>Savings Demo</b>
        <small>Ask pharmacist for advice</small>
        <em>Sponsored education labelled</em>
      </article>
    </button>
  );
}

function KioskProvenancePanel() {
  return (
    <KioskPanel className="mini-provenance-panel" aria-label="Connected product data">
      <span className="mini-panel-kicker">Connected data</span>
      <h3>VitaFlow ERP</h3>
      <dl>
        <div><dt>Product data</dt><dd>Connected</dd></div>
        <div><dt>Branch</dt><dd>{demoProduct.branch}</dd></div>
        <div><dt>Campaigns</dt><dd>Reviewed</dd></div>
        <div><dt>Guidance</dt><dd>Staff handoff</dd></div>
      </dl>
      <small>Product education and where-to-buy guidance only.</small>
    </KioskPanel>
  );
}

function KioskAssistancePanel({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  return (
    <KioskPanel className="mini-assistance-panel" data-active={active ? "true" : "false"}>
      <span className="mini-panel-kicker">Clinical safety</span>
      <h3>Pharmacist assistance</h3>
      <p>In-store safety handoff only.</p>
      <button type="button" onClick={onOpen} aria-label="Request assistance">
        + Request assistance
      </button>
    </KioskPanel>
  );
}

function KioskTapToSpeakButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      className="mini-tap-button"
      data-active={active ? "true" : "false"}
      onClick={onClick}
      type="button"
      aria-label="Tap to Speak"
    >
      <span><Mic size={22} /></span>
      <strong>Tap to Speak</strong>
      <small>Voice assistance</small>
    </button>
  );
}

function KioskScanProductButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      className="mini-scan-button"
      data-active={active ? "true" : "false"}
      onClick={onClick}
      type="button"
      aria-label="Scan Product"
    >
      <ScanLine size={18} />
      Scan Product
    </button>
  );
}

function KioskLanguageChips({
  language,
  onChange,
}: {
  language: DemoLanguage;
  onChange: (language: DemoLanguage) => void;
}) {
  return (
    <div className="mini-language-chips" aria-label="Demo language selector">
      <Languages size={14} />
      <button className={language === "en" ? "is-active" : ""} onClick={() => onChange("en")} type="button" aria-label="Language EN">EN</button>
      <button className={language === "zh" ? "is-active" : ""} onClick={() => onChange("zh")} type="button" aria-label="Language 中文">中文</button>
      <button className={language === "bm" ? "is-active" : ""} onClick={() => onChange("bm")} type="button" aria-label="Language BM">BM</button>
      <small>{demoLanguageLabels[language].selected}</small>
    </div>
  );
}

function KioskInputBar({
  onFuzzy,
  onScan,
  scanActive,
}: {
  onFuzzy: () => void;
  onScan: () => void;
  scanActive: boolean;
}) {
  return (
    <div className="mini-input-zone">
      <div className="mini-input-bar" aria-label="Demo typed question">
        <span>Ask about a product, stock, promotion, or shelf location</span>
        <button type="button" onClick={onFuzzy} aria-label="Relief Bomb">
          Relief Bomb
        </button>
      </div>
      <KioskScanProductButton active={scanActive} onClick={onScan} />
    </div>
  );
}

function KioskFuzzyMatchPanel({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="mini-state-callout mini-fuzzy-panel">
      <span>Do you mean</span>
      <button type="button" onClick={onSelect} aria-label="Relief Balm">
        <b>{demoProduct.name}</b>
        <small>Product education | Shelf {demoProduct.shelf}</small>
      </button>
    </div>
  );
}

function KioskDemoStateLayer({
  mode,
  onClose,
  children,
}: {
  mode: DemoMode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mini-demo-overlay" role="dialog" aria-modal="true" aria-label={`${mode.replace("_", " ")} demo state`} onMouseDown={onClose}>
      <div className={`mini-demo-sheet state-${mode}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="mini-close-button" type="button" onClick={onClose} aria-label="Close demo state">
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

function KioskProductEnlarge({
  sheetMode,
  onToggle,
}: {
  sheetMode: "summary" | "detail";
  onToggle: () => void;
}) {
  return (
    <button className="mini-product-enlarge" data-view={sheetMode} onClick={onToggle} type="button">
      <span>{sheetMode === "summary" ? "Product summary" : "Product detail"}</span>
      <h3>{demoProduct.name}</h3>
      <p>
        {sheetMode === "summary"
          ? demoProduct.summary
          : "Menthol, camphor, and herbal soothing ingredients. External use only. Ask staff if unsure."}
      </p>
      <strong>{formatPrice(demoProduct.price)}</strong>
      <small>Tap inside sheet to morph summary/detail.</small>
    </button>
  );
}

function KioskPromotionViewer() {
  return (
    <div className="mini-promotion-viewer">
      <article>
        <span>VitaKiosk</span>
        <i className="mini-leaflet-icon" />
        <h3>{demoProduct.name}</h3>
        <strong>{demoProduct.promotion}</strong>
        <p>Sponsored product education must be clearly labelled and reviewed before display.</p>
      </article>
    </div>
  );
}

function KioskScanOverlay({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="mini-scan-overlay">
      <ScanLine size={34} />
      <div className="mini-scan-frame" aria-hidden="true">
        <span />
      </div>
      <h3>Packaging detected</h3>
      <p>Best match: {demoProduct.name}</p>
      <button className="button primary" onClick={onSelect} type="button">
        Select Relief Balm
      </button>
    </div>
  );
}

function DemoPharmacistHandoff() {
  return (
    <div className="mini-handoff-overlay">
      <HandHeart size={38} />
      <h3>A pharmacist or staff member can assist you.</h3>
      <p>Product education and guidance only. Not diagnosis, prescription consultation, or professional medical advice.</p>
    </div>
  );
}

function ShelfRouteExpanded({ onClose }: { onClose: () => void }) {
  return (
    <div className="mini-shelf-route-expanded">
      <KioskShelfMap active onOpen={() => undefined} />
      <div className="mini-route-summary">
        <span>Shelf route</span>
        <strong>Entrance &gt; Aisle 03 &gt; Shelf A-03</strong>
        <button onClick={onClose} type="button">Close route</button>
      </div>
    </div>
  );
}

export function InteractiveVitaKioskMiniApp() {
  const [mode, setMode] = useState<DemoMode>("idle");
  const [sheetMode, setSheetMode] = useState<"summary" | "detail">("summary");
  const [language, setLanguage] = useState<DemoLanguage>("en");
  const [selectedPulse, setSelectedPulse] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("voice");
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (demoRef.current) {
      demoRef.current.scrollTop = 0;
      demoRef.current.scrollLeft = 0;
    }
  }, [mode, fullscreen]);

  useEffect(() => {
    if (mode === "listening") {
      const answerTimer = window.setTimeout(() => setMode("answering"), 800);
      return () => window.clearTimeout(answerTimer);
    }
    if (mode === "answering") {
      const readyTimer = window.setTimeout(() => {
        setMode("idle");
        setSelectedPulse(false);
      }, 4200);
      return () => window.clearTimeout(readyTimer);
    }
  }, [mode]);

  const openMode = (next: DemoMode) => {
    setSheetMode("summary");
    setSelectedPulse(false);
    setMode(next);
  };

  const openMobilePanel = (next: MobilePanel) => {
    setMobilePanel(next);
    if (next !== "scan" && mode === "scan_product") {
      setMode("idle");
    }
  };

  const selectReliefBalm = () => {
    setSelectedPulse(true);
    setMode("answering");
  };

  const activeProduct = selectedPulse || ["listening", "answering", "fuzzy_match", "product_enlarged", "scan_product"].includes(mode);
  const activePromotion = selectedPulse || ["listening", "answering", "fuzzy_match", "promotion_open", "scan_product"].includes(mode);
  const activeShelf = selectedPulse || ["listening", "answering", "fuzzy_match", "shelf_route", "scan_product"].includes(mode);

  const kioskApp = (
      <div
        ref={demoRef}
        id="interactive-demo"
        className={`interactive-kiosk-mini-app state-${mode}`}
        data-demo-state={mode}
        data-mobile-panel={mobilePanel}
        data-component="InteractiveVitaKioskMiniApp"
      >
        <DemoStateMachine mode={mode} />
        {fullscreen && (
          <button className="mini-exit-fullscreen" type="button" onClick={() => setFullscreen(false)} aria-label="Close fullscreen demo">
            <X size={18} />
          </button>
        )}
        <header className="mini-kiosk-header">
          <div className="mini-wordmark">
            <span>V</span>
            <strong>VitaKiosk <b>Labs</b></strong>
          </div>
          <div className="mini-connection">
            <i />
            Connected product experience
          </div>
        </header>
        {fullscreen && (
          <nav className="mini-mobile-tabbar" aria-label="Fullscreen demo sections">
            {mobilePanels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                aria-label={`Mobile demo tab ${panel.label}`}
                aria-pressed={mobilePanel === panel.id}
                className={mobilePanel === panel.id ? "is-active" : ""}
                onClick={() => openMobilePanel(panel.id)}
              >
                {panel.label}
              </button>
            ))}
          </nav>
        )}
        <main className="mini-kiosk-layout">
          <aside className="mini-left-column">
            <KioskAvatarPanel mode={mode} />
            <KioskTapToSpeakButton active={mode === "listening"} onClick={() => openMode("listening")} />
            <KioskLanguageChips language={language} onChange={setLanguage} />
          </aside>
          <section className="mini-center-deck" aria-label="Interactive VitaKiosk demo controls">
            <KioskSubtitlePanel mode={mode} language={language} />
            <KioskProductPanel active={activeProduct} onOpen={() => openMode("product_enlarged")} />
            <KioskShelfMap active={activeShelf} onOpen={() => openMode("shelf_route")} />
            <KioskInputBar onFuzzy={() => openMode("fuzzy_match")} onScan={() => openMode("scan_product")} scanActive={mode === "scan_product"} />
          </section>
          <aside className="mini-right-rail">
            <KioskPromotionPanel active={activePromotion} onOpen={() => openMode("promotion_open")} />
            <KioskProvenancePanel />
            <KioskAssistancePanel active={mode === "pharmacist_handoff"} onOpen={() => openMode("pharmacist_handoff")} />
          </aside>
        </main>
        {mode === "fuzzy_match" && <KioskFuzzyMatchPanel onSelect={selectReliefBalm} />}
        {mode === "shelf_route" && (
          <KioskDemoStateLayer mode={mode} onClose={() => setMode("idle")}>
            <ShelfRouteExpanded onClose={() => setMode("idle")} />
          </KioskDemoStateLayer>
        )}
        {mode === "product_enlarged" && (
          <KioskDemoStateLayer mode={mode} onClose={() => setMode("idle")}>
            <KioskProductEnlarge
              sheetMode={sheetMode}
              onToggle={() => setSheetMode(sheetMode === "summary" ? "detail" : "summary")}
            />
          </KioskDemoStateLayer>
        )}
        {mode === "promotion_open" && (
          <KioskDemoStateLayer mode={mode} onClose={() => setMode("idle")}>
            <KioskPromotionViewer />
          </KioskDemoStateLayer>
        )}
        {mode === "scan_product" && (
          <KioskDemoStateLayer mode={mode} onClose={() => setMode("idle")}>
            <KioskScanOverlay onSelect={selectReliefBalm} />
          </KioskDemoStateLayer>
        )}
        {mode === "pharmacist_handoff" && (
          <KioskDemoStateLayer mode={mode} onClose={() => setMode("idle")}>
            <DemoPharmacistHandoff />
          </KioskDemoStateLayer>
        )}
      </div>
  );

  return (
    <div className="mini-kiosk-host">
      {!fullscreen && (
        <button className="mini-fullscreen-toggle" type="button" onClick={() => setFullscreen(true)}>
          Explore Demo
        </button>
      )}
      {!fullscreen && kioskApp}
      {fullscreen &&
        createPortal(
          <div className="mini-kiosk-host mini-kiosk-fullscreen">
            {kioskApp}
          </div>,
          document.body,
        )}
    </div>
  );
}
