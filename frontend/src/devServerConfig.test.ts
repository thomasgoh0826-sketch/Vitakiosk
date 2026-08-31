import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { UserConfig } from "vite";

import packageJson from "../package.json";
import viteConfig from "../vite.config";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function resolveViteConfig(): Promise<UserConfig> {
  if (typeof viteConfig === "function") {
    return viteConfig({
      command: "serve",
      mode: "development",
      isSsrBuild: false,
      isPreview: false,
    });
  }
  return viteConfig;
}


describe("frontend dev server config", () => {
  it("pins Vite dev server to 127.0.0.1:5175 with strict port mode", async () => {
    const config = await resolveViteConfig();

    expect(config.server).toMatchObject({
      host: "127.0.0.1",
      port: 5175,
      strictPort: true,
    });
  });

  it("allows reviewed HTTPS tunnel hosts without allowing arbitrary hosts", async () => {
    const config = await resolveViteConfig();

    expect(config.server?.allowedHosts).toEqual([
      ".trycloudflare.com",
      ".lhr.life",
      ".localhost.run",
      ".serveousercontent.com",
      ".loca.lt",
    ]);
    expect(config.server?.allowedHosts).not.toBe(true);
  });

  it("keeps the npm dev script from overriding the fixed Vite server config", () => {
    expect(packageJson.scripts.dev).toBe("vite");
    expect(packageJson.scripts.dev).not.toContain("0.0.0.0");
  });

  it("provides an explicit local VRM dev startup command", () => {
    expect(packageJson.scripts["dev:vrm"]).toBe("node ./scripts/dev-vrm.mjs");

    const helperSource = readFileSync(
      resolve(frontendRoot, "scripts", "dev-vrm.mjs"),
      "utf8",
    );

    expect(helperSource).toContain("VITE_AVATAR_RENDERER: \"vrm\"");
    expect(helperSource).toContain("VITE_VRM_MODEL: \"vita-new\"");
    expect(helperSource).toContain("VITE_API_BASE_URL: \"auto\"");
    expect(helperSource).toContain("VITE_WS_BASE_URL: \"auto\"");
    expect(helperSource).toContain("VITE_TEXT_INPUT_MODE: \"native\"");
    expect(helperSource).toContain("Frontend URL");
    expect(helperSource).toContain("Backend URL: http://127.0.0.1:8001");
    expect(helperSource).toContain("strictPort: true");
    expect(helperSource).toContain("is already in use");
    expect(helperSource).toContain("Get-NetTCPConnection -LocalPort ${devPort} -State Listen");
  });

  it("allows an explicit private-LAN host and port without changing the default", () => {
    const helperSource = readFileSync(
      resolve(frontendRoot, "scripts", "dev-vrm.mjs"),
      "utf8",
    );

    expect(helperSource).toContain('process.env.VITAKIOSK_DEV_HOST || "127.0.0.1"');
    expect(helperSource).toContain('process.env.VITAKIOSK_DEV_PORT || "5175"');
    expect(helperSource).toContain("host: devHost");
    expect(helperSource).toContain("port: devPort");
    expect(helperSource).toContain("VitaKiosk LAN URL");
  });

  it("keeps same-origin browser traffic proxied to the local backend", async () => {
    const config = await resolveViteConfig();

    expect(config.server?.proxy).toMatchObject({
      "/api": { target: "http://127.0.0.1:8001" },
      "/health": { target: "http://127.0.0.1:8001" },
      "/ws": { target: "ws://127.0.0.1:8001", ws: true },
    });
  });

  it("documents a non-mutating Windows local VRM demo startup helper", () => {
    const helperSource = readFileSync(
      resolve(frontendRoot, "..", "scripts", "start-local-vrm-demo.ps1"),
      "utf8",
    );

    expect(helperSource).toContain("backend.app.main:app");
    expect(helperSource).toContain("--port 8001");
    expect(helperSource).toContain("npm.cmd run dev:vrm --prefix frontend");
    expect(helperSource).toContain("root .env");
    expect(helperSource).toContain("frontend/.env.local");
    expect(helperSource).toContain("http://127.0.0.1:5175");
    expect(helperSource).toContain("Get-NetTCPConnection -LocalPort 8001 -State Listen");
    expect(helperSource).toContain("Get-NetTCPConnection -LocalPort 5175 -State Listen");
    expect(helperSource).toContain(".venv\\Scripts\\python.exe");
    expect(helperSource).not.toContain("; python -m uvicorn");
    expect(helperSource).not.toContain("Set-Content");
    expect(helperSource).not.toContain("Add-Content");
  });

  it("documents the same VRM local demo values in the frontend env example", () => {
    const envExample = readFileSync(resolve(frontendRoot, ".env.local.example"), "utf8");

    expect(envExample).toContain("VITE_AVATAR_RENDERER=vrm");
    expect(envExample).toContain("VITE_VRM_MODEL=vita-new");
    expect(envExample).toContain("VITE_API_BASE_URL=http://127.0.0.1:8001");
    expect(envExample).toContain("VITE_WS_BASE_URL=ws://127.0.0.1:8001");
    expect(envExample).toContain("VITE_TEXT_INPUT_MODE=native");
  });

  it("documents the one-command local VRM startup flow", () => {
    const startupDocs = readFileSync(
      resolve(frontendRoot, "..", "docs", "local-vrm-startup.md"),
      "utf8",
    );

    expect(startupDocs).toContain(".\\scripts\\start-local-vrm-demo.ps1");
    expect(startupDocs).toContain("http://127.0.0.1:5175");
    expect(startupDocs).toContain("http://127.0.0.1:8001");
    expect(startupDocs).toContain("VITE_AVATAR_RENDERER=vrm");
    expect(startupDocs).toContain("VITE_VRM_MODEL=vita-new");
    expect(startupDocs).toContain("Vite reads `frontend/.env.local` only when the dev server starts");
    expect(startupDocs).toContain("Stop-Process -Id <PID> -Force");
  });
});
