# VitaKiosk 3D Avatar Model

## Purpose

The avatar system is renderer-selectable and mock-first:

- Lottie remains the default kiosk renderer.
- Three.js can load a lightweight local GLB humanoid model.
- VRM can load a local self-hosted character model through Three.js and `@pixiv/three-vrm`.
- If a selected 3D model is missing, invalid, or unsupported by the browser, the UI falls back safely to a holographic abstract avatar instead of crashing.

## Default model paths

Place reviewed self-hosted avatar models at:

```text
frontend/src/assets/avatar/vitakiosk-avatar.glb
frontend/src/assets/avatar/vita.vrm
frontend/src/assets/avatar/vita-new.vrm
```

The repository includes a tiny fictional VitaKiosk humanoid GLB placeholder so the GLB path can be verified without using any private brand, customer, staff, or patient data.

`vita.vrm` is the current reviewed local VRM demo asset supplied for this project. It is self-hosted, loaded through the local Vite asset pipeline, and does not require customer data, API keys, tokens, avatar cloud services, or private URLs. Its current file size is about 15.37 MB, so future production models should be optimized further for iPad kiosk performance when practical.

`vita-new.vrm` is a second reviewed local VRM test asset. It is added as a separate self-hosted model for visual replacement testing and does not delete or overwrite `vita.vrm`. Its current file size is about 16.53 MB, so it is acceptable for controlled visual QA but should still be optimized or replaced with a lighter licensed production model before kiosk rollout.

## Renderer selection

The frontend dev server is fixed to `http://127.0.0.1:5175` through the package script and Vite config. If 5175 is already occupied, Vite fails instead of switching ports; close the old dev server before restarting.

Lottie remains the default:

```powershell
npm.cmd run dev --prefix frontend
```

Enable the Three.js renderer locally:

```powershell
$env:VITE_AVATAR_RENDERER='threejs'
npm.cmd run dev --prefix frontend
```

Enable the VRM renderer locally:

```powershell
$env:VITE_AVATAR_RENDERER='vrm'
npm.cmd run dev --prefix frontend
```

Select the second VRM test model locally:

```powershell
$env:VITE_AVATAR_RENDERER='vrm'
$env:VITE_VRM_MODEL='vita-new'
npm.cmd run dev --prefix frontend
```

Supported frontend renderer values are:

- `lottie`
- `threejs`
- `vrm`

Unknown renderer values fall back to Lottie. If `vita.vrm` is absent or invalid, the VRM renderer falls back safely. If `vitakiosk-avatar.glb` is absent or a GLB fails to load, the Three.js renderer falls back to the existing abstract hologram instead of crashing.

Supported local VRM model selector values are:

- `vita` loads `frontend/src/assets/avatar/vita.vrm`.
- `vita-new` loads `frontend/src/assets/avatar/vita-new.vrm`.

Unknown `VITE_VRM_MODEL` values normalize to `vita`. If `vita-new` is explicitly selected but the asset is unavailable, the renderer falls back safely instead of silently showing the old model and making QA evidence ambiguous.

## Self-hosted avatar source strategy

VitaKiosk must not depend on Ready Player Me services, APIs, avatar creators, cloud editors, or any external avatar service at runtime. Avatar assets must be reviewed, licensed, and self-hosted from this repository or from a deliberately configured static asset path controlled by the VitaKiosk deployment.

Acceptable model sources include:

- a local `.glb` file committed under `frontend/src/assets/avatar/`,
- a local `.vrm` file,
- a Blender-exported `.glb`,
- a VRoid Studio `.vrm` that is either loaded by a future local VRM pipeline or converted/exported to `.glb`,
- a licensed Sketchfab, CGTrader, or custom model, only when the license allows kiosk/commercial use and redistribution in the deployment package.

The current renderers load GLB and VRM assets through the local Vite asset pipeline. Any future configured static asset path must be self-hosted, reviewed, and controlled by the VitaKiosk deployment.

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

## Replacing `vita.vrm`

1. Obtain or create a licensed self-hosted VRM model, such as a VRoid Studio export or a custom VRM.
2. Confirm the model license allows the intended in-store kiosk use and deployment packaging.
3. Confirm the model does not contain customer data, staff data, sales data, API keys, embedded private URLs, tracking pixels, or remote service dependencies.
4. Optimize for iPad landscape use:
   - target 5 MB or less when practical,
   - review carefully before accepting any model above 10 MB,
   - reduce texture size and material count,
   - remove unused meshes, blend shapes, and animation clips.
5. Rename the reviewed VRM file to `vita.vrm`.
6. Replace the existing asset at:

   ```text
   frontend/src/assets/avatar/vita.vrm
   ```

7. Run:

   ```powershell
   npm.cmd run test:run --prefix frontend
   npm.cmd run build --prefix frontend
   node scripts/check-staged-files.mjs
   ```

8. Capture new visual evidence before committing if the avatar appearance materially changes.

## Testing an alternate VRM without deleting `vita.vrm`

1. Add the reviewed, licensed, self-hosted test model at:

   ```text
   frontend/src/assets/avatar/vita-new.vrm
   ```

2. Keep the existing `frontend/src/assets/avatar/vita.vrm` in place.
3. Confirm the alternate model does not contain customer data, staff data, sales data, API keys, embedded private URLs, tracking pixels, or runtime calls to external avatar services.
4. Start the kiosk with the VRM renderer and alternate model selector:

   ```powershell
   $env:VITE_AVATAR_RENDERER='vrm'
   $env:VITE_VRM_MODEL='vita-new'
   $env:VITE_API_BASE_URL='http://127.0.0.1:8000'
   $env:VITE_WS_BASE_URL='ws://127.0.0.1:8000'
   npm.cmd run dev --prefix frontend -- --host 127.0.0.1 --port 5175 --strictPort
   ```

5. Verify the runtime DOM reports `data-avatar-renderer="vrm"` and `data-avatar-model-key="vita-new"`.
6. Capture screenshot evidence and compare against `VITE_VRM_MODEL='vita'` before accepting the visual change.

## Body, face, voice, and AI responsibilities

- Three.js, React Three Fiber, and `@pixiv/three-vrm` control the VRM body, face, expressions, blinking, head movement, idle breathing, scanning effects, and amplitude-based mouth movement.
- The first lip sync implementation is intentionally simple: current TTS/audio activity drives mouth open/close amplitude only. It does not implement phoneme or viseme timing yet.
- ElevenLabs or another reviewed TTS provider may later provide the spoken voice audio only; TTS does not control product facts, pharmacy safety, or avatar sourcing.
- Ollama, OpenAI, or another reviewed AI provider may later provide answer text, emotion hints, or explicit action commands through a reviewed adapter contract.
- Avatar rendering must remain separate from pharmacy facts. VitaFlow ERP remains the source of truth for product, stock, price, promotion, and shelf location.

## Runtime loading policy

- Load avatar assets only from the local repository or from a configured self-hosted static asset path.
- Do not call Ready Player Me, cloud avatar editors, avatar-generation APIs, or third-party model services at runtime.
- Do not require customer data, API keys, tokens, passwords, or database credentials for avatar rendering.
- If the local VRM or GLB is missing, unavailable, invalid, or fails to load, the selected 3D renderer must fall back without blocking the kiosk UI.

## Licensing

Every replacement model must have a documented license that allows the intended VitaKiosk use, including in-store kiosk display and redistribution inside the application package or deployment asset bundle. Do not commit or ship models with unclear, personal-use-only, non-commercial, or service-locked terms.

## Safety constraints

- The avatar is a UI renderer only.
- It must not imply diagnosis, prescription, or pharmacist replacement.
- It must not connect to OpenAI, ElevenLabs, VitaFlow ERP, Ollama, OCR, camera, or customer data.
- It must not change backend, WebSocket, API, provider, or pharmacy safety contracts.
