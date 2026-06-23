import type { RuntimeStatusResponse } from "../types";
import {
  getConfiguredAvatarRenderer,
  type AvatarRendererKind,
} from "./avatar/AvatarRenderer";
import { getDefaultVrmAvatarModelKey } from "./avatar/AvatarRuntimeConfig";


interface RuntimeDiagnosticsProps {
  runtimeStatus: RuntimeStatusResponse | null;
  providerStatusUnavailable?: boolean;
  avatarRenderer?: AvatarRendererKind;
  vrmModel?: string;
}

function RuntimeDiagnostics({
  runtimeStatus,
  providerStatusUnavailable = false,
  avatarRenderer,
  vrmModel,
}: RuntimeDiagnosticsProps) {
  if (!import.meta.env.DEV) {
    return null;
  }

  const renderer = avatarRenderer ?? getConfiguredAvatarRenderer();
  const selectedVrmModel = vrmModel ?? getDefaultVrmAvatarModelKey();

  return (
    <aside
      className="runtime-diagnostics"
      aria-label="Local demo runtime diagnostics"
    >
      {providerStatusUnavailable ? (
        <span>Provider status unavailable</span>
      ) : (
        <>
          <span>AI: {runtimeStatus?.ai_provider ?? "loading"}</span>
          <span>STT: {runtimeStatus?.stt_provider ?? "loading"}</span>
        </>
      )}
      <span>Avatar: {renderer}</span>
      {renderer === "vrm" ? <span>VRM: {selectedVrmModel}</span> : null}
    </aside>
  );
}

export default RuntimeDiagnostics;
