/**
 * FCM HTTP v1 delivery for Driver devices.
 * F-29: notifications never create business state — call only after in-app insert.
 */
import { pushSenderDb } from './db-authority.ts'
import {
  buildFcmMessage,
  isSendCapablePushToken,
  parseServiceAccountJson,
  screenForDriverOpsNotificationType,
  type FcmServiceAccount,
} from './fcm-send.mapping.ts'

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  const binary = atob(cleaned)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function signJwtRs256(unsignedJwt: string, privateKeyPem: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedJwt),
  )
  return `${unsignedJwt}.${base64UrlEncode(new Uint8Array(signature))}`
}

async function fetchAccessToken(sa: FcmServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000) {
    return cachedAccessToken.token
  }

  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const claim = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: FCM_SCOPE,
      }),
    ),
  )
  const assertion = await signJwtRs256(`${header}.${claim}`, sa.private_key)
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token'
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  })
  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) {
    console.error('fcm oauth token failed', response.status, await response.text())
    return null
  }
  const json = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) return null
  cachedAccessToken = {
    token: json.access_token,
    expiresAtMs: Date.now() + Math.max(60, Number(json.expires_in ?? 3600) - 60) * 1000,
  }
  return json.access_token
}

async function sendOneMessage(input: {
  sa: FcmServiceAccount
  accessToken: string
  token: string
  title: string
  body: string
  data: Record<string, string>
}): Promise<{ ok: boolean; status: number }> {
  const payload = buildFcmMessage({
    token: input.token,
    title: input.title,
    body: input.body,
    data: input.data,
  })
  const url = `https://fcm.googleapis.com/v1/projects/${input.sa.project_id}/messages:send`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    console.error('fcm send failed', response.status, await response.text())
  }
  return { ok: response.ok, status: response.status }
}

/**
 * Best-effort FCM fan-out to active Driver devices for one driver in one company.
 * Never throws — duty publish must not fail because push failed.
 */
export async function sendFcmToDriver(input: {
  companyId: string
  driverId: string
  title: string
  body: string
  type: string
  dutyId?: string | null
  actionUrl?: string | null
}): Promise<{ attempted: number; sent: number; skipped: boolean }> {
  const sa = parseServiceAccountJson(Deno.env.get('FCM_SERVICE_ACCOUNT_JSON'))
  if (!sa) {
    console.warn('FCM_SERVICE_ACCOUNT_JSON missing or invalid — skipping push')
    return { attempted: 0, sent: 0, skipped: true }
  }

  const { data: devices, error } = await pushSenderDb(input.companyId, 'driver_devices_lookup')
    .from('driver_devices')
    .select('push_token,platform,is_active')
    .eq('organisation_id', input.companyId)
    .eq('driver_id', input.driverId)
    .eq('is_active', true)

  if (error) {
    console.error('driver_devices lookup failed', error.message)
    return { attempted: 0, sent: 0, skipped: false }
  }

  const tokens = [...new Set(
    (devices ?? [])
      .map((row) => String((row as { push_token?: string }).push_token ?? ''))
      .filter(isSendCapablePushToken),
  )]

  if (!tokens.length) return { attempted: 0, sent: 0, skipped: false }

  const accessToken = await fetchAccessToken(sa)
  if (!accessToken) return { attempted: tokens.length, sent: 0, skipped: false }

  const data: Record<string, string> = {
    type: input.type,
    screen: screenForDriverOpsNotificationType(input.type),
  }
  if (input.dutyId) data.dutyId = String(input.dutyId)
  if (input.actionUrl) data.actionUrl = String(input.actionUrl)

  let sent = 0
  for (const token of tokens) {
    try {
      const result = await sendOneMessage({
        sa,
        accessToken,
        token,
        title: input.title,
        body: input.body,
        data,
      })
      if (result.ok) sent += 1
    } catch (err) {
      console.error('fcm send exception', err)
    }
  }

  return { attempted: tokens.length, sent, skipped: false }
}
