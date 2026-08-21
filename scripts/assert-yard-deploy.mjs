#!/usr/bin/env node
/**
 * Pre-wrangler Yard release assert (PR-06).
 * Requires EXPECTED_SUPABASE_HOST or VITE_SUPABASE_URL.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const host = (
  process.env.EXPECTED_SUPABASE_HOST ||
  process.env.VITE_SUPABASE_URL ||
  ""
)
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "")
  .trim();

if (!host) {
  console.error("assert-yard-deploy: set EXPECTED_SUPABASE_HOST or VITE_SUPABASE_URL");
  process.exit(1);
}

const r = spawnSync(
  process.execPath,
  [
    join(root, "scripts/assert-release-config.mjs"),
    "--dist",
    ".output/public",
    "--expected-supabase-host",
    host,
  ],
  { cwd: root, stdio: "inherit" },
);
process.exit(r.status ?? 1);
