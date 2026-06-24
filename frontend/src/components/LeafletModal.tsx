import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { Leaflet } from "../types";

const SWIPE_THRESHOLD_PX = 68;
const DEFAULT_STAGE_WIDTH = 1200;
const ACTIVE_CARD_WIDTH_RATIO = 0.44;
const SIDE_CARD_OFFSET_RATIO = 1.12;
const SIDE_CARD_SCALE = 0.78;
const SIDE_CARD_OPACITY = 0.86;
const SIDE_CARD_DEPTH_PX = 90;
const SIDE_CARD_ROTATE_DEG = 16;
const FAR_CARD_SCALE = 0.64;
const FAR_CARD_DEPTH_PX = 150;
const FAR_CARD_ROTATE_DEG = 20;
const MIN_DECK_STEP_PX = 300;
const MAX_ACTIVE_CARD_WIDTH_PX = 660;
const SIDE_CARD_SAFE_PADDING_PX = 8;
const OPEN_ANIMATION_MS = 380;
const CLOSE_ANIMATION_MS = 240;

type LeafletAnimationState = "opening" | "open" | "closing";

interface LeafletModalProps {
  leaflets: Leaflet[];
  activeLeafletId: string | null;
  onClose: () => void;
  onSelect: (leafletId: string) => void;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function sourceLabel(source: Leaflet["source"]) {
  return source === "mock_vitaflow" ? "Mock VitaFlow" : source;
}

function kindLabel(kind: Leaflet["kind"]) {
  return kind === "promotion" ? "Promotion leaflet" : "Campaign leaflet";
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reducedMotion;
}

function clampIndex(index: number, leafletsLength: number) {
  return Math.min(Math.max(index, 0), Math.max(leafletsLength - 1, 0));
}

function pointerX(event: PointerEvent<HTMLElement>) {
  return event.clientX || event.pageX || 0;
}

function mouseX(event: MouseEvent<HTMLElement>) {
  return event.clientX || event.pageX || 0;
}

function indexForLeaflet(leaflets: Leaflet[], activeLeafletId: string | null) {
  const index = leaflets.findIndex((leaflet) => leaflet.id === activeLeafletId);
  return index >= 0 ? index : -1;
}

function LeafletModal({
  leaflets,
  activeLeafletId,
  onClose,
  onSelect,
}: LeafletModalProps) {
  const requestedIndex = indexForLeaflet(leaflets, activeLeafletId);
  const [activeIndex, setActiveIndex] = useState(requestedIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [stageWidth, setStageWidth] = useState(DEFAULT_STAGE_WIDTH);
  const sceneRef = useRef<HTMLElement | null>(null);
  const dragStartX = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [animationState, setAnimationState] = useState<LeafletAnimationState>(
    () => reducedMotion ? "open" : "opening",
  );

  useEffect(() => {
    setActiveIndex(requestedIndex);
    setDragOffset(0);
  }, [requestedIndex]);

  useEffect(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (reducedMotion) {
      setAnimationState("open");
      return undefined;
    }

    setAnimationState("opening");
    openTimerRef.current = window.setTimeout(() => {
      setAnimationState("open");
      openTimerRef.current = null;
    }, OPEN_ANIMATION_MS);

    return () => {
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    };
  }, [activeLeafletId, reducedMotion]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const activeLeaflet = activeIndex >= 0 ? leaflets[activeIndex] : null;
  const hasCarousel = leaflets.length > 1;
  const activeCardWidth = Math.min(stageWidth * ACTIVE_CARD_WIDTH_RATIO, MAX_ACTIVE_CARD_WIDTH_PX);
  const sideCardWidth = activeCardWidth * SIDE_CARD_SCALE;
  const targetStepWidth = Math.max(activeCardWidth * SIDE_CARD_OFFSET_RATIO, MIN_DECK_STEP_PX);
  const maxSafeStepWidth = Math.max(1, (stageWidth - sideCardWidth) / 2 - SIDE_CARD_SAFE_PADDING_PX);
  const stepWidth = Math.min(targetStepWidth, maxSafeStepWidth);
  const dragProgress = hasCarousel ? dragOffset / stepWidth : 0;

  useEffect(() => {
    const element = sceneRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const updateStageWidth = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) {
        setStageWidth(width);
      }
    };
    updateStageWidth();

    const observer = new ResizeObserver(updateStageWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const requestClose = useCallback(() => {
    if (closeTimerRef.current !== null || animationState === "closing") {
      return;
    }

    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (reducedMotion) {
      onClose();
      return;
    }

    setAnimationState("closing");
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, CLOSE_ANIMATION_MS);
  }, [animationState, onClose, reducedMotion]);

  const goToIndex = (index: number) => {
    const nextIndex = clampIndex(index, leaflets.length);
    const nextLeaflet = leaflets[nextIndex];
    if (!nextLeaflet || nextIndex === activeIndex) {
      setDragOffset(0);
      return;
    }

    setActiveIndex(nextIndex);
    setDragOffset(0);
    onSelect(nextLeaflet.id);
  };

  const handleShortcutKey = (key: string, preventDefault: () => void) => {
    if (key === "Escape") {
      preventDefault();
      requestClose();
      return true;
    }

    if (!hasCarousel) {
      return false;
    }

    if (key === "ArrowRight") {
      preventDefault();
      goToIndex(activeIndex + 1);
      return true;
    }

    if (key === "ArrowLeft") {
      preventDefault();
      goToIndex(activeIndex - 1);
      return true;
    }

    return false;
  };

  useEffect(() => {
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      handleShortcutKey(event.key, () => event.preventDefault());
    };

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  });

  if (!activeLeaflet) {
    return null;
  }

  const setStageWidthFromElement = (element: HTMLElement) => {
    const width = (sceneRef.current ?? element).getBoundingClientRect().width;
    setStageWidth(width > 0 ? width : DEFAULT_STAGE_WIDTH);
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!hasCarousel) {
      return;
    }

    setStageWidthFromElement(event.currentTarget);
    startDrag(pointerX(event));
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const startDrag = (x: number) => {
    dragStartX.current = x;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const updateDrag = (x: number) => {
    if (!isDraggingRef.current || dragStartX.current === null) {
      return;
    }

    const rawOffset = x - dragStartX.current;
    const atFirst = activeIndex === 0 && rawOffset > 0;
    const atLast = activeIndex === leaflets.length - 1 && rawOffset < 0;
    setDragOffset(atFirst || atLast ? rawOffset * 0.32 : rawOffset);
  };

  const completeDrag = (x: number) => {
    if (!isDraggingRef.current || dragStartX.current === null) {
      return;
    }

    const finalOffset = x - dragStartX.current;
    dragStartX.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (Math.abs(finalOffset) < SWIPE_THRESHOLD_PX) {
      setDragOffset(0);
      return;
    }

    goToIndex(activeIndex + (finalOffset < 0 ? 1 : -1));
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    updateDrag(pointerX(event));
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    completeDrag(pointerX(event));
  };

  const handleMouseDown = (event: MouseEvent<HTMLElement>) => {
    if (!hasCarousel) {
      return;
    }

    setStageWidthFromElement(event.currentTarget);
    startDrag(mouseX(event));
  };

  const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
    updateDrag(mouseX(event));
  };

  const handleMouseUp = (event: MouseEvent<HTMLElement>) => {
    completeDrag(mouseX(event));
  };

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (!hasCarousel || Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 45) {
      return;
    }

    event.preventDefault();
    goToIndex(activeIndex + (event.deltaX > 0 ? 1 : -1));
  };

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  const deckPositionLabel = (index: number) => {
    if (index === activeIndex) {
      return "active";
    }

    if (index === activeIndex - 1) {
      return "previous";
    }

    if (index === activeIndex + 1) {
      return "next";
    }

    return index < activeIndex ? "offscreen-previous" : "offscreen-next";
  };

  const deckStyleForIndex = (index: number) => {
    if (!hasCarousel) {
      return {
        "--leaflet-deck-x": "0px",
        "--leaflet-deck-scale": "1",
        "--leaflet-deck-opacity": "1",
        "--leaflet-deck-depth": "0px",
        "--leaflet-deck-rotate": "0deg",
        "--leaflet-deck-z": "100",
      } as CSSProperties;
    }

    const relativePosition = index - activeIndex + dragProgress;
    const distance = Math.abs(relativePosition);
    const x = relativePosition * stepWidth;
    const signedDirection = relativePosition === 0 ? 0 : Math.sign(relativePosition);
    const sideCurveProgress = Math.min(distance, 1);
    const farCurveProgress = Math.min(Math.max(distance - 1, 0), 1);
    const scale = index === activeIndex
      ? 1
      : distance <= 1
        ? 1 - sideCurveProgress * (1 - SIDE_CARD_SCALE)
        : Math.max(FAR_CARD_SCALE, SIDE_CARD_SCALE - farCurveProgress * (SIDE_CARD_SCALE - FAR_CARD_SCALE));
    const opacity = distance <= 0.08 ? 1 : distance <= 1.18 ? SIDE_CARD_OPACITY : 0;
    const depth = index === activeIndex
      ? 0
      : -(SIDE_CARD_DEPTH_PX * sideCurveProgress + (FAR_CARD_DEPTH_PX - SIDE_CARD_DEPTH_PX) * farCurveProgress);
    const rotate = index === activeIndex
      ? 0
      : -signedDirection * (
        SIDE_CARD_ROTATE_DEG * sideCurveProgress
        + (FAR_CARD_ROTATE_DEG - SIDE_CARD_ROTATE_DEG) * farCurveProgress
      );
    const z = Math.max(1, Math.round(100 - distance * 12));

    return {
      "--leaflet-deck-x": `${Math.round(x)}px`,
      "--leaflet-deck-scale": scale === 1 ? "1" : scale.toFixed(3),
      "--leaflet-deck-opacity": opacity === 1 ? "1" : opacity === 0 ? "0" : opacity.toFixed(2),
      "--leaflet-deck-depth": `${Math.round(depth)}px`,
      "--leaflet-deck-rotate": `${Math.round(rotate)}deg`,
      "--leaflet-deck-z": String(z),
    } as CSSProperties;
  };

  const modal = (
    <div
      className="leaflet-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Leaflet preview"
      tabIndex={-1}
      data-animation-state={animationState}
      onMouseDown={handleBackdropMouseDown}
    >
      <article
        className={`leaflet-floating-stage${isDragging ? " is-dragging" : ""}`}
        aria-label="Floating holographic leaflet card"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <section
          ref={sceneRef}
          className={`leaflet-stage-scene${isDragging ? " is-dragging" : ""}`}
          role="listbox"
          aria-label="Floating leaflet swipe surface"
          aria-describedby="leaflet-gallery-instructions leaflet-gallery-active"
          data-carousel-mode={hasCarousel ? "carousel" : "single"}
          data-deck-pattern="shallow-cylindrical"
          data-reduced-motion={String(reducedMotion)}
        >
          <div className="leaflet-flat-deck-track">
            {leaflets.map((leaflet, index) => {
              const isActive = index === activeIndex;
              const distance = Math.abs(index - activeIndex);
              const position = deckPositionLabel(index);
              return (
                <article
                  key={leaflet.id}
                  className={`floating-leaflet-panel${isActive ? " is-active" : ""}${distance === 1 ? " is-neighbor" : ""}`}
                  style={deckStyleForIndex(index)}
                  role="option"
                  aria-selected={isActive}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`${leaflet.title}, ${index + 1} of ${leaflets.length}`}
                  data-deck-position={position}
                >
                  <img src={leaflet.image_url} alt="" draggable={false} />
                  <span className="leaflet-card-glow" aria-hidden="true" />
                </article>
              );
            })}
          </div>
        </section>

        <p id="leaflet-gallery-instructions" className="leaflet-screen-reader-status">
          {hasCarousel
            ? "Swipe, drag, use a horizontal trackpad gesture, or use arrow keys to browse leaflets."
            : "Single active leaflet preview."}
        </p>
        <p id="leaflet-gallery-active" className="leaflet-screen-reader-status" aria-live="polite">
          Active leaflet {activeIndex + 1} of {leaflets.length}: {activeLeaflet.title}.
        </p>

        <aside className="leaflet-meta-panel" aria-label="Active leaflet metadata">
          <span className="eyebrow">
            {kindLabel(activeLeaflet.kind)}
          </span>
          <strong className="leaflet-meta-title">{activeLeaflet.title}</strong>
          <p className="leaflet-meta-description">{activeLeaflet.description}</p>
          <dl>
            <div>
              <dt>Branch</dt>
              <dd>{activeLeaflet.branch_id}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{sourceLabel(activeLeaflet.source)}</dd>
            </div>
            <div>
              <dt>Validity</dt>
              <dd>{formatDate(activeLeaflet.valid_from)} - {formatDate(activeLeaflet.valid_to)}</dd>
            </div>
          </dl>
        </aside>
      </article>
    </div>
  );

  if (typeof document === "undefined") {
    return modal;
  }

  return createPortal(modal, document.body);
}

export default LeafletModal;
