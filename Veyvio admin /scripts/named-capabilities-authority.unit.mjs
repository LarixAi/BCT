/**
 * Static assert: Type B writers use named capabilities (no bare admin).
 * Run: node scripts/named-capabilities-authority.unit.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const auth = await readFile(new URL('../supabase/functions/_shared/db-authority.ts', import.meta.url), 'utf8')
assert.match(auth, /export function auditWriterDb/)
assert.match(auth, /export function domainEventWriterDb/)
assert.match(auth, /export function pushSenderDb/)
assert.match(auth, /export function overrideAuditWriterDb/)
assert.match(auth, /export function entitlementReaderDb/)
assert.match(auth, /export function platformAdminDb/)
assert.match(auth, /export function projectionReaderDb/)
assert.match(auth, /export function resolveProjectionDb/)
assert.match(auth, /export function resolveTenantDb/)
assert.match(auth, /export function enterActiveRequestContext/)

for (const [file, needle] of [
  ['audit-service.ts', /auditWriterDb\(/],
  ['domain-events.ts', /domainEventWriterDb\(/],
  ['override-audit.ts', /overrideAuditWriterDb\(/],
  ['fcm-send.ts', /pushSenderDb\(/],
  ['driver-ops-notifications.ts', /resolveTenantDb\(/],
  ['entitlements.ts', /entitlementReaderDb\(/],
  ['projections.ts', /resolveProjectionDb\(/],
]) {
  const src = await readFile(new URL(`../supabase/functions/_shared/${file}`, import.meta.url), 'utf8')
  assert.match(src, needle)
  assert.doesNotMatch(src, /\bimport\s*\{[^}]*\badmin\b/)
}

console.log('named-capabilities-authority.unit.mjs: ok')
