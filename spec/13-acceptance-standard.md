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
- Dark neon kiosk acceptance evidence includes a 1024x768 screenshot showing the full single-screen composition.
- The screenshot must show `Tap to Speak` as the primary interaction, a futuristic avatar bay, a poster-style promotion, the map-style shelf route, Mock VitaFlow provenance, and pharmacist safety messaging.
- A white/light SaaS dashboard treatment or a primary `Hold to Speak` label is not accepted.
- Responsive kiosk acceptance evidence must include screenshot or browser-measured evidence for at least 1024x768, 1366x768, and 1920x1080.
- The responsive layout is not accepted if any required landscape viewport has horizontal overflow, document scrolling in the normal kiosk path, overlapping product/promotion/shelf/ERP/safety panels, or a hidden/unusable primary `Tap to Speak` control.
- Narrow tablet or portrait fallback may scroll vertically, but it must not create horizontal overflow and must keep the avatar, shelf map, promotion poster, ERP panel, and pharmacist safety panel readable.
- VRM/Three.js avatar canvases must resize with their assistant stage; VRM mode must not expose customer-facing technical renderer labels.
- Optional avatar renderer work must keep Lottie as the default, gate Three.js behind `VITE_AVATAR_RENDERER=threejs`, and prove all avatar states remain accessible.
- Three.js avatar acceptance requires lazy loading, GLB humanoid support, abstract hologram fallback, WebGL fallback, reduced-motion support, and tests proving Lottie remains the default.
- VRM avatar acceptance requires lazy loading, local self-hosted VRM support, Lottie/GLB/abstract fallback safety, accessible state labels, reduced-motion support, a relaxed non-T-pose assistant stance, no visible raised hands or improvised hand/lower-arm gesture overrides, vertical full-body chamber rendering without circular hologram masking when the VRM is loaded, full-body or near-full-body framing with the head never cropped, visible face lighting, and screenshot evidence at 1024x768.
- Alternate VRM model acceptance requires `VITE_VRM_MODEL=vita-new` to load `frontend/src/assets/avatar/vita-new.vrm` without deleting `frontend/src/assets/avatar/vita.vrm`, expose runtime evidence such as `data-avatar-model-key="vita-new"`, and fall back safely if the selected alternate model is unavailable or invalid.
- VRM hologram orbit acceptance requires the orbit/halo to render as a background effect that does not visibly cross the avatar's face, torso, arms, hands, or dress, with screenshot evidence at 1024x768 and 1366x768.
- Heavy 3D models are not accepted for the iPad landscape kiosk path.

## Test evidence

- `reports/test-evidence.md`
- `scripts/check-specs.mjs`
- Full commands listed in README Test and build section.
