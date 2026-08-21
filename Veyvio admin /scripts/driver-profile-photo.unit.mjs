/**
 * Unit checks for driver profile photo storage path convention.
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

function profilePhotoPath(companyId, driverId, ext = 'jpg') {
  return buildTenantStoragePath(companyId, 'drivers', driverId, 'profile', `avatar.${ext}`)
}

const companyId = '95806a06-535b-4e67-ae8f-62760de5e53f'
const driverId = '9222e9a2-ff63-405b-b6ed-67bf3c12d3c3'

assert.equal(
  profilePhotoPath(companyId, driverId),
  `${companyId}/drivers/${driverId}/profile/avatar.jpg`,
)
assert.equal(
  profilePhotoPath(companyId, driverId, 'png'),
  `${companyId}/drivers/${driverId}/profile/avatar.png`,
)
assert.ok(profilePhotoPath(companyId, driverId).startsWith(`${companyId}/`))
assert.throws(() => profilePhotoPath('', driverId))

console.log('driver-profile-photo.unit: ok')
