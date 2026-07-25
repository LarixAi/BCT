/**
 * Unit checks for F-13 tenant-scoped storage path helpers.
 */
import assert from 'node:assert/strict'

function buildTenantStoragePath(companyId, ...segments) {
  const company = String(companyId ?? '').trim()
  if (!company) throw new Error('companyId required')
  const parts = segments
    .map((s) => String(s ?? '').trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .flatMap((s) => s.split('/'))
    .filter((p) => p && p !== '.' && p !== '..')
  if (!parts.length) throw new Error('segments required')
  return [company, ...parts].join('/')
}

function assertTenantStorageKey(companyId, storageKey) {
  const key = String(storageKey ?? '').replace(/^\/+/, '')
  const prefix = `${String(companyId).trim()}/`
  const orgPrefix = `org/${String(companyId).trim()}/`
  if (!key || key.includes('..')) throw new Error('invalid')
  if (!key.startsWith(prefix) && !key.startsWith(orgPrefix)) throw new Error('forbidden')
  return key
}

const companyId = '95806a06-535b-4e67-ae8f-62760de5e53f'
assert.equal(
  buildTenantStoragePath(companyId, 'drivers', 'd1', 'licence', 'file.jpg'),
  `${companyId}/drivers/d1/licence/file.jpg`,
)
assert.equal(assertTenantStorageKey(companyId, `${companyId}/drivers/d1/x.jpg`), `${companyId}/drivers/d1/x.jpg`)
assert.equal(assertTenantStorageKey(companyId, `org/${companyId}/media/a.jpg`), `org/${companyId}/media/a.jpg`)
assert.throws(() => assertTenantStorageKey(companyId, 'other-company/x.jpg'))
assert.throws(() => assertTenantStorageKey(companyId, `${companyId}/../escape.jpg`))
assert.throws(() => buildTenantStoragePath('', 'a'))

console.log('signed-storage.unit: ok')
