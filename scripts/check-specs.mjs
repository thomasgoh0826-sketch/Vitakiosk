import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const specs = [
  "spec/01-product-data-spec.md",
  "spec/02-promotion-poster-spec.md",
  "spec/03-kiosk-layout-spec.md",
  "spec/04-ai-avatar-spec.md",
  "spec/05-voice-ai-spec.md",
  "spec/06-ai-intent-spec.md",
  "spec/07-vitaflow-adapter-spec.md",
  "spec/08-purchasing-query-spec.md",
  "spec/09-pharmacist-escalation-spec.md",
  "spec/10-websocket-spec.md",
  "spec/11-api-spec.md",
  "spec/12-security-data-spec.md",
  "spec/13-acceptance-standard.md",
];

for (const path of specs) {
  assert.ok(existsSync(path), `missing ${path}`);
  const content = readFileSync(path, "utf8");
  assert.ok(content.includes("## Acceptance criteria"), `${path} lacks acceptance criteria`);
  assert.ok(content.includes("## Test evidence"), `${path} lacks test evidence`);
}

const architecture = readFileSync("docs/architecture.md", "utf8");
for (const phrase of [
  "mock-first",
  "VitaFlow ERP is the source of truth",
  "/ws/kiosk/{session_id}",
  "pharmacist_escalation",
]) {
  assert.ok(architecture.includes(phrase), `architecture lacks ${phrase}`);
}

const evidence = readFileSync("reports/test-evidence.md", "utf8");
for (const phrase of [
  "Backend tests",
  "Frontend tests",
  "Frontend build",
  "Dependency audit",
  "Staged-file safety",
  "Protected-path declaration",
]) {
  assert.ok(evidence.includes(phrase), `evidence lacks ${phrase}`);
}

console.log(`spec coverage: PASS (${specs.length} specs)`);
