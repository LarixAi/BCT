/**
 * Pure FCM helpers — no Deno / admin imports (unit-testable via tsx).
 */

export type FcmServiceAccount = {
  type?: string
  project_id: string
  private_key: string
  client_email: string
  token_uri?: string
}

export type FcmMessageInput = {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

/** Reject web presence placeholders and empty tokens. */
export function isSendCapablePushToken(token: unknown): boolean {
  if (typeof token !== 'string') return false
  const trimmed = token.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('web-session:')) return false
  return true
}

export function parseServiceAccountJson(raw: string | null | undefined): FcmServiceAccount | null {
  if (!raw || !String(raw).trim()) return null
  try {
    const parsed = JSON.parse(String(raw)) as Record<string, unknown>
    const projectId = typeof parsed.project_id === 'string' ? parsed.project_id : ''
    const privateKey = typeof parsed.private_key === 'string' ? parsed.private_key : ''
    const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email : ''
    if (!projectId || !privateKey || !clientEmail) return null
    return {
      type: typeof parsed.type === 'string' ? parsed.type : undefined,
      project_id: projectId,
      private_key: privateKey,
      client_email: clientEmail,
      token_uri: typeof parsed.token_uri === 'string' ? parsed.token_uri : undefined,
    }
  } catch {
    return null
  }
}

/** FCM HTTP v1 message body — all data values must be strings. */
export function buildFcmMessage(input: FcmMessageInput): {
  message: {
    token: string
    notification: { title: string; body: string }
    data: Record<string, string>
    android?: { priority: string }
  }
} {
  const data: Record<string, string> = {}
  for (const [key, value] of Object.entries(input.data ?? {})) {
    if (value == null) continue
    data[key] = String(value)
  }
  return {
    message: {
      token: input.token,
      notification: {
        title: input.title,
        body: input.body,
      },
      data,
      android: { priority: 'HIGH' },
    },
  }
}

export function screenForDriverOpsNotificationType(type: string): string {
  switch (type) {
    case 'driver.duty.published':
      return 'duty_published'
    case 'driver.compliance.warning':
      return 'Documents'
    case 'driver.vehicle.vor':
    case 'driver.vehicle.awaiting_check':
      return 'Defects'
    case 'driver.defect.follow_up':
      return 'Defects'
    default:
      return 'Notifications'
  }
}
