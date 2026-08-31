import {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export interface ErpOrbitImage {
  src: string;
  alt: string;
  title: string;
}

interface ErpOrbitCarouselProps {
  images: ErpOrbitImage[];
  autoRotate?: boolean;
  rotationSpeed?: number;
  activeIndex?: number | null;
  onSelect?: (index: number | null) => void;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function shortestSignedAngle(value: number) {
  const normalized = normalizeDegrees(value);
  return normalized > 180 ? normalized - 360 : normalized;
}

function supportsHoverPointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function getNearestIndex(phase: number, count: number, step: number) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < count; index += 1) {
    const distance = Math.abs(shortestSignedAngle(phase + index * step));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

export function ErpOrbitCarousel({
  images,
  autoRotate = true,
  rotationSpeed = 22000,
  activeIndex,
  onSelect,
}: ErpOrbitCarouselProps) {
  const [phase, setPhase] = useState(0);
  const [internalActiveIndex, setInternalActiveIndex] = useState<number | null>(null);
  const [hovering, setHovering] = useState(false);
  const [touching, setTouching] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [stageWidth, setStageWidth] = useState(720);
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const dragFrameRef = useRef(0);
  const touchPauseTimeoutRef = useRef(0);
  const pendingPhaseRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const suppressClickRef = useRef(false);
  const touchDragPointerId = -101;
  const dragStateRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    pointerType: "mouse",
    startX: 0,
    startY: 0,
    startPhase: 0,
    tapIndex: null as number | null,
    cancelledByScroll: false,
  });
  const controlled = activeIndex !== undefined;
  const selectedIndex = controlled ? activeIndex : internalActiveIndex;
  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;
  const paused = !autoRotate || hovering || touching || dragging || focusWithin || selectedIndex !== null;
  const count = Math.max(images.length, 1);
  const step = 360 / count;
  const touchDragEnabled = true;

  function setSelected(index: number | null) {
    if (!controlled) {
      setInternalActiveIndex(index);
    }
    if (index === null) {
      setFocusWithin(false);
      setTouching(false);
    }
    onSelect?.(index);
  }

  const updatePhase = (nextPhase: number) => {
    const normalized = normalizeDegrees(nextPhase);
    phaseRef.current = normalized;
    setPhase(normalized);
  };

  const schedulePhaseUpdate = (nextPhase: number) => {
    pendingPhaseRef.current = normalizeDegrees(nextPhase);
    if (dragFrameRef.current) {
      return;
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = 0;
      if (pendingPhaseRef.current !== null) {
        updatePhase(pendingPhaseRef.current);
        pendingPhaseRef.current = null;
      }
    });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const updateSize = () => setStageWidth(root.clientWidth || 720);
    updateSize();
    const ResizeObserverConstructor = window.ResizeObserver;
    if (!ResizeObserverConstructor) {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserverConstructor(updateSize);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || images.length <= 1) {
      lastTimeRef.current = null;
      return undefined;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current !== null) {
        const delta = time - lastTimeRef.current;
        setPhase((current) => {
          const nextPhase = normalizeDegrees(current + (delta / rotationSpeed) * 360);
          phaseRef.current = nextPhase;
          return nextPhase;
        });
      }
      lastTimeRef.current = time;
      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [images.length, paused, rotationSpeed]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && selectedIndex !== null) {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (selectedIndex === null) {
      return undefined;
    }

    const closeFromOutside = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        !target ||
        target.closest(".erp-orbit-card") ||
        target.closest(".erp-preview-panel") ||
        target.closest(".erp-preview-close")
      ) {
        return;
      }
      setSelected(null);
    };

    window.addEventListener("pointerdown", closeFromOutside, true);
    window.addEventListener("touchstart", closeFromOutside, true);
    window.addEventListener("click", closeFromOutside, true);
    return () => {
      window.removeEventListener("pointerdown", closeFromOutside, true);
      window.removeEventListener("touchstart", closeFromOutside, true);
      window.removeEventListener("click", closeFromOutside, true);
    };
  }, [selectedIndex]);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(dragFrameRef.current);
      window.clearTimeout(touchPauseTimeoutRef.current);
    },
    [],
  );

  const closePreview = () => {
    setSelected(null);
  };

  const closePreviewFromControl = (
    event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    closePreview();
  };

  const closePreviewFromBackdrop = (event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      event.stopPropagation();
      closePreview();
    }
  };

  const stopPreviewEvent = (event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const selectCard = (index: number) => {
    updatePhase(-index * step);
    setSelected(index);
  };

  const beginOrbitDrag = (
    pointerId: number,
    clientX: number,
    clientY: number,
    tapIndex: number | null = null,
    pointerType = "mouse",
  ) => {
    dragStateRef.current = {
      active: true,
      moved: false,
      pointerId,
      pointerType,
      startX: clientX,
      startY: clientY,
      startPhase: phaseRef.current,
      tapIndex,
      cancelledByScroll: false,
    };
  };

  const moveOrbitDrag = (pointerId: number, clientX: number, clientY: number, preventDefault?: () => void) => {
    const dragState = dragStateRef.current;
    if (!dragState.active || dragState.pointerId !== pointerId || images.length <= 1 || selectedIndex !== null) {
      return;
    }

    const deltaX = clientX - dragState.startX;
    const deltaY = clientY - dragState.startY;
    const isTouch = dragState.pointerType !== "mouse";
    const verticalScrollIntent = isTouch
      ? Math.abs(deltaY) > 14 && Math.abs(deltaY) > Math.abs(deltaX) * 1.18
      : false;
    const movedFarEnough = isTouch
      ? Math.abs(deltaX) > 14 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25
      : Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY) * 0.8;

    if (!dragState.moved && verticalScrollIntent) {
      dragStateRef.current = {
        ...dragState,
        active: false,
        moved: false,
        cancelledByScroll: true,
      };
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 180);
      setDragging(false);
      setTouching(false);
      return;
    }

    if (!dragState.moved && !movedFarEnough) {
      return;
    }

    dragState.moved = true;
    suppressClickRef.current = true;
    setDragging(true);
    preventDefault?.();

    const sensitivity = stageWidth < 620 ? 0.34 : 0.24;
    schedulePhaseUpdate(dragState.startPhase + deltaX * sensitivity);
  };

  const finishOrbitDrag = (pointerId: number) => {
    const dragState = dragStateRef.current;
    if (!dragState.active || dragState.pointerId !== pointerId) {
      return;
    }

    dragStateRef.current = { ...dragState, active: false };
    setDragging(false);
    setTouching(false);

    if (dragState.cancelledByScroll) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 180);
      return;
    }

    if (dragState.moved) {
      const phaseToSettle = pendingPhaseRef.current ?? phaseRef.current;
      const nearestIndex = getNearestIndex(phaseToSettle, count, step);
      updatePhase(-nearestIndex * step);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    } else if (dragState.tapIndex !== null) {
      selectCard(dragState.tapIndex);
    }
  };

  const handleRootPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    if (typeof event.button === "number" && event.button !== 0) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    const tappedCard = target?.closest(".erp-orbit-card");
    const tapIndex = tappedCard ? Number(tappedCard.getAttribute("data-index")) : null;

    beginOrbitDrag(event.pointerId, event.clientX, event.clientY, Number.isFinite(tapIndex) ? tapIndex : null, "mouse");
  };

  const handleRootPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    moveOrbitDrag(event.pointerId, event.clientX, event.clientY, () => event.preventDefault());
  };

  const settleDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    try {
      if (
        typeof event.currentTarget.releasePointerCapture === "function" &&
        (typeof event.currentTarget.hasPointerCapture !== "function" || event.currentTarget.hasPointerCapture(event.pointerId))
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Safari and test environments may release capture before pointerup.
    }
    finishOrbitDrag(event.pointerId);
  };

  const handlePointerLeave = (event?: PointerEvent<HTMLDivElement>) => {
    if (event && event.pointerType !== "mouse") {
      return;
    }

    setHovering(false);
    if (!dragStateRef.current.active) {
      setTouching(false);
      setDragging(false);
    }
    setFocusWithin(false);
    if (selectedIndex !== null) {
      setSelected(null);
    }
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const handleNativeTouchStart = (event: globalThis.TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }
      const touch = event.touches[0];
      const target = event.target instanceof Element ? event.target : null;
      const tappedCard = target?.closest(".erp-orbit-card");
      const tapIndex = tappedCard ? Number(tappedCard.getAttribute("data-index")) : null;

      setTouching(true);
      window.clearTimeout(touchPauseTimeoutRef.current);
      touchPauseTimeoutRef.current = window.setTimeout(() => setTouching(false), 1200);
      beginOrbitDrag(
        touchDragPointerId,
        touch.clientX,
        touch.clientY,
        Number.isFinite(tapIndex) ? tapIndex : null,
        "touch",
      );

      if (selectedIndex !== null && target && !target.closest(".erp-orbit-card")) {
        closePreview();
      }
    };

    const handleNativeTouchMove = (event: globalThis.TouchEvent) => {
      if (event.touches.length !== 1) {
        return;
      }
      const touch = event.touches[0];
      moveOrbitDrag(touchDragPointerId, touch.clientX, touch.clientY, () => {
        if (event.cancelable) {
          event.preventDefault();
        }
      });
    };

    const handleNativeTouchEnd = () => {
      finishOrbitDrag(touchDragPointerId);
      setTouching(false);
    };

    root.addEventListener("touchstart", handleNativeTouchStart, { passive: true });
    root.addEventListener("touchmove", handleNativeTouchMove, { passive: false });
    root.addEventListener("touchend", handleNativeTouchEnd, { passive: true });
    root.addEventListener("touchcancel", handleNativeTouchEnd, { passive: true });

    return () => {
      root.removeEventListener("touchstart", handleNativeTouchStart);
      root.removeEventListener("touchmove", handleNativeTouchMove);
      root.removeEventListener("touchend", handleNativeTouchEnd);
      root.removeEventListener("touchcancel", handleNativeTouchEnd);
    };
  }, [selectedIndex, images.length]);

  const cards = useMemo(
    () => {
      const compact = stageWidth < 620;
      const radiusX = compact ? Math.min(360, stageWidth * 0.86) : Math.min(360, stageWidth * 0.42);
      const radiusZ = compact ? 44 : 110;

      return images.map((image, index) => {
        const angle = selectedIndex === null ? phase + index * step : (index - selectedIndex) * step;
        const radians = (angle * Math.PI) / 180;
        const x = Math.sin(radians) * radiusX;
        const z = Math.cos(radians) * radiusZ;
        const frontness = (z + radiusZ) / (radiusZ * 2);
        const selected = selectedIndex === index;
        const compactFrontness = (Math.cos(radians) + 1) / 2;
        const compactVisible = selected || compactFrontness > 0.28;
        const tilt = compact ? -shortestSignedAngle(angle) * 0.08 : -shortestSignedAngle(angle) * 0.34;
        const scale = selected ? (compact ? 0.98 : 1.04) : compact ? 0.74 + compactFrontness * 0.24 : 0.58 + frontness * 0.38;
        const opacity = selected
          ? 1
          : compact
            ? (compactVisible ? Math.max(0.14, Math.min(0.82, (compactFrontness - 0.28) / 0.72)) : 0)
            : 0.36 + frontness * 0.64;
        const zIndex = selected ? 20 : Math.round(5 + frontness * 10);
        const width = "var(--erp-card-base-width)";

        return {
          image,
          index,
          selected,
          style: {
            "--erp-card-x": `${x}px`,
            "--erp-card-z": `${z}px`,
            "--erp-card-tilt": `${tilt}deg`,
            "--erp-card-scale": String(scale),
            "--erp-card-opacity": String(opacity),
            "--erp-card-z-index": String(zIndex),
            "--erp-card-width": width,
          } as CSSProperties,
        };
      });
    },
    [images, phase, selectedIndex, stageWidth, step],
  );

  if (images.length === 0) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={`erp-orbit-carousel${selectedIndex !== null ? " has-preview" : ""}`}
      data-component="ErpOrbitCarousel"
      data-paused={paused ? "true" : "false"}
      data-dragging={dragging ? "true" : "false"}
      data-swipe-enabled={touchDragEnabled ? "true" : "false"}
      data-touch-drag-enabled={touchDragEnabled ? "true" : "false"}
      data-mouse-drag-enabled="true"
      aria-label="VitaFlow ERP screenshot orbit carousel"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && supportsHoverPointer()) {
          setHovering(true);
        }
      }}
      onMouseEnter={() => {
        if (supportsHoverPointer()) {
          setHovering(true);
        }
      }}
      onPointerLeave={handlePointerLeave}
      onMouseLeave={() => handlePointerLeave()}
      onPointerDown={handleRootPointerDown}
      onPointerMove={handleRootPointerMove}
      onPointerUp={settleDrag}
      onPointerCancel={settleDrag}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusWithin(false);
        }
      }}
    >
      <div className="erp-orbit-ring" aria-hidden="true" />
      <div className="erp-orbit-reflection" aria-hidden="true" />
      <div className="erp-orbit-stage" aria-label="VitaFlow ERP screenshot orbit">
        {cards.map(({ image, index, selected, style }) => (
          <button
            className={`erp-orbit-card${selected ? " is-selected" : ""}`}
            key={image.src}
            data-index={index}
            style={style}
            type="button"
            aria-pressed={selected}
            aria-label={`${image.title} ERP preview`}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              if (suppressClickRef.current) {
                event.preventDefault();
                event.stopPropagation();
                suppressClickRef.current = false;
                return;
              }
              selectCard(index);
            }}
            onPointerDown={(event) => {
              if (event.pointerType !== "mouse") {
                return;
              }
            }}
            onPointerUp={(event) => {
              if (event.pointerType !== "mouse") {
                return;
              }
            }}
            onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectCard(index);
              }
            }}
          >
            <span className="erp-orbit-card-label">{image.title}</span>
            <img src={image.src} alt={image.alt} loading={index === 0 ? "eager" : "lazy"} />
          </button>
        ))}
      </div>
      {selectedImage &&
        createPortal(
          <div
            className="erp-preview-viewer"
            role="presentation"
            onClick={closePreviewFromBackdrop}
            onMouseDown={closePreviewFromBackdrop}
            onPointerDown={closePreviewFromBackdrop}
          >
            <div
              className="erp-preview-panel"
              role="dialog"
              aria-modal="true"
              aria-label={`${selectedImage.title} enlarged ERP preview`}
              onClick={stopPreviewEvent}
              onMouseDown={stopPreviewEvent}
              onPointerDown={stopPreviewEvent}
              onTouchStart={stopPreviewEvent}
            >
              <div className="erp-preview-toolbar">
                <span>{selectedImage.title}</span>
                <button
                  className="erp-preview-close"
                  type="button"
                  onPointerUp={closePreviewFromControl}
                  onTouchEnd={closePreviewFromControl}
                  onClick={closePreviewFromControl}
                  aria-label="Close ERP preview"
                >
                  Close
                </button>
              </div>
              <div className="erp-preview-image-frame">
                <img src={selectedImage.src} alt={selectedImage.alt} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
