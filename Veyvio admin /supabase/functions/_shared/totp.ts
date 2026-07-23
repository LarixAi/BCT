/**
 * RFC 6238 TOTP (SHA-1, 6 digits, 30s) for Command authenticator MFA.
 * Uses Web Crypto only — no npm dependency in the edge runtime.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpSecret(byteLength = 20): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return base32Encode(bytes)
}

export function buildOtpauthUri(input: {
  secret: string
  accountName: string
  issuer?: string
}): string {
  const issuer = input.issuer ?? 'Veyvio Command'
  const label = `${issuer}:${input.accountName}`
  const params = new URLSearchParams({
    secret: input.secret.replace(/\s+/g, '').toUpperCase(),
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`
}

export async function verifyTotpCode(
  secret: string,
  code: string,
  options?: { window?: number; stepSeconds?: number; digits?: number },
): Promise<boolean> {
  const trimmed = code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(trimmed)) return false
  const window = options?.window ?? 1
  const stepSeconds = options?.stepSeconds ?? 30
  const digits = options?.digits ?? 6
  const counter = Math.floor(Date.now() / 1000 / stepSeconds)
  for (let offset = -window; offset <= window; offset++) {
    const expected = await hotp(secret, counter + offset, digits)
    if (expected === trimmed) return true
  }
  return false
}

async function hotp(secret: string, counter: number, digits: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const counterBytes = new Uint8Array(8)
  let value = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = value & 0xff
    value = Math.floor(value / 256)
  }
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes))
  const offset = signature[signature.length - 1] & 0x0f
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff)
  const otp = binary % 10 ** digits
  return String(otp).padStart(digits, '0')
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

function base32Decode(secret: string): Uint8Array {
  const cleaned = secret.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) throw new Error('Authenticator secret is invalid')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(bytes)
}
