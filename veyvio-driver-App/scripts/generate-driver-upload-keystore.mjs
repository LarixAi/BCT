#!/usr/bin/env node
/**
 * Generate Android upload keystore for Play internal track (Gate 3).
 * Output is gitignored — encode to GitHub secret VEYVIO_UPLOAD_KEYSTORE_BASE64.
 *
 *   node scripts/generate-driver-upload-keystore.mjs
 *
 * Requires keytool on PATH (JDK).
 */
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = join(scriptDir, "..");
const outDir = join(appRoot, ".secrets");
const keystorePath = join(outDir, "veyvio-driver-upload.jks");

if (existsSync(keystorePath)) {
  console.error(`Keystore already exists: ${keystorePath}`);
  console.error("Delete manually if you need a new one.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const alias = "veyvio-driver-upload";
const storePass = process.env.VEYVIO_KEYSTORE_PASSWORD || "change-me-store";
const keyPass = process.env.VEYVIO_KEY_PASSWORD || storePass;

const result = spawnSync(
  "keytool",
  [
    "-genkeypair",
    "-v",
    "-keystore",
    keystorePath,
    "-alias",
    alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-storepass",
    storePass,
    "-keypass",
    keyPass,
    "-dname",
    "CN=Veyvio Driver, OU=Mobile, O=Veyvio Ltd, L=London, ST=England, C=GB",
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const b64 = spawnSync("base64", ["-i", keystorePath], { encoding: "utf8" });
console.log("\nKeystore created:", keystorePath);
console.log("\nGitHub secrets to add:");
console.log("  VEYVIO_UPLOAD_STORE_PASSWORD =", storePass);
console.log("  VEYVIO_UPLOAD_KEY_PASSWORD   =", keyPass);
console.log("  VEYVIO_UPLOAD_KEY_ALIAS      =", alias);
console.log("  VEYVIO_UPLOAD_KEYSTORE_BASE64 = <paste below>");
console.log("\n(base64 one line — copy to GitHub → Settings → Secrets → Actions)\n");
console.log((b64.stdout || "").replace(/\s+/g, ""));
