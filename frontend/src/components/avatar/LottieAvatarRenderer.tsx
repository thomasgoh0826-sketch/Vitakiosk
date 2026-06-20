import { useEffect, useRef, type CSSProperties } from "react";
import lottie from "lottie-web/build/player/lottie_light";

import animationData from "../../assets/avatar-placeholder.json";
import type { AvatarRendererProps } from "./AvatarRenderer";


function LottieAvatarRenderer({ state, audioActivity }: AvatarRendererProps) {
  const animationContainer = useRef<HTMLDivElement>(null);
  const activity = Math.min(1, Math.max(0, audioActivity));
  const mouthScale = state === "speaking" ? 0.35 + activity * 1.65 : 0.35;
  const style = { "--mouth-scale": mouthScale } as CSSProperties;

  useEffect(() => {
    const container = animationContainer.current;
    if (!container) {
      return;
    }
    const animation = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: state !== "pharmacist_escalation",
      autoplay: state !== "error",
      animationData: structuredClone(animationData),
    });
    return () => {
      animation.destroy();
    };
  }, [state]);

  return (
    <div className={`lottie-avatar avatar-render-${state}`} style={style}>
      <div ref={animationContainer} aria-hidden="true" />
      <span className="avatar-eye avatar-eye-left" aria-hidden="true" />
      <span className="avatar-eye avatar-eye-right" aria-hidden="true" />
      <span className="avatar-mouth" aria-hidden="true" />
    </div>
  );
}

export default LottieAvatarRenderer;
