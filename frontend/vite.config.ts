import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    build: {
      // The optional Three.js avatar renderer is lazy-loaded behind AVATAR_RENDERER=threejs.
      // Keep the default Lottie kiosk bundle lean while allowing this reviewed 3D chunk.
      chunkSizeWarningLimit: 950,
    },
    define: {
      "import.meta.env.AVATAR_RENDERER": JSON.stringify(env.AVATAR_RENDERER ?? ""),
    },
    plugins: [react()],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
    },
  };
});
