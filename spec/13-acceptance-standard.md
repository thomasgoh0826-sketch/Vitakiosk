# Acceptance Standard

## Purpose

Define repository-wide completion requirements for every VitaKiosk feature.

## Acceptance criteria

A feature is accepted only when:

- Its spec states observable behavior and safety constraints.
- A test was observed failing before implementation for new behavior.
- Relevant automated tests pass with no warnings treated as acceptable noise.
- Frontend behavior also passes TypeScript and production build.
- Visible work is inspected in a browser at its target viewport.
- Test evidence names the command, date, actual result, and status.
- Staged paths pass `node scripts/check-staged-files.mjs`.
- No secret or real business data is tracked.
- Mock/live provider mode and VitaFlow provenance are explicit.
- Default provider selectors remain mock unless a task explicitly enables one layer.
- Credentials alone never activate OpenAI, ElevenLabs, Ollama, VitaFlow, or OCR providers.
- Live-provider work must be one layer at a time, with tests proving mock-default behavior remains unchanged.
- VitaFlow live integration must start as read-only only and must not use `C:\Users\Admin\Documents\Playground\release`.
- Red-flag, unknown-product, and non-invention rules remain covered.
- Shelf navigation acceptance evidence includes a screenshot of the map route panel at the target iPad landscape viewport; a plain progress stepper is not accepted.
- Dark neon kiosk acceptance evidence includes a 1024 × 768 screenshot showing the full single-screen composition.
- The screenshot must show `Tap to Speak` as the primary interaction, a futuristic avatar bay, a poster-style promotion, the map-style shelf route, Mock VitaFlow provenance, and pharmacist safety messaging.
- A white/light SaaS dashboard treatment or a primary `Hold to Speak` label is not accepted.
- Optional avatar renderer work must keep Lottie as the default, gate Three.js behind `VITE_AVATAR_RENDERER=threejs`, and prove all avatar states remain accessible.
- Three.js avatar acceptance requires lazy loading, GLB humanoid support, abstract hologram fallback, WebGL fallback, reduced-motion support, and tests proving Lottie remains the default.
- VRM avatar acceptance requires lazy loading, local self-hosted VRM support, Lottie/GLB/abstract fallback safety, accessible state labels, reduced-motion support, a relaxed non-T-pose assistant stance, no visible raised hands or improvised hand/lower-arm gesture overrides, vertical portrait-stage rendering without circular hologram masking when the VRM is loaded, bust-shot head/face/shoulder/upper-chest framing, visible face lighting, and screenshot evidence at 1024 × 768.
- Heavy 3D models are not accepted for the iPad landscape kiosk path.

## Test evidence

- `reports/test-evidence.md`
- `scripts/check-specs.mjs`
- Full commands listed in README Test and build section.
