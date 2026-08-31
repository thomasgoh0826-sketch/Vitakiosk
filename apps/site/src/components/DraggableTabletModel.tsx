import { useEffect, useRef, useState } from "react";
import { DemoMedia, vitakioskTabletModel } from "../content/demoAssets";

type ThreeModule = typeof import("three");
type Object3D = import("three").Object3D;
type MeshStandardMaterial = import("three").MeshStandardMaterial;

interface DraggableShowcaseModelProps {
  modelAsset?: DemoMedia;
  variant?: "tablet" | "kiosk";
  label?: string;
  modelRotationY?: number;
  desktopCameraZ?: number;
  mobileCameraZ?: number;
  scaleTarget?: number;
  modelOffsetY?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function disposeObject(object: Object3D) {
  object.traverse((child) => {
    const mesh = child as Object3D & {
      geometry?: { dispose: () => void };
      material?: { dispose: () => void } | Array<{ dispose: () => void }>;
    };
    mesh.geometry?.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) => material.dispose());
    } else {
      mesh.material?.dispose();
    }
  });
}

export function DraggableShowcaseModel({
  modelAsset = vitakioskTabletModel,
  variant = "tablet",
  label = "3D VitaKiosk model",
  modelRotationY = -Math.PI / 2,
  desktopCameraZ = 3.35,
  mobileCameraZ = 4.8,
  scaleTarget = 2.25,
  modelOffsetY = -0.02,
}: DraggableShowcaseModelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    const host = hostRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const runningInTest = import.meta.env.MODE === "test";

    if (!host || reducedMotion || runningInTest) {
      setStatus("fallback");
      return undefined;
    }

    let cancelled = false;
    let frameId = 0;
    let cleanupRenderer: (() => void) | undefined;

    Promise.all([import("three"), import("three/examples/jsm/loaders/GLTFLoader.js")])
      .then(([THREE, { GLTFLoader }]) => {
        if (cancelled || !host) {
          return;
        }

        try {
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
          camera.position.set(0, 0.08, desktopCameraZ);

          const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: "default",
          });
          renderer.setClearColor(0x000000, 0);
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
          renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.24;
          renderer.domElement.className = "tablet-model-canvas";
          renderer.domElement.setAttribute("aria-hidden", "true");
          host.appendChild(renderer.domElement);

          const group = new THREE.Group();
          group.rotation.set(0.05, -0.38, 0);
          scene.add(group);

          const ambient = new THREE.AmbientLight(0xffffff, 2.25);
          const key = new THREE.DirectionalLight(0x9ffcf5, 3.1);
          key.position.set(1.8, 2.4, 3.2);
          const rim = new THREE.DirectionalLight(0xb28cff, 1.7);
          rim.position.set(-2.4, 0.9, -2.1);
          scene.add(ambient, key, rim);

          let modelRoot: Object3D | undefined;
          let isDragging = false;
          let pendingPointerId = -1;
          let pendingPointerType = "mouse";
          let startX = 0;
          let startY = 0;
          let lastX = 0;
          let lastY = 0;

          const resize = () => {
            const width = Math.max(240, host.clientWidth);
            const height = Math.max(220, host.clientHeight);
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.position.z = width < 560 ? mobileCameraZ : desktopCameraZ;
            camera.updateProjectionMatrix();
          };

          const fitModel = (THREE_INSTANCE: ThreeModule, root: Object3D) => {
            const box = new THREE_INSTANCE.Box3().setFromObject(root);
            const size = box.getSize(new THREE_INSTANCE.Vector3());
            const center = box.getCenter(new THREE_INSTANCE.Vector3());
            const maxAxis = Math.max(size.x, size.y, size.z) || 1;
            const scale = scaleTarget / maxAxis;
            root.scale.setScalar(scale);
            root.position.set(-center.x * scale, -center.y * scale + modelOffsetY, -center.z * scale);
          };

          const loader = new GLTFLoader();
          loader.load(
            modelAsset.src,
            (gltf) => {
              if (cancelled) {
                disposeObject(gltf.scene);
                return;
              }

              modelRoot = gltf.scene;
              modelRoot.traverse((child) => {
                const mesh = child as Object3D & {
                  material?: MeshStandardMaterial[] | MeshStandardMaterial;
                };
                const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
                materials.forEach((material) => {
                  if ("toneMapped" in material) {
                    material.toneMapped = false;
                  }
                  if ("map" in material && material.map) {
                    material.map.colorSpace = THREE.SRGBColorSpace;
                  }
                  if ("color" in material && material.color) {
                    material.color.multiplyScalar(1.18);
                  }
                  if ("emissive" in material && "map" in material && material.map) {
                    material.emissive = new THREE.Color(0x7ffaf2);
                    material.emissiveMap = material.map;
                    material.emissiveIntensity = 0.62;
                  }
                  material.needsUpdate = true;
                });
              });
              modelRoot.rotation.set(0, modelRotationY, 0);
              fitModel(THREE, modelRoot);
              group.add(modelRoot);
              setStatus("ready");
            },
            undefined,
            () => {
              if (!cancelled) {
                setStatus("fallback");
              }
            },
          );

          const rotateFromPointer = (clientX: number, clientY: number) => {
            const dx = clientX - lastX;
            const dy = clientY - lastY;
            lastX = clientX;
            lastY = clientY;
            group.rotation.y += dx * 0.008;
            group.rotation.x = clamp(group.rotation.x + dy * 0.004, -0.32, 0.34);
            host.dataset.rotationY = group.rotation.y.toFixed(3);
            host.dataset.rotationX = group.rotation.x.toFixed(3);
          };

          const beginPendingDrag = (event: PointerEvent) => {
            pendingPointerId = event.pointerId;
            pendingPointerType = event.pointerType || "mouse";
            startX = event.clientX;
            startY = event.clientY;
            lastX = event.clientX;
            lastY = event.clientY;
            host.dataset.lastInput = pendingPointerType;
          };

          const hasTouchRotateIntent = (clientX: number, clientY: number) => {
            const deltaX = Math.abs(clientX - startX);
            const deltaY = Math.abs(clientY - startY);
            return deltaX > 16 && deltaX > deltaY * 1.2;
          };

          const startDragging = (pointerId: number, clientX: number, clientY: number, inputType = "mouse") => {
            isDragging = true;
            lastX = clientX;
            lastY = clientY;
            host.dataset.dragging = "true";
            host.dataset.lastInput = inputType;
            host.focus({ preventScroll: true });
            renderer.domElement.classList.add("is-dragging");
            try {
              renderer.domElement.setPointerCapture(pointerId);
            } catch {
              // Touch rotation still works without capture; vertical page scroll should always win first.
            }
          };

          const stopDragging = () => {
            isDragging = false;
            pendingPointerId = -1;
            host.dataset.dragging = "false";
            renderer.domElement.classList.remove("is-dragging");
          };

          const onPointerDown = (event: PointerEvent) => {
            if (event.pointerType === "mouse" && event.button !== 0) {
              return;
            }
            beginPendingDrag(event);
            if (event.pointerType === "mouse") {
              event.preventDefault();
              startDragging(event.pointerId, event.clientX, event.clientY, "mouse");
            }
          };

          const onPointerMove = (event: PointerEvent) => {
            if (pendingPointerId !== -1 && event.pointerId !== pendingPointerId) {
              return;
            }
            if (!isDragging && pendingPointerId !== -1) {
              if (pendingPointerType === "mouse" || hasTouchRotateIntent(event.clientX, event.clientY)) {
                event.preventDefault();
                startDragging(event.pointerId, event.clientX, event.clientY, pendingPointerType);
              } else {
                return;
              }
            }
            if (!isDragging) {
              return;
            }
            event.preventDefault();
            rotateFromPointer(event.clientX, event.clientY);
          };

          const stopPointerDragging = (event: PointerEvent) => {
            stopDragging();
            if (renderer.domElement.hasPointerCapture(event.pointerId)) {
              renderer.domElement.releasePointerCapture(event.pointerId);
            }
          };

          const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              group.rotation.y += event.key === "ArrowLeft" ? -0.16 : 0.16;
            }
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              group.rotation.x = clamp(group.rotation.x + (event.key === "ArrowUp" ? -0.09 : 0.09), -0.32, 0.34);
            }
          };

          const animate = () => {
            if (!isDragging) {
              group.rotation.y += 0.0024;
            }
            renderer.render(scene, camera);
            frameId = window.requestAnimationFrame(animate);
          };

          renderer.domElement.addEventListener("pointerdown", onPointerDown);
          renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: false });
          renderer.domElement.addEventListener("pointerup", stopPointerDragging);
          renderer.domElement.addEventListener("pointercancel", stopPointerDragging);
          host.addEventListener("keydown", onKeyDown);

          let resizeObserver: ResizeObserver | undefined;
          const ResizeObserverConstructor = window.ResizeObserver;
          if (ResizeObserverConstructor) {
            resizeObserver = new ResizeObserverConstructor(resize);
            resizeObserver.observe(host);
          } else {
            window.addEventListener("resize", resize);
          }
          resize();
          animate();

          cleanupRenderer = () => {
            window.cancelAnimationFrame(frameId);
            renderer.domElement.removeEventListener("pointerdown", onPointerDown);
            renderer.domElement.removeEventListener("pointermove", onPointerMove);
            renderer.domElement.removeEventListener("pointerup", stopPointerDragging);
            renderer.domElement.removeEventListener("pointercancel", stopPointerDragging);
            host.removeEventListener("keydown", onKeyDown);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", resize);
            if (modelRoot) {
              disposeObject(modelRoot);
            }
            renderer.dispose();
            renderer.domElement.remove();
          };
        } catch {
          if (!cancelled) {
            setStatus("fallback");
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("fallback");
        }
      });

    return () => {
      cancelled = true;
      cleanupRenderer?.();
    };
  }, [desktopCameraZ, mobileCameraZ, modelAsset.src, modelOffsetY, modelRotationY, scaleTarget]);

  return (
    <div
      className={`tablet-model-viewer model-${variant} is-${status}`}
      data-component={variant === "tablet" ? "DraggableTabletModel" : "DraggableKioskModel"}
      data-model-src={modelAsset.src}
      data-touch-rotate-enabled="true"
      data-mouse-rotate-enabled="true"
    >
      <div
        ref={hostRef}
        className="tablet-model-host"
        data-touch-rotate-enabled="true"
        data-touch-scroll-mode="pan-y"
        data-mouse-rotate-enabled="true"
        role="group"
        aria-label={`Draggable ${label}. Drag with mouse or touch, or use arrow keys to rotate.`}
        tabIndex={0}
      >
        <div className="tablet-model-fallback" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
      <p className="tablet-model-hint">
        {status === "fallback" ? "3D preview unavailable here" : "Drag to rotate"}
      </p>
    </div>
  );
}

export function DraggableTabletModel() {
  return <DraggableShowcaseModel label="3D VitaKiosk tablet model" />;
}
