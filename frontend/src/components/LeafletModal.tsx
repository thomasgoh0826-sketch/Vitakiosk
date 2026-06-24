import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Leaflet } from "../types";

const SWIPE_THRESHOLD_PX = 68;
const DEFAULT_STAGE_WIDTH = 900;
const CARD_WIDTH_RATIO = 0.64;
const CARD_GAP_PX = 24;

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
  const dragStartX = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setActiveIndex(requestedIndex);
    setDragOffset(0);
  }, [requestedIndex]);

  const activeLeaflet = activeIndex >= 0 ? leaflets[activeIndex] : null;
  const hasCarousel = leaflets.length > 1;
  const stepWidth = Math.max(stageWidth * CARD_WIDTH_RATIO + CARD_GAP_PX, 300);
  const startInset = Math.max((stageWidth - stageWidth * CARD_WIDTH_RATIO) / 2, 36);
  const trackOffset = hasCarousel ? startInset - activeIndex * stepWidth + dragOffset : 0;

  if (!activeLeaflet) {
    return null;
  }

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

  const setStageWidthFromElement = (element: HTMLElement) => {
    const width = element.getBoundingClientRect().width;
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

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (!hasCarousel) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToIndex(activeIndex + 1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToIndex(activeIndex - 1);
    }
  };

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const trackStyle = {
    "--leaflet-track-offset": `${trackOffset}px`,
  } as CSSProperties;

  return (
    <div
      className="leaflet-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Leaflet preview"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onMouseDown={handleBackdropMouseDown}
    >
      <article
        className={`leaflet-modal leaflet-stage-surface${isDragging ? " is-dragging" : ""}`}
        aria-label="Full holographic leaflet swipe stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <header className="leaflet-modal-header leaflet-stage-header">
          <div>
            <span className="eyebrow">Holographic leaflet stage</span>
            <h2>{activeLeaflet.title}</h2>
          </div>
        </header>

        <section
          className={`leaflet-stage-scene${isDragging ? " is-dragging" : ""}`}
          role="listbox"
          aria-label="Full-stage swipe leaflet viewer"
          aria-describedby="leaflet-gallery-instructions leaflet-gallery-active"
          data-carousel-mode={hasCarousel ? "carousel" : "single"}
          data-reduced-motion={String(reducedMotion)}
        >
          <div className="leaflet-depth-track" style={trackStyle}>
            {leaflets.map((leaflet, index) => {
              const isActive = index === activeIndex;
              const distance = Math.abs(index - activeIndex);
              const position = index < activeIndex ? "previous" : index > activeIndex ? "next" : "active";
              return (
                <article
                  key={leaflet.id}
                  className={`floating-leaflet-panel${isActive ? " is-active" : ""}${distance === 1 ? " is-neighbor" : ""}`}
                  role="option"
                  aria-selected={isActive}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`${leaflet.title}, ${index + 1} of ${leaflets.length}`}
                  data-position={position}
                >
                  <span className="leaflet-card-kind">{kindLabel(leaflet.kind)}</span>
                  <img src={leaflet.image_url} alt="" draggable={false} />
                  <span className="leaflet-card-glow" aria-hidden="true" />
                </article>
              );
            })}
          </div>
        </section>

        <p id="leaflet-gallery-instructions" className="leaflet-swipe-hint">
          {hasCarousel ? "Swipe to browse" : "Single active leaflet"}
        </p>
        <p id="leaflet-gallery-active" className="leaflet-screen-reader-status" aria-live="polite">
          Active leaflet {activeIndex + 1} of {leaflets.length}: {activeLeaflet.title}.
        </p>

        <aside className="leaflet-modal-copy leaflet-metadata-panel" aria-label="Active leaflet metadata">
          <span className="eyebrow">
            {kindLabel(activeLeaflet.kind)}
          </span>
          <h3>{activeLeaflet.title}</h3>
          <p>{activeLeaflet.description}</p>
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
}

export default LeafletModal;
