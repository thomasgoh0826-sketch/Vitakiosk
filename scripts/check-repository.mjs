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
  "OPENAI_API_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "VITAFLOW_API_BASE_URL",
]) {
  assert.match(envExample, new RegExp(`^${key}=$`, "m"));
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
