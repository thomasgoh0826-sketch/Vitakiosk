/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AVATAR_RENDERER?: string;
  readonly VITE_VRM_MODEL?: string;
  readonly VITE_ENABLE_TYPED_INPUT?: string;
  readonly VITE_TEXT_INPUT_MODE?: string;
  readonly VITE_SHOW_DEBUG_STATUS?: string;
  readonly VITE_SHOW_TRANSCRIPT_DEBUG?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_BASE_URL?: string;
}
