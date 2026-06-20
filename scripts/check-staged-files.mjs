import { execFileSync } from "node:child_process";

const output = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
  { encoding: "utf8" },
);

const stagedPaths = output
  .split(/\r?\n/)
  .map((path) => path.trim())
  .filter(Boolean);

const forbiddenExtensions = /\.(?:db|sqlite|sqlite3|log|bak|backup|dump|pem|p12|pfx)$/i;
const forbiddenSegments = /(?:^|\/)(?:backups?|logs?|customer-data|sales-data|private-data|recordings)(?:\/|$)/i;
const forbiddenNames = /(?:^|\/)(?:credentials|secrets)\.json$/i;

function isSensitive(path) {
  const normalized = path.replaceAll("\\", "/");
  const lower = normalized.toLowerCase();
  if (lower === ".env.example" || lower.endsWith("/.env.example")) {
    return false;
  }
  return (
    /(?:^|\/)\.env(?:\.|$)/i.test(normalized) ||
    forbiddenExtensions.test(normalized) ||
    forbiddenSegments.test(normalized) ||
    forbiddenNames.test(normalized)
  );
}

const rejected = stagedPaths.filter(isSensitive);
if (rejected.length > 0) {
  console.error("staged file safety: BLOCKED");
  for (const path of rejected) {
    console.error(`- ${path}`);
  }
  process.exit(1);
}

console.log(`staged file safety: PASS (${stagedPaths.length} files checked)`);
