/**
 * Static assert: driver-requirements Type A uses UserScopedDb.
 * Run: node scripts/driver-requirements-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/driver-requirements.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(input\.context, table\)/)
assert.match(src, /reqTableDb\('driver_requirements'/)
assert.match(src, /reqTableDb\('driver_requirement_requests'/)
assert.match(src, /reqSideEffectsDb/)
assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)

console.log('driver-requirements-authority.unit.mjs: ok')
