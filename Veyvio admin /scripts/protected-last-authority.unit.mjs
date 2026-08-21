/**
 * Static assert: protected-last modules no longer import bare admin.
 * Run: node scripts/protected-last-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

for (const [file, needles] of [
  ['application-scopes.ts', [/userScopedDb\(context, 'membership_application_access'\)/]],
  ['entitlements.ts', [/entitlementReaderDb\(/, /platformAdminDb\(/]],
  ['body-condition.ts', [/bodyTableDb\(/, /userScopedDb\(/]],
]) {
  const src = await readFile(
    new URL(`../supabase/functions/_shared/${file}`, import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)
  for (const n of needles) assert.match(src, n, `${file} missing ${n}`)
}

const api = await readFile(
  new URL('../supabase/functions/command-api/index.ts', import.meta.url),
  'utf8',
)
assert.doesNotMatch(api, /import \{[^}]*\badmin\b[^}]*\} from '\.\.\/_shared\/supabase/)
assert.match(api, /COMMAND_USER_SCOPED_TABLES/)
assert.match(api, /userScopedDb\(context, table\)/)
assert.match(api, /enterActiveRequestContext\(context\)/)
assert.match(api, /getActiveRequestContext\(\)/)

const auth = await readFile(
  new URL('../supabase/functions/_shared/db-authority.ts', import.meta.url),
  'utf8',
)
assert.match(auth, /export function entitlementReaderDb/)
assert.match(auth, /export function platformAdminDb/)
assert.match(auth, /export function projectionReaderDb/)
assert.match(auth, /export function resolveProjectionDb/)
assert.match(auth, /export function resolveTenantDb/)
assert.match(auth, /AsyncLocalStorage/)

console.log('protected-last-authority.unit.mjs: ok')
