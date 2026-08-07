/**
 * Shared redaction for security_events / security_alerts metadata (SEC-0908).
 * Never persist passwords, tokens, cookies, recovery codes, or document bodies.
 */

const SENSITIVE_KEY_PATTERN =
  /pass(word|phrase)|secret|token|cookie|authorization|recovery.?code|otp|totp|session|jwt|api.?key|private.?key|contentBase64|documentBody|fileBytes|signedUrl|refresh_token|access_token/i

export function sanitizeSecurityMetadata(
  value: unknown,
  depth = 0,
): Record<string, unknown> | unknown[] | string | number | boolean | null {
  if (depth > 6) return '[truncated]'
  if (value == null) return null
  if (typeof value === 'string') {
    if (value.length > 500) return `${value.slice(0, 120)}…[redacted_length=${value.length}]`
    if (/^(eyJ|sb_secret_|sk_|rk_)/.test(value)) return '[redacted_credential]'
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((entry) => sanitizeSecurityMetadata(entry, depth + 1))
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = '[redacted]'
        continue
      }
      out[key] = sanitizeSecurityMetadata(entry, depth + 1)
    }
    return out
  }
  return String(value)
}
