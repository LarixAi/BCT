/**
 * F-03 Gate 0 — source scanners for known fake-truth injectors.
 * Run: node scripts/f03-gate0-scanner.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

const checks = [
  {
    file: 'Veyvio admin /src/features/exceptions/ExceptionsPage.tsx',
    mustNot: [/includeCatalog:\s*true/],
    must: [/includeCatalog:\s*false/],
  },
  {
    file: 'Veyvio admin /src/features/dispatch/DispatchPage.tsx',
    mustNot: [/includeCatalog:\s*true/],
  },
  {
    file: 'Veyvio admin /src/features/messages/MessagesPage.tsx',
    mustNot: [/MOCK_CONVERSATIONS/],
  },
  {
    file: 'Veyvio admin /src/lib/inspections/resolve-hub.ts',
    mustNot: [/DEV\s*===\s*true/],
  },
  {
    file: 'Veyvio admin /src/lib/fleet-resources/resolve-hub.ts',
    mustNot: [/DEV\s*===\s*true/],
  },
  {
    file: 'Veyvio admin /src/lib/journey-sequence/api.ts',
    mustNot: [/12\.4/, /\b48\b.*duration/],
  },
  {
    file: 'src/domain/upcoming/build-upcoming-feed.ts',
    must: [/includeComplianceFixtures === true/],
    mustNot: [/includeComplianceFixtures !== false/],
  },
  {
    file: 'src/platform/api/map-yard-hub.ts',
    mustNot: [/defaultSpatialYardLayout/],
  },
  {
    file: 'src/data/mocks/bootstrap.ts',
    mustNot: [/defaultYardBays/],
  },
  {
    file: 'src/platform/auth/auth-config.ts',
    must: [/import\.meta\.env\.PROD/],
  },
]

let failures = 0
for (const check of checks) {
  const content = read(check.file)
  for (const re of check.mustNot ?? []) {
    if (re.test(content)) {
      console.error(`FAIL ${check.file}: must not match ${re}`)
      failures += 1
    }
  }
  for (const re of check.must ?? []) {
    if (!re.test(content)) {
      console.error(`FAIL ${check.file}: must match ${re}`)
      failures += 1
    }
  }
}

assert.equal(failures, 0, `F-03 Gate 0 scanner failed with ${failures} finding(s)`)
console.log('f03-gate0-scanner.mjs: PASS')
