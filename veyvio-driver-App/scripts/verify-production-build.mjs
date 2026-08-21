#!/usr/bin/env node
/**
 * Production build guard (P0-10).
 * Fails if release-profile env enables demo/mock/PHV/Base44 paths or if dist bundles Base44.
 * Placeholder example.supabase.co defaults are for this script's own CI build only —
 * they are not a production artifact proof. Release AAB uses assert-release-config.mjs.
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url).pathname;
const distDir = join(root, "dist");

const forbiddenEnv = {
  VITE_MOCK_API: "true",
  VITE_ENABLE_BASE44: "true",
  VITE_ENABLE_PHV_MODULE: "true",
  VITE_DRIVER_NAV_TEST_MODE: "true",
};

for (const [key, value] of Object.entries(forbiddenEnv)) {
  if (process.env[key] === value) {
    console.error(`Production guard failed: ${key} must not be "${value}" in release builds.`);
    process.exit(1);
  }
}

console.log("Building Driver with production profile…");
if (!process.env.VERIFY_SKIP_BUILD && !process.argv.includes("--skip-build")) {
  execSync("npm run build", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? "ci-anon-key",
      VITE_COMMAND_API_BASE_URL:
        process.env.VITE_COMMAND_API_BASE_URL ?? "https://example.supabase.co/functions/v1/command-api",
      VITE_AUTH_API_BASE_URL:
        process.env.VITE_AUTH_API_BASE_URL ?? "https://example.supabase.co/functions/v1/command-api",
      VITE_DRIVER_APP_URL: process.env.VITE_DRIVER_APP_URL ?? "https://driver.example.com",
      VITE_MOCK_API: "",
      VITE_ENABLE_BASE44: "",
      VITE_ENABLE_PHV_MODULE: "",
      VITE_DRIVER_NAV_TEST_MODE: "",
    },
  });
} else {
  console.log("Skipping build (VERIFY_SKIP_BUILD).");
}

if (!statSync(distDir, { throwIfNoEntry: false })) {
  if (process.env.VERIFY_SKIP_BUILD || process.argv.includes("--skip-build")) {
    console.warn(`Production guard: no build output at ${distDir} — run npm run build before verify:production-build.`);
    process.exit(1);
  }
  console.error(`Production guard failed: expected build output at ${distDir}`);
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

const distFiles = walk(distDir);
const jsFiles = distFiles.filter((f) => f.endsWith(".js"));
const forbiddenPatterns = [
  /@base44\/sdk/,
  /@base44\/vite-plugin/,
  /from ["']@base44\//,
  /createClient\(\{[^}]*base44/i,
  /https:\/\/base44\.app/,
  /VITE_ENABLE_PHV_MODULE["']?\s*===\s*["']true["']/,
];

for (const file of jsFiles) {
  const source = readFileSync(file, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      console.error(`Production guard failed: ${file} matches ${pattern}`);
      process.exit(1);
    }
  }
}

console.log(`Production guard passed (${jsFiles.length} JS chunks scanned).`);
