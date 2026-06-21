# AI Avatar Specification

## Purpose

Make system state visible without implying clinical authority.

## Renderer contract

`AvatarRenderer` receives an `AvatarState` and normalized `audioActivity`. Lottie light player is the first implementation. Rive or Three.js can replace it without changing voice orchestration.

## States

`idle`, `listening`, `thinking`, `speaking`, `error`, and `pharmacist_escalation`.

## Acceptance criteria

- Every state has visible and accessible text.
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
- `frontend/src/hooks/useAudioActivity.test.ts`
- `frontend/src/hooks/useKioskSocket.test.ts`
