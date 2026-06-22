# VitaKiosk Avatar Assets

`vitakiosk-avatar.glb` is a lightweight fictional humanoid placeholder for the optional Three.js renderer.

Replace it only with a reviewed, licensed, self-hosted avatar asset such as a local GLB, Blender-exported GLB, VRoid/VRM-derived model converted to GLB, licensed Sketchfab/CGTrader model, or custom model. The current runtime loads the GLB from the local Vite asset pipeline and must not call Ready Player Me, cloud avatar editors, or external avatar services.

Keep the file lightweight for iPad landscape use, preferably 5 MB or less when practical. Review any model above 10 MB before accepting it. The model must not contain customer data, API keys, private URLs, tracking pixels, or embedded service dependencies. Lottie remains the default renderer, and Three.js must remain optional via `VITE_AVATAR_RENDERER=threejs`.
