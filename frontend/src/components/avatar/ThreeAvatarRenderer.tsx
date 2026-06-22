import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Color, type Group, type Material, type Mesh, type Object3D } from "three";

import type { AvatarState } from "../../types";
import type { AvatarRendererProps } from "./AvatarRenderer";
import { getDefaultAvatarModelUrl } from "./AvatarModel";


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

function setModelMaterialGlow(root: Object3D, state: AvatarState, audioActivity: number) {
  const visual = STATE_VISUALS[state];
  const activity = clamp01(audioActivity);
  const emissiveColor = new Color(visual.primary);

  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh || !mesh.material) {
      return;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material: Material) => {
      if ("emissive" in material && material.emissive instanceof Color) {
        material.emissive.copy(emissiveColor);
      }
      if ("emissiveIntensity" in material) {
        material.emissiveIntensity = 0.18 + activity * 0.42;
      }
      if ("metalness" in material) {
        material.metalness = Math.max(Number(material.metalness ?? 0), 0.28);
      }
      if ("roughness" in material) {
        material.roughness = Math.min(Number(material.roughness ?? 0.55), 0.48);
      }
      material.needsUpdate = true;
    });
  });
}

interface HumanoidAvatarSceneProps {
  state: AvatarState;
  audioActivity: number;
  reducedMotion: boolean;
  modelUrl: string;
}

function HumanoidAvatarScene({
  state,
  audioActivity,
  reducedMotion,
  modelUrl,
}: HumanoidAvatarSceneProps) {
  const modelGroup = useRef<Group>(null);
  const orbit = useRef<Group>(null);
  const { scene, animations } = useGLTF(modelUrl);
  const visual = STATE_VISUALS[state];
  const activity = clamp01(audioActivity);

  useEffect(() => {
    setModelMaterialGlow(scene, state, activity);
  }, [activity, scene, state]);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const speakingPulse = state === "speaking" ? activity * 0.055 : 0;
    const alertPulse = state === "error" || state === "pharmacist_escalation"
      ? Math.sin(elapsed * 3.2) * 0.025
      : 0;
    const breathing = Math.sin(elapsed * 1.18) * 0.018;

    if (modelGroup.current) {
      modelGroup.current.rotation.y = Math.sin(elapsed * 0.34) * 0.09;
      modelGroup.current.position.y = -0.55 + breathing;
      modelGroup.current.scale.setScalar(1 + speakingPulse + alertPulse);
    }

    if (orbit.current) {
      orbit.current.rotation.z += delta * visual.speed * 1.6;
      orbit.current.rotation.y = Math.sin(elapsed * 0.48) * 0.16;
    }
  });

  return (
    <>
      <ambientLight intensity={0.56} />
      <spotLight
        angle={0.44}
        color={visual.primary}
        intensity={2.8}
        penumbra={0.72}
        position={[1.8, 3.6, 3.6]}
      />
      <pointLight color={visual.secondary} intensity={1.6} position={[-2.4, 1.2, 2.6]} />
      <pointLight color={visual.danger} intensity={state === "idle" ? 0.16 : 0.72} position={[0, -0.8, 2.8]} />

      <group ref={modelGroup}>
        <primitive object={scene} scale={1.26} rotation={[0, 0, 0]} />
      </group>

      <group ref={orbit}>
        <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.08, 0.012, 12, 96]} />
          <meshBasicMaterial
            color={visual.primary}
            opacity={state === "listening" || state === "speaking" ? 0.82 : 0.38}
            transparent
          />
        </mesh>
        <mesh position={[0, -0.42, 0]} rotation={[Math.PI / 2.4, Math.PI / 5, 0]}>
          <torusGeometry args={[1.48, 0.01, 12, 112]} />
          <meshBasicMaterial color={visual.secondary} opacity={0.36} transparent />
        </mesh>
      </group>

      <mesh position={[0, -1.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 1.16, 96]} />
        <meshBasicMaterial color={visual.primary} opacity={0.22 + activity * 0.24} transparent />
      </mesh>

      <mesh position={[0, 1.58, 0.18]} scale={[0.42 + activity * 0.18, 0.028, 0.028]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={state === "error" || state === "pharmacist_escalation" ? visual.danger : visual.primary}
          opacity={0.72}
          transparent
        />
      </mesh>

      <group visible={animations.length > 0} />
    </>
  );
}

interface AvatarSceneBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface AvatarSceneBoundaryState {
  hasError: boolean;
}

class AvatarSceneBoundary extends Component<AvatarSceneBoundaryProps, AvatarSceneBoundaryState> {
  state: AvatarSceneBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AvatarSceneBoundaryState {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
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

interface ThreeAvatarRendererProps extends AvatarRendererProps {
  avatarModelUrl?: string | null;
}

function ThreeAvatarRenderer({
  state,
  audioActivity,
  avatarModelUrl = getDefaultAvatarModelUrl(),
}: ThreeAvatarRendererProps) {
  const reducedMotion = usePrefersReducedMotion();
  const webglAvailable = useMemo(canUseWebGL, []);
  const visual = STATE_VISUALS[state];
  const activity = clamp01(audioActivity);
  const stateLabel = STATE_LABELS[state];
  const resolvedAvatarModelUrl = avatarModelUrl ?? null;
  const hasAvatarModel = resolvedAvatarModelUrl !== null;
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
      data-avatar-model={hasAvatarModel ? "glb" : "abstract-fallback"}
      data-avatar-model-url={resolvedAvatarModelUrl ?? undefined}
      data-reduced-motion={String(reducedMotion)}
      data-webgl={webglAvailable ? "available" : "fallback"}
      role="img"
      aria-label={`Three.js ${hasAvatarModel ? "humanoid" : "holographic"} AI avatar: ${stateLabel}`}
      style={style}
    >
      <div className="three-avatar-canvas-shell" aria-hidden="true">
        {webglAvailable ? (
          <Canvas
            camera={{ position: [0, 0.12, 4.5], fov: 40 }}
            dpr={[1, 1.45]}
            frameloop={reducedMotion ? "demand" : "always"}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          >
            {hasAvatarModel ? (
              <AvatarSceneBoundary
                fallback={
                  <HologramScene
                    state={state}
                    audioActivity={activity}
                    reducedMotion={reducedMotion}
                  />
                }
              >
                <Suspense
                  fallback={
                    <HologramScene
                      state={state}
                      audioActivity={activity}
                      reducedMotion={reducedMotion}
                    />
                  }
                >
                  <HumanoidAvatarScene
                    state={state}
                    audioActivity={activity}
                    reducedMotion={reducedMotion}
                    modelUrl={resolvedAvatarModelUrl}
                  />
                </Suspense>
              </AvatarSceneBoundary>
            ) : (
              <HologramScene
                state={state}
                audioActivity={activity}
                reducedMotion={reducedMotion}
              />
            )}
          </Canvas>
        ) : (
          <StaticHologram state={state} audioActivity={activity} />
        )}
      </div>
      <span className="three-avatar-state-chip" aria-hidden="true">
        {state === "pharmacist_escalation"
          ? "Safety handoff"
          : hasAvatarModel
            ? "GLB avatar"
            : state.replace("_", " ")}
      </span>
    </div>
  );
}

export default ThreeAvatarRenderer;
