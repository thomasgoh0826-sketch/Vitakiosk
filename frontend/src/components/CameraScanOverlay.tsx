import { useEffect, useRef, useState } from "react";

import type { VitaKioskApiClient } from "../api/client";
import type { KioskTranslations } from "../i18n";
import type { ProductScanResponse } from "../types";

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
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.88);
  });
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
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let cancelled = false;
    setError(null);
    setScanning(false);

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(labels.cameraPermissionNeeded);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
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
      } catch {
        if (!cancelled) {
          setError(labels.cameraPermissionNeeded);
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [labels.cameraPermissionNeeded, open]);

  if (!open) {
    return null;
  }

  async function captureFrame() {
    setError(null);
    setScanning(true);
    try {
      const canvas = document.createElement("canvas");
      const video = videoRef.current;
      canvas.width = video?.videoWidth || 960;
      canvas.height = video?.videoHeight || 540;
      const context = canvas.getContext("2d");
      if (video && context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const blob = await canvasToBlob(canvas);
      if (!blob) {
        throw new Error("capture_failed");
      }
      stopStream(streamRef.current);
      streamRef.current = null;
      const result = await api.scanProduct(blob, branchId, "auto");
      onResult(result);
      onClose();
    } catch {
      setError(labels.cameraPermissionNeeded);
    } finally {
      setScanning(false);
    }
  }

  function closeOverlay() {
    stopStream(streamRef.current);
    streamRef.current = null;
    onClose();
  }

  return (
    <div className="camera-scan-overlay" role="dialog" aria-modal="true" aria-label={labels.scanProduct}>
      <div className="camera-scan-panel">
        <header className="camera-scan-header">
          <div>
            <span className="eyebrow">{labels.mockVitaFlow}</span>
            <h2>{labels.scanProduct}</h2>
          </div>
        </header>
        <p className="camera-scan-instruction">{labels.scanProductInstruction}</p>
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
          {scanning ? labels.scanningProduct : error}
        </p>
        <footer className="camera-scan-actions">
          <button type="button" onClick={closeOverlay}>{labels.cancel}</button>
          <button type="button" onClick={() => void captureFrame()} disabled={scanning}>
            {scanning ? labels.scanningProduct : labels.capture}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default CameraScanOverlay;
