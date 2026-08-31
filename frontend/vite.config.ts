import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

function normalizeProxyTarget(value: string | undefined): string {
  if (!value || value === "auto") {
    return "http://127.0.0.1:8001";
  }
  return value.replace(/\/$/, "");
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = normalizeProxyTarget(
    process.env.VITE_API_BASE_URL ||
      env.VITE_API_BASE_URL ||
      process.env.VITE_DEV_PROXY_TARGET ||
      env.VITE_DEV_PROXY_TARGET,
  );
  const wsProxyTarget = proxyTarget.replace(/^http:/, "ws:").replace(/^https:/, "wss:");

  return {
    define: mode === "test"
      ? { "import.meta.env.VITE_BRANCH_ID": JSON.stringify("SG-001") }
      : undefined,
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
      allowedHosts: [
        ".trycloudflare.com",
        ".lhr.life",
        ".localhost.run",
        ".serveousercontent.com",
        ".loca.lt",
      ],
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/health": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/ws": {
          target: wsProxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      css: true,
    },
  };
});
