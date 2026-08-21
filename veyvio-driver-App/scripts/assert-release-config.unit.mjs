/**
 * Static checks for fail-closed Driver release config assertion.
 * Run: node scripts/assert-release-config.unit.mjs
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./assert-release-config.mjs", import.meta.url));

function run(args, extraEnv = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
}

{
  const missing = run(["--dist", "/tmp/does-not-exist-veyvio-dist"]);
  assert.notEqual(missing.status, 0);
}

{
  const dir = mkdtempSync(join(tmpdir(), "veyvio-release-"));
  writeFileSync(join(dir, "app.js"), 'const u = "https://qeckgqjrfbdyxchuncdt.supabase.co";');
  const ok = run(["--dist", dir, "--expected-supabase-host", "qeckgqjrfbdyxchuncdt.supabase.co"]);
  assert.equal(ok.status, 0, ok.stderr + ok.stdout);
  rmSync(dir, { recursive: true, force: true });
}

{
  const dir = mkdtempSync(join(tmpdir(), "veyvio-release-"));
  writeFileSync(join(dir, "app.js"), 'const u = "https://example.supabase.co";');
  const bad = run(["--dist", dir, "--expected-supabase-host", "qeckgqjrfbdyxchuncdt.supabase.co"]);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr + bad.stdout, /example\\.supabase\\.co|forbidden/i);
  rmSync(dir, { recursive: true, force: true });
}

{
  const dir = mkdtempSync(join(tmpdir(), "veyvio-release-"));
  writeFileSync(join(dir, "app.js"), 'const k = "service_role";');
  const secret = run(["--dist", dir, "--expected-supabase-host", "prod.supabase.co"]);
  assert.notEqual(secret.status, 0);
  rmSync(dir, { recursive: true, force: true });
}

console.log("assert-release-config.unit.mjs: ok");
