import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .map((path) => path.trim())
  .filter(Boolean);

const providerKeys = [
  "OPENAI_API_KEY",
  "ELEVENLABS_API_KEY",
  "VITAFLOW_API_BASE_URL",
];

const valueStopChars = new Set(["", " ", "\t", "\r", "\n", "`", "\"", "'", "<", ">"]);
const findings = [];

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function valueAfterAssignment(line, startIndex) {
  let value = "";
  for (let index = startIndex; index < line.length; index += 1) {
    const char = line[index];
    if (valueStopChars.has(char)) {
      break;
    }
    value += char;
  }
  return value;
}

for (const path of trackedFiles) {
  const normalized = path.replaceAll("\\", "/");
  const text = readText(path);
  if (!text) {
    continue;
  }

  const lines = text.split(/\r?\n/);
  lines.forEach((line, lineIndex) => {
    for (const key of providerKeys) {
      const marker = `${key}=`;
      let searchFrom = 0;
      while (searchFrom < line.length) {
        const markerIndex = line.indexOf(marker, searchFrom);
        if (markerIndex === -1) {
          break;
        }

        const value = valueAfterAssignment(line, markerIndex + marker.length);
        if (value.length > 0) {
          findings.push(`${normalized}:${lineIndex + 1}: ${key}=<non-empty>`);
        }
        searchFrom = markerIndex + marker.length;
      }
    }
  });
}

if (findings.length > 0) {
  console.error("provider secret scan: BLOCKED");
  console.error("Non-empty provider secret-style values were found in tracked files.");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`provider secret scan: PASS (${trackedFiles.length} tracked files checked)`);
