import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    // The optional Three.js avatar renderer is lazy-loaded behind VITE_AVATAR_RENDERER=threejs.
    // Keep the default Lottie kiosk bundle lean while allowing this reviewed 3D chunk.
    chunkSizeWarningLimit: 950,
  },
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
