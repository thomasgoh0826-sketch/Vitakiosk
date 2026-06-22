# AI Avatar Specification

## Purpose

Make system state visible without implying clinical authority.

## Renderer contract

`AvatarRenderer` receives an `AvatarState` and normalized `audioActivity`. Lottie light player remains the default implementation. Three.js is available only as an optional renderer selected by `VITE_AVATAR_RENDERER=threejs` or an explicit frontend renderer prop; unknown values fall back to Lottie.

The Three.js renderer supports a lightweight GLB humanoid avatar at `frontend/src/assets/avatar/vitakiosk-avatar.glb`. It remains lazy-loaded so the default Lottie kiosk bundle stays lean. If the GLB file is absent, WebGL is unavailable, or model loading fails, the renderer must fall back to the existing abstract hologram without crashing.

Avatar model sources must be self-hosted and model-agnostic. Acceptable reviewed sources include local GLB files, Blender-exported GLB files, VRoid Studio VRM files or converted GLB exports, licensed Sketchfab or CGTrader assets, and custom models. The current runtime loads GLB assets from the local repository asset path; any future static asset path or VRM loader must be explicitly reviewed and must remain self-hosted.

The avatar runtime must not call Ready Player Me, avatar cloud editors, avatar creator APIs, or any external avatar service. Avatar rendering must not require API keys, customer data, staff data, sales data, or VitaFlow credentials.

## States

`idle`, `listening`, `thinking`, `speaking`, `error`, and `pharmacist_escalation`.

## Acceptance criteria

- Every state has visible and accessible text.
- Lottie remains the default avatar renderer when no renderer config is set.
- `VITE_AVATAR_RENDERER=threejs` enables the optional Three.js renderer without changing backend, WebSocket, mock data, provider, or safety behavior.
- The Three.js renderer has accessible labels for every avatar state and supports idle, listening, thinking, speaking, error, and pharmacist escalation.
- When a GLB model is bundled at `frontend/src/assets/avatar/vitakiosk-avatar.glb`, the Three.js renderer loads it as a humanoid AI pharmacist avatar.
- If no GLB model is available or it fails to load, the renderer falls back to lightweight geometry, rings, particles, and panels.
- The GLB model must stay lightweight enough for iPad landscape kiosk use, with a preferred target of 5 MB or less and review required before accepting models above 10 MB.
- Replacement avatar models must have a documented license that allows VitaKiosk's intended kiosk and deployment use.
- Avatar assets load only from the local repository or a reviewed self-hosted static asset path.
- The avatar renderer must not call Ready Player Me or any external avatar service at runtime.
- Avatar rendering must not require customer data, API keys, private URLs, or live provider credentials.
- Basic animation hooks cover breathing, listening glow, thinking orbit, speaking pulse, error glow, and pharmacist escalation glow even when the model has no rigged animation clips.
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
- `frontend/src/hooks/useAudioActivity.test.ts`
- `frontend/src/hooks/useKioskSocket.test.ts`
