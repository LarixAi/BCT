/**
 * Static assert: driver-training-centre Type A path uses UserScopedDb for driver_training.
 * Run: node scripts/driver-training-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const src = await readFile(
  new URL('../supabase/functions/_shared/driver-training-centre.ts', import.meta.url),
  'utf8',
)

assert.match(src, /userScopedDb\(input\.context, 'driver_training'\)/)
assert.match(src, /resolveTenantDb\(input\.companyId, 'driver_training'\)/)
assert.match(src, /trainingDb\([\s\S]*?\)[\s\S]*?\.from\('driver_training'\)/)
assert.match(src, /trainingSideEffectsDb/)
assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)
assert.match(src, /context\?: RequestContext/)

console.log('driver-training-authority.unit.mjs: ok')
