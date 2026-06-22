# AI Avatar Specification

## Purpose

Make system state visible without implying clinical authority.

## Renderer contract

`AvatarRenderer` receives an `AvatarState` and normalized `audioActivity`. Lottie light player remains the default implementation. Three.js GLB and Three.js VRM are optional renderers selected by `VITE_AVATAR_RENDERER=threejs`, `VITE_AVATAR_RENDERER=vrm`, or an explicit frontend renderer prop; unknown values fall back to Lottie.

The Three.js renderer supports a lightweight GLB humanoid avatar at `frontend/src/assets/avatar/vitakiosk-avatar.glb`. It remains lazy-loaded so the default Lottie kiosk bundle stays lean. If the GLB file is absent, WebGL is unavailable, or model loading fails, the renderer must fall back to the existing abstract hologram without crashing.

The VRM renderer supports self-hosted local VRM avatars at `frontend/src/assets/avatar/vita.vrm` and `frontend/src/assets/avatar/vita-new.vrm`. It remains optional and lazy-loaded, uses `@pixiv/three-vrm`, and must fall back safely if the selected VRM file is missing, invalid, WebGL is unavailable, or model loading fails.

Avatar model sources must be self-hosted and model-agnostic. Acceptable reviewed sources include local GLB files, Blender-exported GLB files, VRoid Studio VRM files, converted GLB exports, licensed Sketchfab or CGTrader assets, and custom models. The current runtime loads GLB and VRM assets from the local repository asset path; any future static asset path must be explicitly reviewed and must remain self-hosted.

The avatar runtime must not call Ready Player Me, avatar cloud editors, avatar creator APIs, or any external avatar service. Avatar rendering must not require API keys, customer data, staff data, sales data, or VitaFlow credentials.

Three.js/VRM controls body motion, face expressions, blinking, head movement, idle breathing, scanning effects, and amplitude-based mouth movement. ElevenLabs or another future reviewed TTS provider supplies voice audio only. Ollama, OpenAI, or another future reviewed AI provider may supply answer text, emotion hints, and action commands through reviewed adapters, but must not become the avatar asset source or product-data authority.

## States

`idle`, `listening`, `thinking`, `speaking`, `error`, and `pharmacist_escalation`.

## Acceptance criteria

- Every state has visible and accessible text.
- Lottie remains the default avatar renderer when no renderer config is set.
- `VITE_AVATAR_RENDERER=threejs` enables the optional Three.js renderer without changing backend, WebSocket, mock data, provider, or safety behavior.
- `VITE_AVATAR_RENDERER=vrm` enables the optional VRM renderer without changing backend, WebSocket, mock data, provider, or safety behavior.
- `VITE_VRM_MODEL=vita` selects `frontend/src/assets/avatar/vita.vrm`; `VITE_VRM_MODEL=vita-new` selects `frontend/src/assets/avatar/vita-new.vrm` for controlled visual replacement testing.
- The Three.js renderer has accessible labels for every avatar state and supports idle, listening, thinking, speaking, error, and pharmacist escalation.
- The VRM renderer has accessible labels for every avatar state and supports idle, listening, thinking, speaking, error, and pharmacist escalation.
- When a GLB model is bundled at `frontend/src/assets/avatar/vitakiosk-avatar.glb`, the Three.js renderer loads it as a humanoid AI pharmacist avatar.
- When a VRM model is bundled at `frontend/src/assets/avatar/vita.vrm`, the VRM renderer loads it as a self-hosted character avatar.
- When `VITE_VRM_MODEL=vita-new` and `frontend/src/assets/avatar/vita-new.vrm` is bundled, the VRM renderer loads the alternate self-hosted test character and exposes `data-avatar-model-key="vita-new"` for runtime QA.
- If `VITE_VRM_MODEL=vita-new` is selected but the alternate asset is unavailable or invalid, the renderer must fall back safely instead of silently displaying `vita.vrm` as if the selected test model loaded.
- If no GLB model is available or it fails to load, the renderer falls back to lightweight geometry, rings, particles, and panels.
- If no VRM model is available or it fails to load, the renderer falls back safely without crashing the kiosk.
- GLB and VRM models must stay lightweight enough for iPad landscape kiosk use, with a preferred target of 5 MB or less and review required before accepting models above 10 MB.
- Replacement avatar models must have a documented license that allows VitaKiosk's intended kiosk and deployment use.
- Avatar assets load only from the local repository or a reviewed self-hosted static asset path.
- The avatar renderer must not call Ready Player Me or any external avatar service at runtime.
- Avatar rendering must not require customer data, API keys, private URLs, or live provider credentials.
- Basic animation hooks cover breathing, listening glow, thinking orbit, speaking pulse, error glow, and pharmacist escalation glow even when the model has no rigged animation clips.
- VRM lifelike hooks cover idle breathing, random blinking, slight head movement, state expression mapping, and speaking mouth movement based on clamped `audioActivity`.
- VRM expression mapping is relaxed, attentive, focused, friendly, concerned, and serious for idle, listening, thinking, speaking, error, and pharmacist escalation.
- VRM lip sync starts with amplitude-based mouth movement only; phoneme or viseme timing is a future reviewed task.
- The VRM renderer applies a relaxed standing assistant pose after model load: arms must not remain horizontally stretched in T-pose or raised into a gesture, a minimal static upper-arm rest pose may be used only to keep the full-body view professional, and hand/lower-arm gesture overrides must remain disabled until verified animation clips or pose presets are reviewed.
- The VRM renderer frames the avatar as a full-body or near-full-body kiosk assistant in a vertical holographic chamber with `data-avatar-framing="full-body"` and `data-avatar-crop="full-body"`: the head must never be cropped, the body should be vertically centered, arms and lower body should remain visible in the normal idle state when space allows, and the bottom of the chamber must retain space for the hologram base.
- The VRM hologram orbit must be a background halo/portal effect with `data-avatar-orbit-layer="background"`: orbit lines must not visibly cross the face, torso, arms, hands, or dress, and the avatar remains the primary subject.
- VRM hand gestures are a future reviewed task and must not be improvised through manual hand/lower-arm bone animation.
- The VRM renderer uses readable face lighting, soft key light, and cyan/purple rim glow; it must not present as a tiny ghost-like figure or a cramped model viewer preview.
- When a VRM model loads successfully, the renderer uses a vertical full-body AI assistant chamber and must not use the circular abstract hologram mask, `border-radius: 50%` shell, radial mask, or black circular crop reserved for abstract fallback visuals.
- The Three.js renderer respects reduced-motion settings and renders safely when WebGL is unavailable.
- The Lottie-first visual reads as an abstract holographic AI assistant and does not use a childish cartoon face.
- The assistant stage uses visible text and distinct cyan, purple, or safety-red treatments for idle, listening, thinking, speaking, error, and pharmacist escalation.
- Listening and speaking activity visibly energizes the waveform without changing the renderer adapter contract.
- The primary interaction state maps to `Tap to Speak`, `Tap to Stop`, `Thinking…`, `Speaking…`, `Try Again`, or `Pharmacist Requested`.
- `pharmacist_escalation` produces an alert and coral safety treatment.
- Speaking activity changes waveform and mouth scale within a clamped 0..1 range.
- Socket disconnection displays local-state mode.
- Animation respects reduced-motion settings.

## Test evidence

- `frontend/src/components/AvatarAssistant.test.tsx`
- `frontend/src/components/avatar/AvatarRenderer.test.ts`
- `frontend/src/components/avatar/AvatarModel.test.ts`
- `frontend/src/components/avatar/ThreeAvatarRenderer.test.tsx`
- `frontend/src/components/avatar/VrmAvatarRenderer.test.tsx`
- `frontend/src/hooks/useAvatarIdleMotion.test.ts`
- `frontend/src/hooks/useAvatarLipSync.test.ts`
- `frontend/src/hooks/useAudioActivity.test.ts`
- `frontend/src/hooks/useKioskSocket.test.ts`
