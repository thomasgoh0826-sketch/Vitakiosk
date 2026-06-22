import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Group } from "three";

import type { AvatarState } from "../../types";
import type { AvatarRendererProps } from "./AvatarRenderer";


const STATE_LABELS: Record<AvatarState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Something went wrong",
  pharmacist_escalation: "Pharmacist requested",
};

const STATE_VISUALS: Record<
  AvatarState,
  {
    primary: string;
    secondary: string;
    danger: string;
    intensity: number;
    speed: number;
  }
> = {
  idle: {
    primary: "#42f5ff",
    secondary: "#9b6cff",
    danger: "#ff536d",
    intensity: 0.7,
    speed: 0.28,
  },
  listening: {
    primary: "#42f5ff",
    secondary: "#72fff1",
    danger: "#ff536d",
    intensity: 1,
    speed: 0.72,
  },
  thinking: {
    primary: "#9b6cff",
    secondary: "#42f5ff",
    danger: "#ff536d",
    intensity: 0.92,
    speed: 1.05,
  },
  speaking: {
    primary: "#42f5ff",
    secondary: "#b78cff",
    danger: "#ff536d",
    intensity: 1.12,
    speed: 0.88,
  },
  error: {
    primary: "#ff536d",
    secondary: "#ff9b9b",
    danger: "#ff536d",
    intensity: 0.72,
    speed: 0.2,
  },
  pharmacist_escalation: {
    primary: "#ff536d",
    secondary: "#ffc857",
    danger: "#ff536d",
    intensity: 0.9,
    speed: 0.42,
  },
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function canUseWebGL(): boolean {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !("WebGLRenderingContext" in window)
  ) {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);
    updateReducedMotion();

    mediaQuery.addEventListener?.("change", updateReducedMotion);
    mediaQuery.addListener?.(updateReducedMotion);

    return () => {
      mediaQuery.removeEventListener?.("change", updateReducedMotion);
      mediaQuery.removeListener?.(updateReducedMotion);
    };
  }, []);

  return reducedMotion;
}

interface HologramSceneProps {
  state: AvatarState;
  audioActivity: number;
  reducedMotion: boolean;
}

function HologramScene({ state, audioActivity, reducedMotion }: HologramSceneProps) {
  const avatar = useRef<Group>(null);
  const rings = useRef<Group>(null);
  const visual = STATE_VISUALS[state];
  const activity = clamp01(audioActivity);
  const particles = useMemo(
    () =>
      Array.from({ length: reducedMotion ? 14 : 28 }, (_, index) => {
        const angle = index * 2.399963229728653;
        const radius = 1.12 + (index % 7) * 0.13;
        const height = -0.82 + (index % 9) * 0.2;
        return {
          key: `particle-${index}`,
          position: [
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius * 0.42,
          ] as [number, number, number],
          scale: 0.018 + (index % 4) * 0.004 + activity * 0.014,
        };
      }),
    [activity, reducedMotion],
  );

  useFrame(({ clock }, delta) => {
    if (reducedMotion) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const speakingPulse = state === "speaking" ? activity * 0.18 : 0;
    const breathingPulse = Math.sin(elapsed * 1.4) * 0.035 * visual.intensity;

    if (avatar.current) {
      avatar.current.rotation.y += delta * visual.speed;
      avatar.current.scale.setScalar(1 + breathingPulse + speakingPulse);
    }

    if (rings.current) {
      rings.current.rotation.z -= delta * visual.speed * 1.8;
      rings.current.rotation.x = Math.sin(elapsed * 0.52) * 0.12;
    }
  });

  const coreScale = 0.92 + (state === "speaking" ? activity * 0.22 : 0);
  const ringOpacity = state === "listening" || state === "speaking" ? 0.72 : 0.46;
  const alertOpacity = state === "error" || state === "pharmacist_escalation" ? 0.48 : 0.14;

  return (
    <>
      <ambientLight intensity={0.42} />
      <pointLight color={visual.primary} intensity={1.8} position={[2.4, 2, 2.8]} />
      <pointLight color={visual.secondary} intensity={1.2} position={[-2.2, -1.5, 2.4]} />

      <group ref={avatar}>
        <mesh scale={coreScale}>
          <icosahedronGeometry args={[0.78, 2]} />
          <meshStandardMaterial
            color={visual.secondary}
            emissive={visual.primary}
            emissiveIntensity={0.65 + activity * 0.7}
            metalness={0.38}
            opacity={0.78}
            roughness={0.18}
            transparent
          />
        </mesh>
        <mesh scale={1.12}>
          <sphereGeometry args={[0.78, 32, 32]} />
          <meshBasicMaterial color={visual.primary} opacity={0.16} transparent wireframe />
        </mesh>
      </group>

      <group ref={rings}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.28, 0.012, 12, 96]} />
          <meshBasicMaterial color={visual.primary} opacity={ringOpacity} transparent />
        </mesh>
        <mesh rotation={[Math.PI / 2.7, Math.PI / 4, 0]}>
          <torusGeometry args={[1.58, 0.01, 12, 96]} />
          <meshBasicMaterial color={visual.secondary} opacity={0.38} transparent />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 2]}>
          <torusGeometry args={[1.88, 0.008, 12, 112]} />
          <meshBasicMaterial color={visual.danger} opacity={alertOpacity} transparent />
        </mesh>
      </group>

      <mesh position={[0, -1.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.15, 96]} />
        <meshBasicMaterial color={visual.primary} opacity={0.18 + activity * 0.24} transparent />
      </mesh>

      <group>
        {particles.map((particle) => (
          <mesh
            key={particle.key}
            position={particle.position}
            scale={particle.scale}
          >
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color={visual.primary} opacity={0.54} transparent />
          </mesh>
        ))}
      </group>
    </>
  );
}

interface StaticHologramProps {
  state: AvatarState;
  audioActivity: number;
}

function StaticHologram({ state, audioActivity }: StaticHologramProps) {
  const activity = clamp01(audioActivity);
  const bars = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        height: `${18 + ((index * 7) % 28) + activity * 24}px`,
        delay: `${index * 45}ms`,
      })),
    [activity],
  );

  return (
    <div className={`three-avatar-fallback three-avatar-fallback-${state}`} aria-hidden="true">
      <span className="three-avatar-grid" />
      <span className="three-avatar-ring three-avatar-ring-outer" />
      <span className="three-avatar-ring three-avatar-ring-middle" />
      <span className="three-avatar-core" />
      <span className="three-avatar-scan" />
      <span className="three-avatar-safety-triangle" />
      <div className="three-avatar-wave">
        {bars.map((bar, index) => (
          <span
            key={index}
            style={{ "--bar-height": bar.height, "--bar-delay": bar.delay } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function ThreeAvatarRenderer({ state, audioActivity }: AvatarRendererProps) {
  const reducedMotion = usePrefersReducedMotion();
  const webglAvailable = useMemo(canUseWebGL, []);
  const visual = STATE_VISUALS[state];
  const activity = clamp01(audioActivity);
  const stateLabel = STATE_LABELS[state];
  const style = {
    "--three-avatar-primary": visual.primary,
    "--three-avatar-secondary": visual.secondary,
    "--three-avatar-danger": visual.danger,
    "--three-avatar-activity": activity,
    "--three-avatar-core-scale": 1 + activity * 0.18,
  } as CSSProperties;

  return (
    <div
      className={`three-avatar avatar-render-${state}`}
      data-state={state}
      data-avatar-renderer="threejs"
      data-reduced-motion={String(reducedMotion)}
      data-webgl={webglAvailable ? "available" : "fallback"}
      role="img"
      aria-label={`Three.js holographic AI avatar: ${stateLabel}`}
      style={style}
    >
      <div className="three-avatar-canvas-shell" aria-hidden="true">
        {webglAvailable ? (
          <Canvas
            camera={{ position: [0, 0, 4.6], fov: 42 }}
            dpr={[1, 1.45]}
            frameloop={reducedMotion ? "demand" : "always"}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          >
            <HologramScene
              state={state}
              audioActivity={activity}
              reducedMotion={reducedMotion}
            />
          </Canvas>
        ) : (
          <StaticHologram state={state} audioActivity={activity} />
        )}
      </div>
      <span className="three-avatar-state-chip" aria-hidden="true">
        {state === "pharmacist_escalation" ? "Safety handoff" : state.replace("_", " ")}
      </span>
    </div>
  );
}

export default ThreeAvatarRenderer;
