import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
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
import {
  Color,
  type Group,
  type Material,
  type Mesh,
  type Object3D,
} from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { useAvatarIdleMotion } from "../../hooks/useAvatarIdleMotion";
import { useAvatarLipSync } from "../../hooks/useAvatarLipSync";
import type { AvatarState } from "../../types";
import type { AvatarRendererProps } from "./AvatarRenderer";
import { getDefaultVrmAvatarModelUrl } from "./AvatarModel";


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
    chip: string;
  }
> = {
  idle: {
    primary: "#42f5ff",
    secondary: "#9b6cff",
    danger: "#ff536d",
    intensity: 0.72,
    speed: 0.34,
    chip: "Relaxed",
  },
  listening: {
    primary: "#42f5ff",
    secondary: "#74fff2",
    danger: "#ff536d",
    intensity: 1.05,
    speed: 0.9,
    chip: "Attentive",
  },
  thinking: {
    primary: "#9b6cff",
    secondary: "#42f5ff",
    danger: "#ff536d",
    intensity: 0.96,
    speed: 1.12,
    chip: "Focused",
  },
  speaking: {
    primary: "#42f5ff",
    secondary: "#b78cff",
    danger: "#ff536d",
    intensity: 1.14,
    speed: 0.92,
    chip: "Speaking",
  },
  error: {
    primary: "#ff536d",
    secondary: "#ff9b9b",
    danger: "#ff536d",
    intensity: 0.78,
    speed: 0.24,
    chip: "Concerned",
  },
  pharmacist_escalation: {
    primary: "#ff536d",
    secondary: "#ffc857",
    danger: "#ff536d",
    intensity: 0.96,
    speed: 0.38,
    chip: "Safety handoff",
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

function setVrmMaterialGlow(root: Object3D, state: AvatarState, audioActivity: number) {
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
        material.emissive.lerp(emissiveColor, 0.28);
      }
      if ("emissiveIntensity" in material) {
        material.emissiveIntensity = Math.max(
          Number(material.emissiveIntensity ?? 0),
          0.14 + activity * 0.24,
        );
      }
      if ("opacity" in material && typeof material.opacity === "number") {
        material.opacity = Math.max(material.opacity, 0.96);
      }
      material.needsUpdate = true;
    });
  });
}

interface VrmLoaderResult extends GLTF {
  userData: GLTF["userData"] & {
    vrm?: VRM;
  };
}

function useVrmModel(modelUrl: string): VRM {
  const gltf = useLoader(GLTFLoader, modelUrl, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  }) as VrmLoaderResult;

  const vrm = gltf.userData.vrm;
  if (!vrm) {
    throw new Error("Loaded model does not contain a VRM avatar");
  }

  return vrm;
}

interface VrmCharacterSceneProps {
  state: AvatarState;
  audioActivity: number;
  reducedMotion: boolean;
  modelUrl: string;
}

function VrmFullBodyCamera() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0.8, 4.2);
    camera.lookAt(0, -0.34, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function VrmCharacterScene({
  state,
  audioActivity,
  reducedMotion,
  modelUrl,
}: VrmCharacterSceneProps) {
  const root = useRef<Group>(null);
  const scanner = useRef<Group>(null);
  const vrm = useVrmModel(modelUrl);
  const visual = STATE_VISUALS[state];
  const activity = clamp01(audioActivity);

  useEffect(() => {
    VRMUtils.rotateVRM0(vrm);
  }, [vrm]);

  useEffect(() => {
    setVrmMaterialGlow(vrm.scene, state, activity);
  }, [activity, state, vrm]);

  useAvatarIdleMotion({ reducedMotion, rootRef: root, state, vrm });
  useAvatarLipSync({ audioActivity: activity, state, vrm });

  useFrame(({ clock }, delta) => {
    vrm.update(delta);

    const elapsed = clock.getElapsedTime();
    if (reducedMotion) {
      return;
    }

    if (scanner.current) {
      scanner.current.rotation.z += delta * visual.speed * 1.7;
      scanner.current.rotation.y = Math.sin(elapsed * 0.5) * 0.22;
    }
  });

  return (
    <>
      <ambientLight intensity={1.05} />
      <hemisphereLight color="#e9fbff" groundColor="#2b145c" intensity={1.85} />
      <directionalLight color="#f7feff" intensity={2.3} position={[0, 1.9, 2.9]} />
      <spotLight
        angle={0.46}
        color="#f4feff"
        intensity={4.8}
        penumbra={0.82}
        position={[0.4, 2.45, 3.1]}
      />
      <pointLight color={visual.primary} intensity={2.4} position={[-1.8, 1.5, 1.8]} />
      <pointLight color={visual.secondary} intensity={2.2} position={[1.7, 1.1, -1.4]} />
      <pointLight
        color={visual.danger}
        intensity={state === "error" || state === "pharmacist_escalation" ? 1.35 : 0.18}
        position={[0, 0.4, 2.6]}
      />

      <group ref={root} scale={2.18} rotation={[0, 0, 0]} position={[0, -0.86, 0]}>
        <primitive object={vrm.scene} />
      </group>

      <group ref={scanner} position={[0, -0.12, -1.52]} scale={[1.78, 2.18, 1]}>
        <mesh rotation={[Math.PI / 2.08, 0, 0]}>
          <torusGeometry args={[1.08, 0.008, 12, 144]} />
          <meshBasicMaterial
            color={visual.primary}
            opacity={state === "listening" || state === "speaking" ? 0.24 : 0.14}
            depthTest
            depthWrite={false}
            transparent
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.65, Math.PI / 9, 0]}>
          <torusGeometry args={[1.32, 0.006, 12, 144]} />
          <meshBasicMaterial
            color={visual.secondary}
            opacity={0.12}
            depthTest
            depthWrite={false}
            transparent
          />
        </mesh>
      </group>

      <mesh position={[0, -1.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.38, 96]} />
        <meshBasicMaterial color={visual.primary} opacity={0.22 + activity * 0.28} transparent />
      </mesh>

      <mesh position={[0, 1.18, 0.24]} scale={[0.32 + activity * 0.2, 0.024, 0.024]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={state === "error" || state === "pharmacist_escalation" ? visual.danger : visual.primary}
          opacity={0.78}
          transparent
        />
      </mesh>
    </>
  );
}

interface VrmFallbackSceneProps {
  state: AvatarState;
  audioActivity: number;
  reducedMotion: boolean;
}

function VrmFallbackScene({ state, audioActivity, reducedMotion }: VrmFallbackSceneProps) {
  const core = useRef<Group>(null);
  const visual = STATE_VISUALS[state];
  const activity = clamp01(audioActivity);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) {
      return;
    }
    const elapsed = clock.getElapsedTime();
    if (core.current) {
      core.current.rotation.y += delta * visual.speed;
      core.current.position.y = Math.sin(elapsed * 1.1) * 0.035;
      core.current.scale.setScalar(1 + activity * 0.16);
    }
  });

  return (
    <>
      <ambientLight intensity={0.52} />
      <pointLight color={visual.primary} intensity={2.2} position={[1.8, 2.2, 2.8]} />
      <pointLight color={visual.secondary} intensity={1.4} position={[-2, -1.4, 2.4]} />
      <group ref={core}>
        <mesh>
          <icosahedronGeometry args={[0.78, 2]} />
          <meshStandardMaterial
            color={visual.secondary}
            emissive={visual.primary}
            emissiveIntensity={0.62 + activity * 0.55}
            opacity={0.82}
            transparent
          />
        </mesh>
        <mesh scale={1.2}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshBasicMaterial color={visual.primary} opacity={0.16} transparent wireframe />
        </mesh>
      </group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.32, 0.012, 12, 96]} />
        <meshBasicMaterial color={visual.primary} opacity={0.42} transparent />
      </mesh>
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

interface StaticVrmFallbackProps {
  state: AvatarState;
  audioActivity: number;
}

function StaticVrmFallback({ state, audioActivity }: StaticVrmFallbackProps) {
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
    <div className={`three-avatar-fallback vrm-avatar-fallback three-avatar-fallback-${state}`} aria-hidden="true">
      <span className="three-avatar-grid" />
      <span className="three-avatar-ring three-avatar-ring-outer" />
      <span className="three-avatar-ring three-avatar-ring-middle" />
      <span className="three-avatar-core" />
      <span className="three-avatar-scan" />
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

interface VrmAvatarRendererProps extends AvatarRendererProps {
  vrmModelUrl?: string | null;
}

function VrmAvatarRenderer({
  state,
  audioActivity,
  vrmModelUrl = getDefaultVrmAvatarModelUrl(),
}: VrmAvatarRendererProps) {
  const reducedMotion = usePrefersReducedMotion();
  const webglAvailable = useMemo(canUseWebGL, []);
  const visual = STATE_VISUALS[state];
  const activity = clamp01(audioActivity);
  const stateLabel = STATE_LABELS[state];
  const resolvedVrmModelUrl = vrmModelUrl ?? null;
  const hasVrmModel = resolvedVrmModelUrl !== null;
  const usesPortraitStage = hasVrmModel;
  const style = {
    "--three-avatar-primary": visual.primary,
    "--three-avatar-secondary": visual.secondary,
    "--three-avatar-danger": visual.danger,
    "--three-avatar-activity": activity,
    "--three-avatar-core-scale": 1 + activity * 0.18,
  } as CSSProperties;

  return (
    <div
      className={
        usesPortraitStage
          ? `vrm-avatar-portrait vrm-avatar avatar-render-${state}`
          : `three-avatar vrm-avatar avatar-render-${state}`
      }
      data-state={state}
      data-avatar-renderer="vrm"
      data-avatar-model={hasVrmModel ? "vrm" : "fallback"}
      data-avatar-framing={usesPortraitStage ? "full-body" : "fallback"}
      data-avatar-crop={usesPortraitStage ? "full-body" : "fallback"}
      data-avatar-stage={usesPortraitStage ? "full-body-chamber" : "abstract-fallback"}
      data-camera-target={usesPortraitStage ? "full-body" : "fallback"}
      data-avatar-orbit-layer={usesPortraitStage ? "background" : "fallback"}
      data-avatar-model-url={resolvedVrmModelUrl ?? undefined}
      data-reduced-motion={String(reducedMotion)}
      data-webgl={webglAvailable ? "available" : "fallback"}
      role="img"
      aria-label={`VRM ${hasVrmModel ? "character" : "fallback"} AI avatar: ${stateLabel}`}
      style={style}
    >
      <div
        className={usesPortraitStage ? "vrm-avatar-portrait-shell" : "three-avatar-canvas-shell"}
        aria-hidden="true"
      >
        {webglAvailable ? (
          <Canvas
            camera={{ position: [0, 0.8, 4.2], fov: 36 }}
            dpr={[1, 1.35]}
            frameloop={reducedMotion ? "demand" : "always"}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
          >
            {hasVrmModel ? <VrmFullBodyCamera /> : null}
            {hasVrmModel ? (
              <AvatarSceneBoundary
                fallback={
                  <VrmFallbackScene
                    state={state}
                    audioActivity={activity}
                    reducedMotion={reducedMotion}
                  />
                }
              >
                <Suspense
                  fallback={
                    <VrmFallbackScene
                      state={state}
                      audioActivity={activity}
                      reducedMotion={reducedMotion}
                    />
                  }
                >
                  <VrmCharacterScene
                    state={state}
                    audioActivity={activity}
                    reducedMotion={reducedMotion}
                    modelUrl={resolvedVrmModelUrl}
                  />
                </Suspense>
              </AvatarSceneBoundary>
            ) : (
              <VrmFallbackScene
                state={state}
                audioActivity={activity}
                reducedMotion={reducedMotion}
              />
            )}
          </Canvas>
        ) : (
          <StaticVrmFallback state={state} audioActivity={activity} />
        )}
      </div>
    </div>
  );
}

export default VrmAvatarRenderer;
