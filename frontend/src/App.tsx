import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "./api/client";
import AvatarAssistant from "./components/AvatarAssistant";
import CameraScanOverlay from "./components/CameraScanOverlay";
import ConversationPanel from "./components/ConversationPanel";
import ErpDataPanel from "./components/ErpDataPanel";
import LanguageSelector from "./components/LanguageSelector";
import LeafletModal from "./components/LeafletModal";
import PharmacistEscalationPanel from "./components/PharmacistEscalationPanel";
import ProductCard from "./components/ProductCard";
import ProductCandidatePanel from "./components/ProductCandidatePanel";
import PromotionPoster, { type PromotionPanelMode } from "./components/PromotionPoster";
import RuntimeDiagnostics from "./components/RuntimeDiagnostics";
import ShelfMap from "./components/ShelfMap";
import TapToSpeakButton from "./components/TapToSpeakButton";
import TypedInputPanel from "./components/TypedInputPanel";
import useKioskLanguage from "./hooks/useKioskLanguage";
import useKioskSocket from "./hooks/useKioskSocket";
import useVoiceInteraction from "./hooks/useVoiceInteraction";
import type { KioskTranslations } from "./i18n";
import { getTypedInputConfig } from "./inputConfig";
import type {
  AvatarPresentation,
  AvatarState,
  BranchShelfMap,
  Leaflet,
  Product,
  ProductScanResponse,
  ProductSearchCandidate,
  RuntimeStatusResponse,
  UiAction,
} from "./types";
import { isApprovedUiAction } from "./uiActions";

const BRANCH_ID = String(import.meta.env.VITE_BRANCH_ID || "SG-001").trim() || "SG-001";
let fallbackSessionCounter = 0;

const DEFAULT_AVATAR_PRESENTATION: AvatarPresentation = {
  expression: "neutral_idle",
  focusTarget: "center",
  gesture: "none",
};

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

function getActionStringField(
  action: UiAction,
  field: "productId" | "promotionId" | "campaignId" | "shelf",
) {
  const value = (action as Partial<Record<typeof field, unknown>>)[field];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function actionTargetsProduct(action: UiAction, product: Product | null) {
  return Boolean(product && getActionStringField(action, "productId") === product.id);
}

function actionTargetsShelf(action: UiAction, product: Product | null) {
  if (!actionTargetsProduct(action, product)) {
    return false;
  }
  const actionShelf = getActionStringField(action, "shelf");
  if (!actionShelf) {
    return true;
  }
  return actionShelf === product?.shelf_location;
}

function findLeaflet(leaflets: Leaflet[], action: UiAction) {
  const promotionId = getActionStringField(action, "promotionId");
  if (promotionId) {
    return leaflets.find((leaflet) => leaflet.id === promotionId) ?? null;
  }
  const campaignId = getActionStringField(action, "campaignId");
  if (campaignId) {
    return leaflets.find((leaflet) => leaflet.id === campaignId) ?? null;
  }
  const productId = getActionStringField(action, "productId");
  if (productId) {
    return leaflets.find((leaflet) =>
      leaflet.kind === "promotion"
      && leaflet.product_ids.includes(productId),
    ) ?? null;
  }
  return null;
}

function uniqueLeaflets(leaflets: Array<Leaflet | null | undefined>) {
  const seen = new Set<string>();
  return leaflets.filter((leaflet): leaflet is Leaflet => {
    if (!leaflet || seen.has(leaflet.id)) {
      return false;
    }
    seen.add(leaflet.id);
    return true;
  });
}

export function isAffirmativeLeafletFollowup(text: string) {
  const normalized = text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return false;
  }
  const exactMatches = new Set([
    "yes",
    "yes please",
    "yes interested",
    "i am interested",
    "interested",
    "ok",
    "okay",
    "sure",
    "show me",
    "show it",
    "open it",
    "enlarge it",
    "ya",
    "ya please",
    "boleh",
    "boleh tunjuk",
    "nak",
    "nak tengok",
    "可以",
    "可以看",
    "可以给我看",
    "要",
    "要看",
    "好",
    "好的",
  ]);
  if (exactMatches.has(normalized)) {
    return true;
  }
  return [
    "yes interested",
    "show me other promotion",
    "show other promotion",
    "show me campaign",
    "show campaign",
    "我要看",
    "给我看",
    "我想看",
    "saya nak tengok",
    "tunjuk promosi",
    "tunjuk kempen",
  ].some((phrase) => normalized.includes(phrase));
}

export function followupLeafletQuery(text: string) {
  const normalized = text.toLocaleLowerCase();
  if (
    normalized.includes("campaign")
    || normalized.includes("kempen")
    || normalized.includes("活动")
    || normalized.includes("健康")
  ) {
    return "show active branch campaigns";
  }
  return "show active branch promotions";
}

function productLinkedLeaflets(
  leaflets: Leaflet[],
  product: Product | null,
  kind?: Leaflet["kind"],
) {
  if (!product) {
    return [];
  }
  return leaflets.filter((leaflet) =>
    (!kind || leaflet.kind === kind)
    && leaflet.product_ids.includes(product.id),
  );
}

function branchCampaignLeaflets(leaflets: Leaflet[]) {
  return leaflets.filter((leaflet) =>
    leaflet.kind === "campaign" && leaflet.product_ids.length === 0,
  );
}

function branchPromotionLeaflets(leaflets: Leaflet[]) {
  return leaflets.filter((leaflet) =>
    leaflet.kind === "promotion" && leaflet.product_ids.length === 0,
  );
}

function relevantLeafletDeck(
  leaflets: Leaflet[],
  product: Product | null,
  mode: PromotionPanelMode,
  selectedLeafletId: string | null,
) {
  const selected = leaflets.find((leaflet) => leaflet.id === selectedLeafletId) ?? null;
  const promotionLeaflets = leaflets.filter((leaflet) => leaflet.kind === "promotion");
  const campaignLeaflets = leaflets.filter((leaflet) => leaflet.kind === "campaign");

  if (mode === "promotion_gallery") {
    return uniqueLeaflets([...promotionLeaflets, ...campaignLeaflets, selected]);
  }

  if (mode === "campaign_gallery") {
    return uniqueLeaflets([...campaignLeaflets, ...promotionLeaflets, selected]);
  }

  const productPromotions = productLinkedLeaflets(leaflets, product, "promotion");
  const productCampaigns = productLinkedLeaflets(leaflets, product, "campaign");
  const fallbackPromotions = branchPromotionLeaflets(leaflets);
  const fallbackCampaigns = branchCampaignLeaflets(leaflets);

  if (productPromotions.length > 0) {
    return uniqueLeaflets([
      ...productPromotions,
      ...productCampaigns,
      ...fallbackPromotions,
      ...fallbackCampaigns,
      ...campaignLeaflets,
      ...leaflets,
      selected,
    ]);
  }

  return uniqueLeaflets([
    ...fallbackPromotions,
    ...productCampaigns,
    ...fallbackCampaigns,
    ...campaignLeaflets,
    ...leaflets,
    selected,
  ]);
}

export function getAvatarPresentationForActions(
  state: AvatarState,
  actions: readonly UiAction[],
): AvatarPresentation {
  if (
    state === "pharmacist_escalation"
    || actions.some((action) =>
      action.type === "REQUEST_PHARMACIST_ASSISTANCE"
      || action.type === "ASK_PHARMACIST_CONFIRMATION"
    )
  ) {
    return {
      expression: "safety_alert",
      focusTarget: "pharmacist",
      gesture: "safety_handoff",
    };
  }

  if (state !== "thinking" && state !== "speaking") {
    return DEFAULT_AVATAR_PRESENTATION;
  }

  if (
    actions.some((action) =>
      action.type === "OPEN_SHELF_MAP"
      || action.type === "HIGHLIGHT_SHELF_ROUTE"
    )
  ) {
    return {
      expression: "focused_guidance",
      focusTarget: "shelf",
      gesture: "guide_shelf",
    };
  }

  if (
    actions.some((action) =>
      action.type === "OPEN_PROMOTION_MODAL"
      || action.type === "OPEN_PROMOTION_LEAFLET"
      || action.type === "OPEN_CAMPAIGN_MODAL"
      || action.type === "OPEN_CAMPAIGN_LEAFLET"
      || action.type === "SHOW_PROMOTION_GALLERY"
      || action.type === "SHOW_CAMPAIGN_GALLERY"
      || action.type === "SHOW_LEAFLET_GALLERY"
      || action.type === "HIGHLIGHT_PROMOTION"
    )
  ) {
    return {
      expression: "happy_highlight",
      focusTarget: "promotion",
      gesture: "present_promotion",
    };
  }

  if (
    actions.some((action) =>
      action.type === "OPEN_PRODUCT_DETAIL"
      || action.type === "OPEN_PRODUCT_SUMMARY"
      || action.type === "HIGHLIGHT_PRODUCT"
      || action.type === "SHOW_PRODUCT"
    )
  ) {
    return {
      expression: "friendly_explaining",
      focusTarget: "product",
      gesture: "present_product",
    };
  }

  if (state === "speaking") {
    return {
      expression: "friendly_explaining",
      focusTarget: "center",
      gesture: "none",
    };
  }

  return DEFAULT_AVATAR_PRESENTATION;
}

function voiceFeedbackCopy(
  state: AvatarState,
  error: string | null,
  labels: KioskTranslations,
) {
  if (error) {
    return labels.retryOrStart;
  }
  switch (state) {
    case "listening":
      return labels.listeningSubtitle;
    case "thinking":
      return labels.preparingAnswer;
    case "speaking":
      return `${labels.speaking}...`;
    case "pharmacist_escalation":
      return labels.escalationRequestedCopy;
    default:
      return labels.tapOnceToBegin;
  }
}

function App() {
  const [sessionId, setSessionId] = useState(createSessionId);
  const [manualEscalationId, setManualEscalationId] = useState<string | null>(null);
  const [promotionPanelMode, setPromotionPanelMode] =
    useState<PromotionPanelMode>("idle");
  const [selectedLeafletId, setSelectedLeafletId] = useState<string | null>(null);
  const [modalLeafletId, setModalLeafletId] = useState<string | null>(null);
  const leafletDismissSuppressUntilRef = useRef(0);
  const leafletDismissSuppressedRef = useRef(false);
  const leafletDismissSuppressTimerRef = useRef<number | null>(null);
  const [leafletDismissSuppressed, setLeafletDismissSuppressed] = useState(false);
  const [typedQuestion, setTypedQuestion] = useState("");
  const [typedInputResetToken, setTypedInputResetToken] = useState(0);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatusResponse | null>(null);
  const [activeBranchLeaflets, setActiveBranchLeaflets] = useState<Leaflet[]>([]);
  const [branchShelfMap, setBranchShelfMap] = useState<BranchShelfMap | null>(null);
  const [shelfMapUnavailableReason, setShelfMapUnavailableReason] = useState<string | null>(null);
  const [providerStatusUnavailable, setProviderStatusUnavailable] = useState(false);
  const [pharmacistConfirmationRequested, setPharmacistConfirmationRequested] =
    useState(false);
  const [pharmacistRequestPending, setPharmacistRequestPending] = useState(false);
  const [pharmacistRequestError, setPharmacistRequestError] = useState<string | null>(null);
  const [productDetailOpenToken, setProductDetailOpenToken] = useState(0);
  const [productSummaryOpenToken, setProductSummaryOpenToken] = useState(0);
  const [shelfMapOpenToken, setShelfMapOpenToken] = useState(0);
  const processedUiActionKeyRef = useRef<string | null>(null);
  const [selectedProductCandidate, setSelectedProductCandidate] =
    useState<ProductSearchCandidate | null>(null);
  const [scanOverlayOpen, setScanOverlayOpen] = useState(false);
  const scanOpenedResultIdRef = useRef<number | null>(null);
  const [scanProductCandidates, setScanProductCandidates] = useState<ProductSearchCandidate[]>([]);
  const [scanPurchasingQueryId, setScanPurchasingQueryId] = useState<string | null>(null);
  const [scanMissActive, setScanMissActive] = useState(false);
  const {
    language,
    preferredLanguage,
    setLanguage,
    t,
  } = useKioskLanguage();
  const typedInputConfig = getTypedInputConfig();
  const socket = useKioskSocket(sessionId);
  const voice = useVoiceInteraction({
    sessionId,
    branchId: BRANCH_ID,
    preferredLanguage,
    api,
    serverState: socket.state,
    sendState: socket.sendState,
  });
  const productCandidates = selectedProductCandidate
    ? []
    : scanProductCandidates.length > 0
      ? scanProductCandidates
      : voice.productCandidates ?? [];
  const product = scanMissActive
    ? null
    : selectedProductCandidate
      ? selectedProductCandidate.product
      : productCandidates.length > 0
        ? null
        : voice.hasResult
          ? voice.product
          : null;
  const leaflets = useMemo(
    () => uniqueLeaflets([
      ...(voice.hasResult ? (voice.leaflets ?? []) : []),
      ...activeBranchLeaflets,
    ])
      .filter((leaflet) => isLeafletActiveForBranch(leaflet, BRANCH_ID)),
    [activeBranchLeaflets, voice.hasResult, voice.leaflets],
  );
  const uiActions = useMemo(
    () => (voice.uiActions ?? []).filter(isApprovedUiAction),
    [voice.uiActions],
  );
  const avatarState = manualEscalationId
    ? "pharmacist_escalation"
    : voice.state;
  const avatarPresentation = useMemo(
    () => getAvatarPresentationForActions(avatarState, uiActions),
    [avatarState, uiActions],
  );
  const escalationActive = avatarState === "pharmacist_escalation";
  const connectionCopy = socket.connected ? t.connected : t.localStateMode;
  const modalLeaflets = useMemo(() => {
    const deck = relevantLeafletDeck(
      leaflets,
      product,
      promotionPanelMode,
      modalLeafletId ?? selectedLeafletId,
    );
    return deck.length ? deck : leaflets;
  }, [leaflets, modalLeafletId, product, promotionPanelMode, selectedLeafletId]);

  useEffect(() => {
    let active = true;

    if (!api.runtimeStatus) {
      setRuntimeStatus(null);
      setProviderStatusUnavailable(true);
      console.warn("VitaKiosk provider status unavailable", {
        reason: "runtime-status-client-missing",
      });
      return undefined;
    }

    void api
      .runtimeStatus()
      .then((status) => {
        if (active) {
          setRuntimeStatus(status);
          setProviderStatusUnavailable(false);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setRuntimeStatus(null);
          setProviderStatusUnavailable(true);
        }
        console.warn("VitaKiosk provider status unavailable", { error });
      });

    return () => {
      active = false;
    };
  }, []);

  const requestAssistance = useCallback(() => {
    if (pharmacistRequestPending) {
      return;
    }
    setPharmacistConfirmationRequested(true);
    setPharmacistRequestPending(true);
    setPharmacistRequestError(null);
    void api
      .escalatePharmacist(
        "customer requested assistance",
        BRANCH_ID,
        sessionId,
      )
      .then((escalation) => {
        setManualEscalationId(escalation.id);
      })
      .catch(() => {
        setPharmacistRequestError("Could not notify the pharmacist. Please try again.");
      })
      .finally(() => {
        setPharmacistRequestPending(false);
      });
  }, [pharmacistRequestPending, sessionId]);

  const startNewCustomer = useCallback(() => {
    setManualEscalationId(null);
    setPharmacistConfirmationRequested(false);
    setPharmacistRequestPending(false);
    setPharmacistRequestError(null);
    setSelectedProductCandidate(null);
    scanOpenedResultIdRef.current = null;
    setScanOverlayOpen(false);
    setScanProductCandidates([]);
    setScanPurchasingQueryId(null);
    setScanMissActive(false);
    setPromotionPanelMode("idle");
    setSelectedLeafletId(null);
    setModalLeafletId(null);
    setProductDetailOpenToken(0);
    setProductSummaryOpenToken(0);
    setShelfMapOpenToken(0);
    processedUiActionKeyRef.current = null;
    setTypedQuestion("");
    setTypedInputResetToken((current) => current + 1);
    voice.reset();
    socket.sendState("idle");
    setSessionId(createSessionId());
  }, [socket, voice]);

  useEffect(() => {
    scanOpenedResultIdRef.current = null;
    setScanOverlayOpen(false);
    setSelectedProductCandidate(null);
    setScanProductCandidates([]);
    setScanPurchasingQueryId(null);
    setScanMissActive(false);
  }, [voice.resultId]);

  const showPromotionGallery = useCallback(() => {
    setPromotionPanelMode("promotion_gallery");
    setSelectedLeafletId(null);
  }, []);

  useEffect(() => {
    let active = true;

    if (!api.activeLeaflets) {
      setActiveBranchLeaflets([]);
      return undefined;
    }

    void api
      .activeLeaflets(BRANCH_ID)
      .then((response) => {
        if (active) {
          setActiveBranchLeaflets(
            response.items.filter((leaflet) =>
              isLeafletActiveForBranch(leaflet, BRANCH_ID)
            ),
          );
        }
      })
      .catch(() => {
        if (active) {
          setActiveBranchLeaflets([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const showCampaignGallery = useCallback(() => {
    setPromotionPanelMode("campaign_gallery");
    setSelectedLeafletId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (leafletDismissSuppressTimerRef.current !== null) {
        window.clearTimeout(leafletDismissSuppressTimerRef.current);
        leafletDismissSuppressTimerRef.current = null;
      }
    };
  }, []);

  const openLeaflet = useCallback((leaflet: Leaflet) => {
    if (
      leafletDismissSuppressed ||
      leafletDismissSuppressedRef.current ||
      Date.now() < leafletDismissSuppressUntilRef.current
    ) {
      return;
    }
    setSelectedLeafletId(leaflet.id);
    setModalLeafletId(leaflet.id);
  }, [leafletDismissSuppressed]);

  const suppressLeafletReopenAfterDismiss = useCallback(() => {
    leafletDismissSuppressUntilRef.current = Date.now() + 650;
    leafletDismissSuppressedRef.current = true;
    setLeafletDismissSuppressed(true);
    if (leafletDismissSuppressTimerRef.current !== null) {
      window.clearTimeout(leafletDismissSuppressTimerRef.current);
    }
    leafletDismissSuppressTimerRef.current = window.setTimeout(() => {
      leafletDismissSuppressTimerRef.current = null;
      leafletDismissSuppressedRef.current = false;
      setLeafletDismissSuppressed(false);
    }, 650);
  }, []);

  useEffect(() => {
    let active = true;
    if (!api.shelfMap) {
      setBranchShelfMap(null);
      setShelfMapUnavailableReason("ERP shelf map unavailable.");
      return undefined;
    }

    void api
      .shelfMap(BRANCH_ID)
      .then((response) => {
        if (!active) {
          return;
        }
        setBranchShelfMap(response.map);
        setShelfMapUnavailableReason(response.unavailable_reason);
      })
      .catch(() => {
        if (active) {
          setBranchShelfMap(null);
          setShelfMapUnavailableReason("ERP shelf map unavailable.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const openScanProduct = useCallback(() => {
    if (avatarState === "pharmacist_escalation") {
      return;
    }
    setModalLeafletId(null);
    scanOpenedResultIdRef.current = voice.resultId;
    setScanOverlayOpen(true);
  }, [avatarState, voice.resultId]);

  const closeScanProduct = useCallback(() => {
    scanOpenedResultIdRef.current = null;
    setScanOverlayOpen(false);
  }, []);

  const selectProductCandidate = useCallback((candidate: ProductSearchCandidate) => {
    voice.adoptConfirmedProduct(candidate.product);
    setSelectedProductCandidate(candidate);
    setScanProductCandidates([]);
    setScanPurchasingQueryId(null);
    setScanMissActive(false);
    const matchingPromotionLeaflet = leaflets.find((leaflet) =>
      leaflet.kind === "promotion"
      && leaflet.product_ids.includes(candidate.product.id),
    );
    if (matchingPromotionLeaflet) {
      setSelectedLeafletId(matchingPromotionLeaflet.id);
      setPromotionPanelMode("product_promotion");
      setModalLeafletId(null);
      return;
    }
    setSelectedLeafletId(null);
    setPromotionPanelMode("product_options");
    setModalLeafletId(null);
  }, [leaflets, voice]);

  const handleScanResult = useCallback((result: ProductScanResponse) => {
    if (scanOpenedResultIdRef.current !== voice.resultId) {
      return;
    }
    scanOpenedResultIdRef.current = null;
    const candidates = result.candidates.map((candidate) => ({
      product: candidate.product,
      confidence: candidate.confidence,
      match_reason: candidate.matchReason,
      matched_text: candidate.matchedText ?? "",
    }));

    if (!result.requiresConfirmation && candidates.length === 1) {
      setScanPurchasingQueryId(null);
      setScanMissActive(false);
      selectProductCandidate(candidates[0]);
      return;
    }

    setSelectedProductCandidate(null);
    setScanProductCandidates(candidates);
    setScanPurchasingQueryId(result.purchasingQueryId ?? null);
    setScanMissActive(candidates.length === 0);
  }, [selectProductCandidate, voice.resultId]);

  useEffect(() => {
    if (!voice.hasResult) {
      return;
    }

    const actionKey = `${voice.resultId}:${JSON.stringify(uiActions)}`;
    if (processedUiActionKeyRef.current === actionKey) {
      return;
    }
    processedUiActionKeyRef.current = actionKey;

    if (escalationActive) {
      setModalLeafletId(null);
      return;
    }

    const hasExplicitLeafletOpenAction = uiActions.some((action) =>
      action.type === "OPEN_PROMOTION_MODAL"
      || action.type === "OPEN_PROMOTION_LEAFLET"
      || action.type === "OPEN_CAMPAIGN_MODAL"
      || action.type === "OPEN_CAMPAIGN_LEAFLET"
    );
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
        case "HIGHLIGHT_PROMOTION": {
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
          const productId = getActionStringField(action, "productId");
          const productPayloadIsSafe = !productId || actionTargetsProduct(action, product);
          if (leaflet && productPayloadIsSafe) {
            setSelectedLeafletId(leaflet.id);
            setPromotionPanelMode(productId ? "product_promotion" : "promotion_gallery");
            setModalLeafletId(leaflet.id);
            panelWasControlled = true;
          }
          break;
        }
        case "OPEN_PROMOTION_LEAFLET": {
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
            setPromotionPanelMode(
              getActionStringField(action, "campaignId") && !getActionStringField(action, "productId")
                ? "campaign_gallery"
                : "product_campaign",
            );
            setModalLeafletId(leaflet.id);
            panelWasControlled = true;
          }
          break;
        }
        case "OPEN_CAMPAIGN_LEAFLET": {
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
          if (!hasExplicitLeafletOpenAction) {
            const firstPromotion = leaflets.find((leaflet) => leaflet.kind === "promotion");
            if (firstPromotion) {
              setSelectedLeafletId(firstPromotion.id);
              setModalLeafletId(firstPromotion.id);
            }
          }
          panelWasControlled = true;
          break;
        case "SHOW_CAMPAIGN_GALLERY":
          showCampaignGallery();
          if (!hasExplicitLeafletOpenAction) {
            const firstCampaign = leaflets.find((leaflet) => leaflet.kind === "campaign");
            if (firstCampaign) {
              setSelectedLeafletId(firstCampaign.id);
              setModalLeafletId(firstCampaign.id);
            }
          }
          panelWasControlled = true;
          break;
        case "SHOW_LEAFLET_GALLERY":
          setPromotionPanelMode("campaign_gallery");
          setSelectedLeafletId(null);
          panelWasControlled = true;
          break;
        case "ASK_PHARMACIST_CONFIRMATION":
          setPharmacistConfirmationRequested(true);
          break;
        case "REQUEST_PHARMACIST_ASSISTANCE":
          setModalLeafletId(null);
          break;
        case "OPEN_PRODUCT_DETAIL":
          if (actionTargetsProduct(action, product)) {
            setModalLeafletId(null);
            setProductDetailOpenToken((current) => current + 1);
            panelWasControlled = true;
          }
          break;
        case "OPEN_PRODUCT_SUMMARY":
          if (actionTargetsProduct(action, product)) {
            setModalLeafletId(null);
            setProductSummaryOpenToken((current) => current + 1);
            panelWasControlled = true;
          }
          break;
        case "HIGHLIGHT_PRODUCT":
          if (actionTargetsProduct(action, product)) {
            panelWasControlled = true;
          }
          break;
        case "OPEN_SHELF_MAP":
          if (actionTargetsShelf(action, product)) {
            setModalLeafletId(null);
            setShelfMapOpenToken((current) => current + 1);
            panelWasControlled = true;
          }
          break;
        case "OPEN_PRODUCT_SCAN":
        case "START_PRODUCT_SCAN":
          openScanProduct();
          panelWasControlled = true;
          break;
        case "HIGHLIGHT_SHELF_ROUTE":
          if (actionTargetsShelf(action, product)) {
            panelWasControlled = true;
          }
          break;
        case "CLOSE_ACTIVE_OVERLAY":
          setModalLeafletId(null);
          panelWasControlled = true;
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
    openScanProduct,
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

  const vitaFlowIsReadOnly = runtimeStatus?.vitaflow_provider === "readonly_api";
  const dataSourceCopy = vitaFlowIsReadOnly
    ? t.vitaFlowErp
    : runtimeStatus?.vitaflow_provider === "mock"
      ? t.mockVitaFlow
      : t.vitaFlowErp;
  const dataModeCopy = vitaFlowIsReadOnly
    ? "Read-only"
    : runtimeStatus?.vitaflow_provider === "mock"
      ? t.mockMode
      : "Checking data source";

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
          {connectionCopy} · {dataSourceCopy} · {dataModeCopy} · {t.noCustomerData}
        </div>
        <RuntimeDiagnostics
          runtimeStatus={runtimeStatus}
          providerStatusUnavailable={providerStatusUnavailable}
        />
      </header>

      <main className="kiosk-layout">
        <aside className="assistant-column">
          <AvatarAssistant
            state={avatarState}
            audioActivity={voice.audioActivity}
            connected={socket.connected}
            labels={t}
            presentation={avatarPresentation}
          />

          <section className="speak-region" aria-label="Voice assistant controls">
            <TapToSpeakButton
              state={avatarState}
              onStart={() => void voice.startRecording()}
              onStop={() => void voice.stopRecording()}
              labels={t}
            />
            <small className="voice-feedback" aria-live="polite">
              {voiceFeedbackCopy(avatarState, voice.error, t)}
            </small>
            <section className="customer-reset" aria-label="New customer reset">
              <span>{t.freshSession}</span>
              <button
                className="customer-reset-button"
                type="button"
                onClick={startNewCustomer}
              >
                <span aria-hidden="true">↻</span>
                {t.start}
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
            audioPlaybackBlocked={voice.audioPlaybackBlocked}
            labels={t}
          />
          <ProductCandidatePanel
            candidates={productCandidates}
            labels={t}
            onSelect={selectProductCandidate}
          />
          <ProductCard
            product={product}
            purchasingQueryId={scanPurchasingQueryId ?? voice.purchasingQueryId}
            labels={t}
            language={language}
            hasActivePromotion={
              Boolean(
                product
                && leaflets.some((leaflet) =>
                  leaflet.kind === "promotion"
                  && leaflet.product_ids.includes(product.id),
                ),
              )
            }
            openDetailsToken={productDetailOpenToken}
            openSummaryToken={productSummaryOpenToken}
          />
          <ShelfMap
            product={product}
            branchMap={branchShelfMap}
            mapUnavailableReason={shelfMapUnavailableReason}
            labels={t}
            openMapToken={shelfMapOpenToken}
          />
          <TypedInputPanel
            value={typedQuestion}
            config={typedInputConfig}
            resetToken={typedInputResetToken}
            labels={t}
            disabled={
              avatarState === "listening"
              || avatarState === "thinking"
              || avatarState === "speaking"
              || avatarState === "pharmacist_escalation"
            }
            onChange={setTypedQuestion}
            onClear={() => setTypedQuestion("")}
            onSubmit={(question) => {
              if (
                product
                && promotionPanelMode === "product_options"
                && isAffirmativeLeafletFollowup(question)
              ) {
                void voice.submitText(followupLeafletQuery(question), question);
                return;
              }
              void voice.submitText(question);
            }}
          />
          <section className="panel scan-product-rail" aria-label={t.scanProduct}>
            <div>
              <span className="eyebrow">{dataSourceCopy}</span>
              <p>{t.scanProductInstruction}</p>
            </div>
            <button
              type="button"
              className="scan-product-button"
              onClick={openScanProduct}
              disabled={avatarState === "pharmacist_escalation"}
            >
              <span aria-hidden="true">▣</span>
              {t.scanProduct}
            </button>
          </section>
        </section>

        <aside className="retail-safety-rail">
          <PromotionPoster
            mode={promotionPanelMode}
            leaflets={leaflets}
            selectedLeafletId={selectedLeafletId}
            product={product}
            safetyOverride={escalationActive}
            labels={t}
            onOpenLeaflet={openLeaflet}
            onShowPromotions={showPromotionGallery}
            onShowCampaigns={showCampaignGallery}
          />
          <ErpDataPanel
            product={product}
            connected={socket.connected}
            branchId={BRANCH_ID}
            runtimeStatus={runtimeStatus}
            labels={t}
          />
          <PharmacistEscalationPanel
            active={escalationActive}
            confirmationRequested={pharmacistConfirmationRequested}
            escalationId={manualEscalationId ?? voice.escalationId}
            requestPending={pharmacistRequestPending}
            requestError={pharmacistRequestError}
            labels={t}
            onRequest={requestAssistance}
            onStartNewCustomer={startNewCustomer}
          />
        </aside>
      </main>

      <LeafletModal
        leaflets={modalLeaflets}
        activeLeafletId={escalationActive ? null : modalLeafletId}
        onClose={() => setModalLeafletId(null)}
        onDismissStart={suppressLeafletReopenAfterDismiss}
        onSelect={(leafletId) => {
          setSelectedLeafletId(leafletId);
          setModalLeafletId(leafletId);
        }}
      />

      <CameraScanOverlay
        open={scanOverlayOpen}
        api={api}
        branchId={BRANCH_ID}
        labels={t}
        onClose={closeScanProduct}
        onResult={handleScanResult}
      />

      <footer className="kiosk-footer">
        <span className="footer-status-cluster">
          <span className="footer-connection">
            <i className="status-dot" aria-hidden="true" /> {connectionCopy}
          </span>
          <LanguageSelector language={language} onChange={setLanguage} />
        </span>
        <span>
          VitaFlow ERP is the source of truth · {
            vitaFlowIsReadOnly
              ? "Read-only connection"
              : runtimeStatus?.vitaflow_provider === "mock"
                ? t.mockMode
                : "Checking connection"
          }
        </span>
      </footer>
    </div>
  );
}

export default App;
