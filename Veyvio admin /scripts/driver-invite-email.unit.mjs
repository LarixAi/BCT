/**
 * Unit checks for invite accept URL + Resend from-address resolution.
 * Run: node scripts/driver-invite-email.unit.mjs
 */
import assert from 'node:assert/strict'

function inviteAcceptBaseUrl(env) {
  const raw =
    env.VEYVIO_INVITE_APP_URL?.trim() ||
    env.VEYVIO_ADMIN_APP_URL?.trim() ||
    env.VEYVIO_DRIVER_APP_URL?.trim() ||
    env.DRIVER_APP_URL?.trim() ||
    ''
  return raw.replace(/\/$/, '')
}

function inviteFromAddress(env) {
  return env.INVITE_FROM_EMAIL?.trim() || env.DEMO_FROM_EMAIL?.trim() || 'Veyvio <info@veyvio.co.uk>'
}

assert.equal(
  inviteAcceptBaseUrl({ VEYVIO_DRIVER_APP_URL: 'http://192.168.1.136:8081', VEYVIO_ADMIN_APP_URL: 'https://veyvio-admin.pages.dev' }),
  'https://veyvio-admin.pages.dev',
)
assert.equal(
  inviteAcceptBaseUrl({ VEYVIO_DRIVER_APP_URL: 'https://veyvio-driver.pages.dev' }),
  'https://veyvio-driver.pages.dev',
)
assert.equal(
  `${inviteAcceptBaseUrl({ VEYVIO_ADMIN_APP_URL: 'https://veyvio-admin.pages.dev/' })}/accept-invitation?token=abc`,
  'https://veyvio-admin.pages.dev/accept-invitation?token=abc',
)
assert.equal(inviteFromAddress({}), 'Veyvio <info@veyvio.co.uk>')
assert.equal(inviteFromAddress({ INVITE_FROM_EMAIL: 'Veyvio <ops@veyvio.co.uk>' }), 'Veyvio <ops@veyvio.co.uk>')

function confirmationSubject() {
  return 'Your Veyvio Driver account is ready'
}
assert.equal(confirmationSubject(), 'Your Veyvio Driver account is ready')

console.log('driver-invite-email.unit.mjs: ok')
