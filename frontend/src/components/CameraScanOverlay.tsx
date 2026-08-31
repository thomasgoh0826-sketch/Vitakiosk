import { useEffect, useRef, useState } from "react";

import { ApiError, type VitaKioskApiClient } from "../api/client";
import type { KioskTranslations } from "../i18n";
import type { ProductScanResponse } from "../types";

const AUTO_CAPTURE_STABILITY_MS = 600;
const BEST_FRAME_SAMPLE_COUNT = 3;
const BEST_FRAME_SAMPLE_INTERVAL_MS = 120;
const SCAN_RETICLE_INSET_RATIO = 0.25;
const QUALITY_SAMPLE_WIDTH = 128;

export function getCenteredScanCrop(width: number, height: number) {
  const x = Math.round(width * SCAN_RETICLE_INSET_RATIO);
  const y = Math.round(height * SCAN_RETICLE_INSET_RATIO);
  return {
    x,
    y,
    width: width - (x * 2),
    height: height - (y * 2),
  };
}

interface CameraScanOverlayProps {
  open: boolean;
  api: VitaKioskApiClient;
  branchId: string;
  labels: KioskTranslations;
  onClose: () => void;
  onResult: (result: ProductScanResponse) => void;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
  });
}

export function scoreScanFrameQuality(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
) {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) {
    return 0;
  }

  const luminance = new Float32Array(width * height);
  let luminanceTotal = 0;
  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    const value = (rgba[offset] * 0.299)
      + (rgba[offset + 1] * 0.587)
      + (rgba[offset + 2] * 0.114);
    luminance[index] = value;
    luminanceTotal += value;
  }

  let edgeTotal = 0;
  let edgeCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width) + x;
      if (x > 0) {
        edgeTotal += Math.abs(luminance[index] - luminance[index - 1]);
        edgeCount += 1;
      }
      if (y > 0) {
        edgeTotal += Math.abs(luminance[index] - luminance[index - width]);
        edgeCount += 1;
      }
    }
  }

  const averageLuminance = luminanceTotal / luminance.length;
  const exposureScore = 1 - Math.min(1, Math.abs(averageLuminance - 128) / 128);
  const edgeScore = edgeCount ? edgeTotal / edgeCount : 0;
  return edgeScore + (exposureScore * 32);
}

function waitForNextSample() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, BEST_FRAME_SAMPLE_INTERVAL_MS);
  });
}

async function captureScoredFrame(video: HTMLVideoElement) {
  const frameWidth = video.videoWidth || 960;
  const frameHeight = video.videoHeight || 540;
  const crop = getCenteredScanCrop(frameWidth, frameHeight);
  const canvas = document.createElement("canvas");
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("capture_failed");
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    video,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const qualityCanvas = document.createElement("canvas");
  const qualityHeight = Math.max(1, Math.round(
    QUALITY_SAMPLE_WIDTH * (crop.height / crop.width),
  ));
  qualityCanvas.width = QUALITY_SAMPLE_WIDTH;
  qualityCanvas.height = qualityHeight;
  const qualityContext = qualityCanvas.getContext("2d");
  let score = 0;
  if (qualityContext) {
    qualityContext.drawImage(
      video,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      qualityCanvas.width,
      qualityCanvas.height,
    );
    if (typeof qualityContext.getImageData === "function") {
      const imageData = qualityContext.getImageData(
        0,
        0,
        qualityCanvas.width,
        qualityCanvas.height,
      );
      score = scoreScanFrameQuality(
        imageData.data,
        qualityCanvas.width,
        qualityCanvas.height,
      );
    }
  }

  const blob = await canvasToBlob(canvas);
  if (!blob) {
    throw new Error("capture_failed");
  }
  return { blob, score };
}

async function captureBestFrame(video: HTMLVideoElement) {
  let bestFrame: Awaited<ReturnType<typeof captureScoredFrame>> | null = null;
  for (let index = 0; index < BEST_FRAME_SAMPLE_COUNT; index += 1) {
    const frame = await captureScoredFrame(video);
    if (!bestFrame || frame.score > bestFrame.score) {
      bestFrame = frame;
    }
    if (index < BEST_FRAME_SAMPLE_COUNT - 1) {
      await waitForNextSample();
    }
  }
  if (!bestFrame) {
    throw new Error("capture_failed");
  }
  return bestFrame.blob;
}

function CameraScanOverlay({
  open,
  api,
  branchId,
  labels,
  onClose,
  onResult,
}: CameraScanOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoCaptureTimerRef = useRef<number | null>(null);
  const requestPendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pendingResult, setPendingResult] = useState<ProductScanResponse | null>(null);
  const [scanStatus, setScanStatus] = useState<
    "looking" | "hold_steady" | "searching" | "retry" | "confirm"
  >("looking");

  function clearTimers() {
    if (autoCaptureTimerRef.current !== null) {
      window.clearTimeout(autoCaptureTimerRef.current);
      autoCaptureTimerRef.current = null;
    }
  }

  function closeOverlay() {
    clearTimers();
    requestPendingRef.current = false;
    setPendingResult(null);
    stopStream(streamRef.current);
    streamRef.current = null;
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let cancelled = false;
    setError(null);
    setScanning(false);
    setPendingResult(null);
    setScanStatus("looking");
    requestPendingRef.current = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(labels.cameraPermissionNeeded);
        setScanStatus("retry");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1_920 },
            height: { ideal: 1_080 },
          },
          audio: false,
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Some test/runtime environments expose video streams without
            // implementing playback. The scan still works from the captured
            // stream frame, so keep the camera overlay usable.
          }
        }
        setScanStatus("hold_steady");
      } catch {
        if (!cancelled) {
          setError(labels.cameraPermissionNeeded);
          setScanStatus("retry");
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      clearTimers();
      requestPendingRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [labels.cameraPermissionNeeded, open]);

  useEffect(() => {
    if (!open || error || scanStatus !== "hold_steady" || requestPendingRef.current) {
      return undefined;
    }

    autoCaptureTimerRef.current = window.setTimeout(() => {
      autoCaptureTimerRef.current = null;
      void captureFrame();
    }, AUTO_CAPTURE_STABILITY_MS);

    return () => {
      if (autoCaptureTimerRef.current !== null) {
        window.clearTimeout(autoCaptureTimerRef.current);
        autoCaptureTimerRef.current = null;
      }
    };
  }, [error, open, scanStatus]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeOverlay();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) {
    return null;
  }

  async function captureFrame() {
    if (requestPendingRef.current) {
      return;
    }
    setError(null);
    clearTimers();
    requestPendingRef.current = true;
    setScanning(true);
    setScanStatus("searching");
    try {
      const video = videoRef.current;
      if (!video) {
        throw new Error("capture_failed");
      }
      const blob = await captureBestFrame(video);
      const result = await api.scanProduct(blob, branchId, "auto");

      clearTimers();
      if (result.candidates.length > 1) {
        setPendingResult(null);
        setError(
          "I couldn't identify one product confidently. Keep one label close and scan again.",
        );
        setScanStatus("retry");
        return;
      }
      const topCandidate = result.candidates[0];
      const isConfirmedBarcode = Boolean(result.scanSignals.barcode)
        && !result.requiresConfirmation
        && result.candidates.length === 1;

      if (topCandidate && isConfirmedBarcode) {
        onResult(result);
        closeOverlay();
        return;
      }

      if (topCandidate) {
        // Agnes returns identity signals only; VitaFlow supplies every product
        // fact. One real provider result is enough to present a suggestion,
        // but the user must still confirm it before the kiosk changes product.
        setPendingResult(result);
        setScanStatus("confirm");
        return;
      }

      setError(result.message || "No VitaFlow match yet. Please scan again or search manually.");
      setScanStatus("retry");
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 503
          ? cause.message
          : "Scan could not complete. Keep the product in view and try again.",
      );
      setScanStatus("retry");
    } finally {
      requestPendingRef.current = false;
      setScanning(false);
    }
  }

  function statusCopy() {
    if (error) {
      return error;
    }
    if (scanStatus === "searching") {
      return labels.scanningProduct;
    }
    if (scanStatus === "hold_steady") {
      return "Hold steady";
    }
    if (scanStatus === "retry") {
      return "No match yet. Try scanning again or search manually.";
    }
    if (scanStatus === "confirm") {
      return labels.doYouMeanThisItem;
    }
    return "Looking for product";
  }

  return (
    <div
      className="camera-scan-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={labels.scanProduct}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeOverlay();
        }
      }}
    >
      <div className="camera-scan-panel" onMouseDown={(event) => event.stopPropagation()}>
        <header className="camera-scan-header">
          <div>
            <span className="eyebrow">VitaFlow product scan</span>
            <h2>{labels.scanProduct}</h2>
          </div>
        </header>
        <p className="camera-scan-instruction">
          Keep one product label inside the guide. You can move naturally while it scans.
        </p>
        <div className="camera-preview-frame">
          <video
            ref={videoRef}
            className="camera-preview"
            muted
            playsInline
            aria-label={labels.scanProduct}
          />
          <div className="camera-scan-reticle" aria-hidden="true" />
        </div>
        <p className="camera-scan-status" aria-live="polite">
          {statusCopy()}
        </p>
        {scanStatus === "confirm" && pendingResult ? (
          <div className="camera-scan-confirmation" aria-label={labels.doYouMeanThisItem}>
            {pendingResult.candidates.slice(0, 1).map((candidate) => (
              <button
                type="button"
                key={`${candidate.product.id}-${candidate.matchedText ?? "vision"}`}
                onClick={() => {
                  onResult({
                    ...pendingResult,
                    candidates: [candidate],
                    requiresConfirmation: false,
                  });
                  closeOverlay();
                }}
                aria-label={`Use ${candidate.product.name}`}
              >
                {candidate.product.name}
              </button>
            ))}
          </div>
        ) : null}
        {scanStatus === "retry" || scanStatus === "confirm" ? (
          <footer className="camera-scan-actions">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setPendingResult(null);
                setScanStatus("hold_steady");
              }}
              disabled={scanning}
            >
              Scan again
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export default CameraScanOverlay;
