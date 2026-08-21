#!/usr/bin/env node
/**
 * Fail CI if any page references a claim id that is not approvedForPublic.
 * Scans tier-one-pages.ts and solution-pages.ts for claimIds arrays.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseClaimsRegister() {
  const text = readFileSync(join(root, "src/lib/claims-register.ts"), "utf8");
  /** @type {Map<string, boolean>} */
  const map = new Map();
  const blocks = text.split(/\{\s*\n\s*id:/).slice(1);
  for (const block of blocks) {
    const idMatch = block.match(/^ "([^"]+)"/);
    const approved = /approvedForPublic:\s*true/.test(block);
    if (idMatch) map.set(idMatch[1], approved);
  }
  return map;
}

function collectClaimIdsFromFile(relPath) {
  const text = readFileSync(join(root, relPath), "utf8");
  const ids = [];
  for (const match of text.matchAll(/claimIds:\s*\[([^\]]*)\]/g)) {
    for (const id of match[1].matchAll(/"([^"]+)"/g)) {
      ids.push(id[1]);
    }
  }
  return ids;
}

function collectInlineClaimRefs() {
  const ids = [];
  for (const rel of ["src/components/sections/BelowFoldPreview.tsx", "src/pages/HeroPage.tsx"]) {
    try {
      const text = readFileSync(join(root, rel), "utf8");
      for (const match of text.matchAll(/assertClaimApproved\(\s*"([^"]+)"/g)) {
        ids.push(match[1]);
      }
    } catch {
      /* optional files */
    }
  }
  return ids;
}

const register = parseClaimsRegister();
const used = [
  ...collectClaimIdsFromFile("src/content/tier-one-pages.ts"),
  ...collectClaimIdsFromFile("src/content/solution-pages.ts"),
  ...collectInlineClaimRefs(),
];

const failures = [];
for (const id of [...new Set(used)]) {
  if (!register.has(id)) {
    failures.push(`${id}: unknown claim id`);
  } else if (!register.get(id)) {
    failures.push(`${id}: not approvedForPublic`);
  }
}

if (failures.length) {
  console.error("Claims publish check failed:\n");
  for (const f of failures) console.error("  -", f);
  process.exit(1);
}

console.log(`Claims publish check passed (${used.length} references, ${register.size} register entries).`);
