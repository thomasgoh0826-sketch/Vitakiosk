# VitaKiosk 3D Avatar Model

## Purpose

The Three.js avatar renderer can load a lightweight GLB humanoid model while keeping Lottie as the default renderer and the abstract hologram as the Three.js fallback.

## Default model path

Place the reviewed avatar model at:

```text
frontend/src/assets/avatar/vitakiosk-avatar.glb
```

The repository includes a tiny fictional VitaKiosk humanoid placeholder at this path so the GLB path can be verified without using any private brand, customer, staff, or patient data.

## Renderer selection

Lottie remains the default:

```powershell
npm.cmd run dev --prefix frontend
```

Enable the Three.js renderer locally:

```powershell
$env:VITE_AVATAR_RENDERER='threejs'
npm.cmd run dev --prefix frontend
```

If `vitakiosk-avatar.glb` is absent or a GLB fails to load, the renderer falls back to the existing abstract hologram instead of crashing.

## Self-hosted avatar source strategy

VitaKiosk must not depend on Ready Player Me services, APIs, avatar creators, cloud editors, or any external avatar service at runtime. Avatar assets must be reviewed, licensed, and self-hosted from this repository or from a deliberately configured static asset path controlled by the VitaKiosk deployment.

Acceptable model sources include:

- a local `.glb` file committed under `frontend/src/assets/avatar/`,
- a local `.vrm` file for a future reviewed VRM loader task,
- a Blender-exported `.glb`,
- a VRoid Studio `.vrm` that is either loaded by a future local VRM pipeline or converted/exported to `.glb`,
- a licensed Sketchfab, CGTrader, or custom model, only when the license allows kiosk/commercial use and redistribution in the deployment package.

The current renderer loads GLB through the local Vite asset pipeline. VRM support is an approved self-hosted model strategy, but it requires a separate reviewed implementation task before the app can load `.vrm` files directly.

## Replacing `vitakiosk-avatar.glb`

1. Obtain or create a licensed self-hosted avatar model.
2. Confirm the model does not contain customer data, staff data, sales data, API keys, embedded private URLs, tracking pixels, or remote service dependencies.
3. Keep the model lightweight for iPad landscape kiosk use:
   - target 5 MB or less when practical,
   - review carefully before accepting any model above 10 MB,
   - compressed textures,
   - modest polygon count,
   - no unnecessary animation clips,
   - mobile-friendly material count and texture sizes.
4. Rename the reviewed GLB file to `vitakiosk-avatar.glb`.
5. Replace the existing placeholder at:

   ```text
   frontend/src/assets/avatar/vitakiosk-avatar.glb
   ```

6. Run the frontend checks:

   ```powershell
   npm.cmd run test:run --prefix frontend
   npm.cmd run build --prefix frontend
   node scripts/check-staged-files.mjs
   ```

7. Capture new visual evidence before committing if the avatar appearance materially changes.

## Runtime loading policy

- Load avatar assets only from the local repository or from a configured self-hosted static asset path.
- Do not call Ready Player Me, cloud avatar editors, avatar-generation APIs, or third-party model services at runtime.
- Do not require customer data, API keys, tokens, passwords, or database credentials for avatar rendering.
- If the local GLB is missing, unavailable, invalid, or fails to load, the Three.js renderer must fall back to the abstract hologram without blocking the kiosk UI.

## Licensing

Every replacement model must have a documented license that allows the intended VitaKiosk use, including in-store kiosk display and redistribution inside the application package or deployment asset bundle. Do not commit or ship models with unclear, personal-use-only, non-commercial, or service-locked terms.

## Safety constraints

- The avatar is a UI renderer only.
- It must not imply diagnosis, prescription, or pharmacist replacement.
- It must not connect to OpenAI, ElevenLabs, VitaFlow ERP, Ollama, OCR, camera, or customer data.
- It must not change backend, WebSocket, API, provider, or pharmacy safety contracts.
