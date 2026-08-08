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
    mustNot: [/MOCK_CONVERSATIONS/, /from\s*['"]@\/lib\/messages\/mock-conversations['"]/],
    must: [/from\s*['"]@\/lib\/messages\/conversation-utils['"]/],
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
  {
    file: 'Veyvio admin /supabase/functions/_shared/hubs.ts',
    mustNot: [/Fire extinguisher/, /eq-live-/, /card-live-/, /stk-live-adblue/],
    must: [/do not invent kit/, /listTyreAssets/],
  },
  {
    file: 'Veyvio admin /supabase/functions/command-api/index.ts',
    must: [/fleet-resources\/tyres\/fit/, /fleet-resources\/tyres\/remove/, /fleet-resources\/tyres\/rotate/],
  },
  {
    file: 'veyvio-website/server/demo-handler.ts',
    must: [/persisted:\s*true/, /store\.save/, /crmStatus/],
    mustNot: [/Enquiry received\. We will be in touch shortly\. \(Confirmation email pending/],
  },
  {
    file: 'Veyvio admin /src/lib/fleet-resources/resolve-hub.ts',
    mustNot: [
      /enrichSparseLiveHub/,
      /createFleetResourcesSeed/,
      /from\s*['"]\.\/seed['"]/,
      /await import\(['"]\.\/seed['"]\)/,
      /source:\s*['"]demo['"]/,
      /VITE_MOCK_API/,
    ],
    must: [/source:\s*['"]unavailable['"]/, /emptyFleetResourcesHub/],
  },
  {
    file: 'Veyvio admin /src/lib/inspections/resolve-hub.ts',
    mustNot: [
      /createInspectionSeed/,
      /from\s*['"]\.\/seed['"]/,
      /await import\(['"]\.\/seed['"]\)/,
      /source:\s*['"]demo['"]/,
      /VITE_MOCK_API/,
    ],
    must: [/source:\s*['"]unavailable['"]/, /projectInspectionsFromProfiles/],
  },
  {
    file: 'Veyvio admin /src/features/fleet-resources/FleetResourcesPage.tsx',
    mustNot: [/showing demo ledger/],
    must: [/source === 'unavailable'/, /Demo ledger is not used/],
  },
  {
    file: 'Veyvio admin /src/features/inspections/InspectionsPage.tsx',
    mustNot: [/showing demo inspection register/],
  },
  {
    file: 'Veyvio admin /src/features/fleet-resources/PurchasingTab.tsx',
    mustNot: [/No purchase requests\./],
    must: [/Purchasing is not filled with demo spend/],
  },
  {
    file: 'src/platform/yard/hydrate-yard-store.ts',
    mustNot: [/@\/data\/mocks\/bootstrap/],
    must: [/normalizeLiveBootstrapPayload/, /@\/platform\/yard\/bootstrap-payload/],
  },
  {
    file: 'src/platform/api/map-yard-hub.ts',
    mustNot: [/@\/data\/mocks\/bootstrap/],
    must: [/@\/platform\/yard\/bootstrap-payload/],
  },
  {
    file: 'src/store/yard.ts',
    mustNot: [/@\/data\/mocks\/bootstrap/],
    must: [/@\/platform\/yard\/bootstrap-payload/],
  },
  {
    file: 'Veyvio admin /src/lib/inspections/empty-hub.ts',
    mustNot: [/from\s*['"]\.\/seed['"]/, /INSPECTION_PROVIDERS/],
    must: [/providers:\s*\[\s*\]/],
  },
  {
    file: 'src/routes/_app.tsx',
    mustNot: [/@\/data\/mocks\/tenancy/],
    must: [/ensureDevBypassTenancy/],
  },
  {
    file: 'src/routes/_public.depot-select.tsx',
    mustNot: [/import\s*\{[^}]*depotsForCompany[^}]*\}\s*from\s*['"]@\/data\/mocks\/tenancy['"]/],
    must: [/await import\(['"]@\/data\/mocks\/tenancy['"]\)/],
  },
  {
    file: 'Veyvio admin /supabase/functions/_shared/hubs.ts',
    must: [/listPurchaseRequests/],
  },
  {
    file: 'Veyvio admin /supabase/functions/command-api/index.ts',
    must: [/fleet-resources\/purchases/, /approvePurchaseRequest/],
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
