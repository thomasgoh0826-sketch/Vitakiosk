# AI Avatar Specification

## Purpose

Make system state visible without implying clinical authority.

## Renderer contract

`AvatarRenderer` receives an `AvatarState` and normalized `audioActivity`. Lottie light player remains the default implementation. Three.js is available only as an optional renderer selected by `VITE_AVATAR_RENDERER=threejs` or an explicit frontend renderer prop; unknown values fall back to Lottie.

The Three.js renderer is a lightweight abstract hologram, not a heavy character model. It is lazy-loaded so the default Lottie kiosk bundle remains lean, and it must provide a non-crashing fallback when WebGL is unavailable.

## States

`idle`, `listening`, `thinking`, `speaking`, `error`, and `pharmacist_escalation`.

## Acceptance criteria

- Every state has visible and accessible text.
- Lottie remains the default avatar renderer when no renderer config is set.
- `VITE_AVATAR_RENDERER=threejs` enables the optional Three.js renderer without changing backend, WebSocket, mock data, provider, or safety behavior.
- The Three.js renderer has accessible labels for every avatar state and supports idle, listening, thinking, speaking, error, and pharmacist escalation.
- The Three.js renderer uses lightweight geometry, rings, particles, and panels; no heavy 3D model is required at this stage.
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
- `frontend/src/hooks/useAudioActivity.test.ts`
- `frontend/src/hooks/useKioskSocket.test.ts`
