import type { HealthResponse } from "../types";
import {
  getConfiguredAvatarRenderer,
  type AvatarRendererKind,
} from "./avatar/AvatarRenderer";
import { getDefaultVrmAvatarModelKey } from "./avatar/AvatarRuntimeConfig";


interface RuntimeDiagnosticsProps {
  health: HealthResponse | null;
  avatarRenderer?: AvatarRendererKind;
  vrmModel?: string;
}

function RuntimeDiagnostics({
  health,
  avatarRenderer,
  vrmModel,
}: RuntimeDiagnosticsProps) {
  if (!import.meta.env.DEV) {
    return null;
  }

  const renderer = avatarRenderer ?? getConfiguredAvatarRenderer();
  const selectedVrmModel = vrmModel ?? getDefaultVrmAvatarModelKey();
  const providers = health?.provider_summary;

  return (
    <aside
      className="runtime-diagnostics"
      aria-label="Local demo runtime diagnostics"
    >
      <span>AI: {providers?.ai ?? "unknown"}</span>
      <span>STT: {providers?.stt ?? "unknown"}</span>
      <span>Avatar: {renderer}</span>
      {renderer === "vrm" ? <span>VRM: {selectedVrmModel}</span> : null}
    </aside>
  );
}

export default RuntimeDiagnostics;
