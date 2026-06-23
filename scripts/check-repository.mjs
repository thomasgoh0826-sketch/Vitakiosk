import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const requiredPaths = [
  "AGENTS.md",
  "README.md",
  ".env.example",
  ".gitignore",
  "TODO.md",
  "CHANGELOG.md",
  "frontend",
  "backend",
  "services",
  "assets",
  "reports",
  "spec",
  "docs",
];

for (const path of requiredPaths) {
  assert.ok(existsSync(path), `missing ${path}`);
}

const envExample = readFileSync(".env.example", "utf8");
for (const key of [
  "VITAKIOSK_PROVIDER_MODE",
  "STT_PROVIDER",
  "TTS_PROVIDER",
  "AI_PROVIDER",
  "VITAFLOW_PROVIDER",
  "VISION_PROVIDER",
  "OPENAI_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "OLLAMA_TIMEOUT_SECONDS",
  "VITAFLOW_API_BASE_URL",
]) {
  if (key.endsWith("_PROVIDER") || key === "VITAKIOSK_PROVIDER_MODE") {
    assert.match(envExample, new RegExp(`^${key}=mock$`, "m"));
  } else if (key === "OLLAMA_BASE_URL") {
    assert.match(envExample, /^OLLAMA_BASE_URL=http:\/\/localhost:11434$/m);
  } else if (key === "OLLAMA_MODEL") {
    assert.match(envExample, /^OLLAMA_MODEL=qwen2\.5:7b$/m);
  } else if (key === "OLLAMA_TIMEOUT_SECONDS") {
    assert.match(envExample, /^OLLAMA_TIMEOUT_SECONDS=20$/m);
  } else {
    assert.match(envExample, new RegExp(`^${key}=$`, "m"));
  }
}

const gitignore = readFileSync(".gitignore", "utf8");
for (const token of [
  ".env",
  "*.db",
  "*.sqlite",
  "*.log",
  "backups/",
  "customer-data/",
  "sales-data/",
]) {
  assert.ok(gitignore.includes(token), `missing ignore rule ${token}`);
}

const agents = readFileSync("AGENTS.md", "utf8");
assert.ok(
  agents.includes("C:\\Users\\Admin\\Documents\\Playground\\release"),
  "protected VitaFlow release path is missing from AGENTS.md",
);

console.log("repository contract: PASS");
