# VitaKiosk Avatar Assets

`vitakiosk-avatar.glb` is a lightweight fictional humanoid placeholder for the optional Three.js renderer.

`vita.vrm` is the current self-hosted VRM demo avatar for the optional VRM renderer. It is loaded from the local repository through the Vite asset pipeline when `VITE_AVATAR_RENDERER=vrm`.

Replace it only with a reviewed, licensed, self-hosted avatar asset such as a local GLB, Blender-exported GLB, VRoid/VRM-derived model converted to GLB, licensed Sketchfab/CGTrader model, or custom model. The current runtime loads the GLB from the local Vite asset pipeline and must not call Ready Player Me, cloud avatar editors, or external avatar services.

Keep avatar files lightweight for iPad landscape use, preferably 5 MB or less when practical. Review any model above 10 MB before accepting it; the current `vita.vrm` demo asset is larger than that target and should be optimized before production use when practical. The model must not contain customer data, API keys, private URLs, tracking pixels, or embedded service dependencies. Lottie remains the default renderer, while Three.js GLB and VRM must remain optional via `VITE_AVATAR_RENDERER=threejs` or `VITE_AVATAR_RENDERER=vrm`.
