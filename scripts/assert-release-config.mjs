#!/usr/bin/env node
/**
 * Yard fail-closed production artifact check (PR-06).
 *
 *   node scripts/assert-release-config.mjs --dist .output/public --expected-supabase-host proj.supabase.co
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return "";
  return process.argv[idx + 1];
}

const root = fileURLToPath(new URL("..", import.meta.url));
const distDir = argValue("--dist") || join(root, ".output", "public");
const expectedHost = (argValue("--expected-supabase-host") || process.env.EXPECTED_SUPABASE_HOST || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "")
  .trim();

if (!expectedHost) {
  console.error("assert-release-config: --expected-supabase-host or EXPECTED_SUPABASE_HOST is required");
  process.exit(1);
}

if (!statSync(distDir, { throwIfNoEntry: false })?.isDirectory()) {
  console.error(`assert-release-config: dist directory missing at ${distDir}`);
  process.exit(1);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

const forbidden = [
  /example\.supabase\.co/i,
  /localhost:3000/i,
  /127\.0\.0\.1/i,
  /sb_secret_/i,
  /service_role/i,
  /VITE_USE_MOCK_API["']?\s*[:=]\s*["']true["']/i,
  /VITE_DEV_BYPASS_AUTH["']?\s*[:=]\s*["']true["']/i,
];

const files = walk(distDir).filter((f) => /\.(js|html|json|txt|map)$/i.test(f));
let foundExpected = false;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      console.error(`assert-release-config: ${file} matches forbidden pattern ${pattern}`);
      process.exit(1);
    }
  }
  if (source.includes(expectedHost)) foundExpected = true;
}

if (!foundExpected) {
  console.error(`assert-release-config: expected Supabase host "${expectedHost}" was not found in ${distDir}`);
  process.exit(1);
}

console.log(`assert-release-config: ok (host=${expectedHost}, files=${files.length})`);
