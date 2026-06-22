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

## Replacing with a Ready Player Me GLB

1. Export or download a `.glb` avatar from Ready Player Me.
2. Keep the model lightweight for iPad landscape kiosk use.
3. Prefer mobile-friendly assets:
   - compressed textures,
   - modest polygon count,
   - no unnecessary animation clips,
   - no personal/customer identifiers,
   - no embedded secrets or URLs.
4. Rename the file to `vitakiosk-avatar.glb`.
5. Replace:

   ```text
   frontend/src/assets/avatar/vitakiosk-avatar.glb
   ```

6. Run:

   ```powershell
   npm.cmd run test:run --prefix frontend
   npm.cmd run build --prefix frontend
   node scripts/check-staged-files.mjs
   ```

7. Capture new visual evidence before committing if the avatar appearance materially changes.

## Safety constraints

- The avatar is a UI renderer only.
- It must not imply diagnosis, prescription, or pharmacist replacement.
- It must not connect to OpenAI, ElevenLabs, VitaFlow ERP, Ollama, OCR, camera, or customer data.
- It must not change backend, WebSocket, API, provider, or pharmacy safety contracts.
