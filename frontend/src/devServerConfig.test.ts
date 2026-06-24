import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import packageJson from "../package.json";
import viteConfig from "../vite.config";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");


describe("frontend dev server config", () => {
  it("pins Vite dev server to 127.0.0.1:5175 with strict port mode", () => {
    expect(viteConfig.server).toMatchObject({
      host: "127.0.0.1",
      port: 5175,
      strictPort: true,
    });
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
    expect(helperSource).toContain("VITE_API_BASE_URL: \"http://127.0.0.1:8001\"");
    expect(helperSource).toContain("VITE_WS_BASE_URL: \"ws://127.0.0.1:8001\"");
    expect(helperSource).toContain("VITE_TEXT_INPUT_MODE: \"native\"");
    expect(helperSource).toContain("Frontend URL: http://127.0.0.1:5175");
    expect(helperSource).toContain("Backend URL: http://127.0.0.1:8001");
    expect(helperSource).toContain("strictPort: true");
    expect(helperSource).toContain("Port 5175 is already in use");
    expect(helperSource).toContain("Get-NetTCPConnection -LocalPort 5175 -State Listen");
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
