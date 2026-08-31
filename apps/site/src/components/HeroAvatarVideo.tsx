import { useEffect, useRef, useState } from "react";
import { heroAssets } from "../content/heroAssets";

const desktopMotionMediaQuery = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";
const defaultAvatarTimeRatio = 0.35;
const reducedMotionMediaQuery = "(prefers-reduced-motion: reduce)";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function HeroAvatarVideo({ contextLabel }: { contextLabel: string }) {
  const shellRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previousXRef = useRef<number | null>(null);
  const targetTimeRef = useRef(0);
  const seekRafRef = useRef(0);
  const motionRafRef = useRef(0);
  const durationRef = useRef(0);
  const targetMotionRef = useRef({
    followX: 0,
    followY: 0,
    tiltX: 0,
    tiltY: 0,
    glintX: 58,
    glintY: 34,
  });
  const currentMotionRef = useRef({ ...targetMotionRef.current });
  const [statusLabel, setStatusLabel] = useState("VitaKiosk Asia Assistant");
  const [showStatusLabel, setShowStatusLabel] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setStatusLabel(contextLabel);
  }, [contextLabel]);

  useEffect(() => {
    return () => {
      if (seekRafRef.current) {
        window.cancelAnimationFrame(seekRafRef.current);
      }
      if (motionRafRef.current) {
        window.cancelAnimationFrame(motionRafRef.current);
      }
    };
  }, []);

  const canUseDesktopMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia(desktopMotionMediaQuery).matches &&
    !window.matchMedia(reducedMotionMediaQuery).matches;

  const scheduleSeek = () => {
    if (seekRafRef.current) {
      return;
    }

    const tick = () => {
      seekRafRef.current = 0;
      const video = videoRef.current;
      if (!video || !durationRef.current) {
        return;
      }

      const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      const next = current + (targetTimeRef.current - current) * 0.12;
      if (Math.abs(next - current) > 0.008) {
        video.currentTime = clamp(next, 0, durationRef.current);
        seekRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    seekRafRef.current = window.requestAnimationFrame(tick);
  };

  const scheduleMotion = () => {
    if (motionRafRef.current) {
      return;
    }

    const tick = () => {
      motionRafRef.current = 0;
      const shell = shellRef.current;
      if (!shell) {
        return;
      }

      const current = currentMotionRef.current;
      const target = targetMotionRef.current;
      current.followX += (target.followX - current.followX) * 0.09;
      current.followY += (target.followY - current.followY) * 0.09;
      current.tiltX += (target.tiltX - current.tiltX) * 0.1;
      current.tiltY += (target.tiltY - current.tiltY) * 0.1;
      current.glintX += (target.glintX - current.glintX) * 0.1;
      current.glintY += (target.glintY - current.glintY) * 0.1;

      shell.style.setProperty("--avatar-follow-x", `${current.followX.toFixed(2)}px`);
      shell.style.setProperty("--avatar-follow-y", `${current.followY.toFixed(2)}px`);
      shell.style.setProperty("--avatar-tilt-x", `${current.tiltX.toFixed(3)}deg`);
      shell.style.setProperty("--avatar-tilt-y", `${current.tiltY.toFixed(3)}deg`);
      shell.style.setProperty("--avatar-glint-x", `${current.glintX.toFixed(2)}%`);
      shell.style.setProperty("--avatar-glint-y", `${current.glintY.toFixed(2)}%`);

      const stillMoving =
        Math.abs(target.followX - current.followX) > 0.08 ||
        Math.abs(target.followY - current.followY) > 0.08 ||
        Math.abs(target.tiltX - current.tiltX) > 0.03 ||
        Math.abs(target.tiltY - current.tiltY) > 0.03 ||
        Math.abs(target.glintX - current.glintX) > 0.04 ||
        Math.abs(target.glintY - current.glintY) > 0.04;

      if (stillMoving) {
        motionRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    motionRafRef.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !canUseDesktopMotion()) {
        return;
      }

      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      const normalizedX = clamp(event.clientX / width, 0, 1);
      const normalizedY = clamp(event.clientY / height, 0, 1);

      targetMotionRef.current = {
        followX: (normalizedX - 0.5) * 34,
        followY: (normalizedY - 0.5) * 18,
        tiltX: (0.5 - normalizedY) * 5.5,
        tiltY: (normalizedX - 0.5) * 8.5,
        glintX: 42 + normalizedX * 34,
        glintY: 22 + normalizedY * 28,
      };
      scheduleMotion();

      if (!durationRef.current) {
        previousXRef.current = event.clientX;
        return;
      }

      const previousX = previousXRef.current ?? event.clientX;
      const deltaX = event.clientX - previousX;
      previousXRef.current = event.clientX;
      targetTimeRef.current = clamp(
        targetTimeRef.current + (deltaX / width) * durationRef.current * 0.5,
        durationRef.current * 0.06,
        durationRef.current * 0.94,
      );
      scheduleSeek();
    };

    const resetMotion = () => {
      previousXRef.current = null;
      targetMotionRef.current = {
        followX: 0,
        followY: 0,
        tiltX: 0,
        tiltY: 0,
        glintX: 58,
        glintY: 34,
      };
      scheduleMotion();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", resetMotion);
    window.addEventListener("blur", resetMotion);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", resetMotion);
      window.removeEventListener("blur", resetMotion);
    };
  }, []);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }
    durationRef.current = video.duration;
    targetTimeRef.current = video.duration * defaultAvatarTimeRatio;
    video.currentTime = targetTimeRef.current;

    if (canUseDesktopMotion()) {
      video.pause();
      return;
    }

    void video.play().catch(() => undefined);
  };

  const handleActivate = () => {
    const shell = shellRef.current;
    if (shell) {
      shell.classList.remove("is-pulsing");
      void shell.offsetWidth;
      shell.classList.add("is-pulsing");
      window.setTimeout(() => shell.classList.remove("is-pulsing"), 950);
    }
    setStatusLabel("AI Systems Online");
    setShowStatusLabel(true);
    window.setTimeout(() => {
      setShowStatusLabel(false);
      setStatusLabel(contextLabel);
    }, 1800);
  };

  return (
    <button
      ref={shellRef}
      type="button"
      className={`hero-avatar-video-shell${showStatusLabel ? " is-status-visible" : ""}`}
      aria-label="Interact with VitaKiosk Asia avatar"
      onPointerEnter={() => setStatusLabel(contextLabel)}
      onFocus={() => setStatusLabel(contextLabel)}
      onClick={handleActivate}
      data-scrub-mode="desktop-pointer"
      data-testid="hero-avatar-button"
    >
      <svg className="hero-avatar-filter-defs" aria-hidden="true" focusable="false">
        <filter id="heroAvatarLightKey" colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              -0.48 -0.48 -0.48 0 1.08"
          />
          <feComponentTransfer>
            <feFuncA type="linear" slope="1.7" intercept="-0.08" />
          </feComponentTransfer>
        </filter>
      </svg>
      <span className="hero-avatar-video-rim" aria-hidden="true" />
      {failed ? (
        <span className="hero-avatar-fallback">VitaKiosk Asia Assistant</span>
      ) : (
        <>
          <img
            className="hero-avatar-poster-image"
            src={heroAssets.aiAvatarPosterKeyed}
            alt=""
            aria-hidden="true"
            data-testid="hero-avatar-poster"
          />
          <video
            ref={videoRef}
            data-testid="hero-avatar-video"
            src={heroAssets.aiAvatarVideo}
            poster={heroAssets.aiAvatarPoster}
            muted
            playsInline
            loop
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => setFailed(true)}
          />
        </>
      )}
      <span className="hero-avatar-reflection" aria-hidden="true" />
      <span className="hero-avatar-scanline" aria-hidden="true" />
      <span className="hero-avatar-context" data-testid="hero-avatar-context">
        {statusLabel}
      </span>
    </button>
  );
}
