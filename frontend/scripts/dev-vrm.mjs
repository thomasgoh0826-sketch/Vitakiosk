import { createServer } from "vite";

const localVrmEnv = {
  VITE_AVATAR_RENDERER: "vrm",
  VITE_VRM_MODEL: "vita-new",
  VITE_API_BASE_URL: "http://127.0.0.1:8001",
  VITE_WS_BASE_URL: "ws://127.0.0.1:8001",
  VITE_TEXT_INPUT_MODE: "native",
};

for (const [key, value] of Object.entries(localVrmEnv)) {
  process.env[key] ||= value;
}

console.log("Starting VitaKiosk frontend local VRM demo.");
console.log("Frontend URL: http://127.0.0.1:5175");
console.log("Backend URL: http://127.0.0.1:8001");
console.log(`Avatar renderer: ${process.env.VITE_AVATAR_RENDERER}`);
console.log(`VRM model: ${process.env.VITE_VRM_MODEL}`);
console.log(`API base: ${process.env.VITE_API_BASE_URL}`);
console.log(`WebSocket base: ${process.env.VITE_WS_BASE_URL}`);
console.log(`Text input mode: ${process.env.VITE_TEXT_INPUT_MODE}`);

let server;

try {
  server = await createServer({
    server: {
      host: "127.0.0.1",
      port: 5175,
      strictPort: true,
    },
  });

  await server.listen();
  server.printUrls();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Port 5175 is already in use")) {
    console.error("Port 5175 is already in use.");
    console.error("Close the old VitaKiosk frontend dev server, then rerun:");
    console.error("npm.cmd run dev:vrm --prefix frontend");
    console.error("PowerShell check:");
    console.error("Get-NetTCPConnection -LocalPort 5175 -State Listen");
    console.error(
      "Get-NetTCPConnection -LocalPort 5175 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess",
    );
  } else {
    console.error("VitaKiosk VRM dev server failed to start.");
    console.error(message);
  }
  process.exit(1);
}

const closeServer = async () => {
  await server?.close();
  process.exit(0);
};

process.once("SIGINT", closeServer);
process.once("SIGTERM", closeServer);
