/**
 * FCM pure mapping checks (Gate 3 push).
 * Run: npx tsx scripts/fcm-send.unit.mjs
 */
import assert from 'node:assert/strict'
import {
  buildFcmMessage,
  isSendCapablePushToken,
  parseServiceAccountJson,
  screenForDriverOpsNotificationType,
} from '../supabase/functions/_shared/fcm-send.mapping.ts'

assert.equal(isSendCapablePushToken('web-session:abc'), false)
assert.equal(isSendCapablePushToken(''), false)
assert.equal(isSendCapablePushToken(null), false)
assert.equal(isSendCapablePushToken('fcm-device-token-xyz'), true)

assert.equal(parseServiceAccountJson(null), null)
assert.equal(parseServiceAccountJson('{bad'), null)
assert.equal(parseServiceAccountJson(JSON.stringify({ project_id: 'x' })), null)

const sa = parseServiceAccountJson(
  JSON.stringify({
    project_id: 'veyvio-d3632',
    private_key: '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
    client_email: 'veyvio-fcm@veyvio-d3632.iam.gserviceaccount.com',
  }),
)
assert.equal(sa?.project_id, 'veyvio-d3632')
assert.equal(sa?.client_email, 'veyvio-fcm@veyvio-d3632.iam.gserviceaccount.com')

const message = buildFcmMessage({
  token: 'tok',
  title: 'Duty published',
  body: 'Open My duty',
  data: { type: 'driver.duty.published', screen: 'duty_published', dutyId: 'd1' },
})
assert.equal(message.message.token, 'tok')
assert.equal(message.message.notification.title, 'Duty published')
assert.equal(message.message.data.screen, 'duty_published')
assert.equal(message.message.data.type, 'driver.duty.published')
assert.equal(message.message.android?.priority, 'HIGH')

assert.equal(screenForDriverOpsNotificationType('driver.duty.published'), 'duty_published')
assert.equal(screenForDriverOpsNotificationType('driver.compliance.warning'), 'Documents')

console.log('fcm-send.unit.mjs: all checks passed')
