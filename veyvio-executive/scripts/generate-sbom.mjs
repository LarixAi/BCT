/**
 * Generate a lightweight npm dependency inventory (SBOM-style) from package-lock.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCKFILE = path.join(PROJECT_ROOT, "package-lock.json");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "sbom");
const OUTPUT = path.join(OUTPUT_DIR, "executive-npm-sbom.json");

async function main() {
  const lock = JSON.parse(await fs.readFile(LOCKFILE, "utf8"));
  const packages = [];

  if (lock.packages) {
    for (const [pkgPath, meta] of Object.entries(lock.packages)) {
      if (!pkgPath || pkgPath === "") continue;
      const name = pkgPath.startsWith("node_modules/")
        ? pkgPath.slice("node_modules/".length)
        : pkgPath;
      packages.push({
        name,
        version: meta.version ?? null,
        license: meta.license ?? null,
        dev: Boolean(meta.dev),
        optional: Boolean(meta.optional),
      });
    }
  } else if (lock.dependencies) {
    for (const [name, meta] of Object.entries(lock.dependencies)) {
      packages.push({
        name,
        version: meta.version ?? null,
        license: null,
        dev: Boolean(meta.dev),
        optional: Boolean(meta.optional),
      });
    }
  }

  packages.sort((left, right) => left.name.localeCompare(right.name));

  const document = {
    bomFormat: "VEYVIO-NPM-INVENTORY",
    specVersion: "1.0",
    generatedAt: new Date().toISOString(),
    component: {
      name: "@veyvio/executive",
      version: lock.version ?? "0.0.0",
    },
    dependencies: packages,
    count: packages.length,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  console.log(`SBOM written: ${path.relative(PROJECT_ROOT, OUTPUT)} (${packages.length} packages)`);
}

await main();
