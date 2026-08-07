/**
 * Emergency Executive credential rotation dry-run checklist.
 * Does not print or rotate live secrets; verifies local controls are ready.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout;
}

console.log("Executive emergency rotation dry-run");
console.log("1. Source secret scan");
run("node", ["scripts/scan-production-secrets.mjs", "--source"]);
console.log("2. Production build assertion helpers present");
run("node", ["--check", "scripts/assert-production-build.mjs"]);
console.log("3. Documented inventory and owners");
run("node", [
  "-e",
  "const fs=require('fs'); const text=fs.readFileSync('docs/secrets-inventory.md','utf8'); if(!/VEYVIO_EXECUTIVE_SESSION_SECRET/.test(text)) throw new Error('missing session secret inventory'); if(!/Forbidden on Executive/.test(text)) throw new Error('missing forbidden list');",
]);

console.log("Dry-run passed.");
console.log("Manual cut-over still required:");
console.log("- Rotate VEYVIO_EXECUTIVE_SESSION_SECRET in Sites/Worker secret storage");
console.log("- Rotate VEYVIO_COMMAND_ANON_KEY / publishable key with platform owners");
console.log("- Republish Executive archive and verify login + binding cookies");
console.log("- Revoke the previous session secret and confirm old bindings fail");
