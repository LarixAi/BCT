import { describe, expect, it, vi } from 'vitest'
import { createCommandAuthAdapter } from './command-adapter'

function token(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `header.${encoded}.signature`
}

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

describe('Command finance authentication adapter', () => {
  it('uses only backend-filtered finance memberships', async () => {
    const accessToken = token({
      sub: 'user-1',
      email: 'finance@example.test',
      user_metadata: { first_name: 'Fin', last_name: 'Manager' },
    })
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({
        accessToken,
        refreshToken: 'refresh-1',
        requiresTenantSelection: true,
        memberships: [{
          tenantId: 'company-ops',
          tenantName: 'Operations only',
          role: 'member',
        }],
      }))
      .mockResolvedValueOnce(json({
        memberships: [{
          companyId: 'company-finance',
          tenantName: 'Finance Company',
          role: 'finance_manager',
        }],
      }))

    const adapter = createCommandAuthAdapter({
      apiBaseUrl: 'https://example.supabase.co/functions/v1/command-api',
      anonKey: 'anon-key',
      fetchImpl,
      storage: memoryStorage(),
    })
    const result = await adapter.signIn({
      email: 'Finance@Example.test',
      password: 'safe-password',
    })

    expect(result).toMatchObject({
      kind: 'signed_in',
      identity: {
        userSubject: 'user-1',
        displayName: 'Fin Manager',
        memberships: [{
          organisationId: 'company-finance',
          role: 'finance_manager',
        }],
      },
    })
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      'https://example.supabase.co/functions/v1/command-api/api/auth/finance-memberships',
    )
  })

  it('returns an MFA challenge without persisting a signed-in identity', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json({
      requiresMfaChallenge: true,
      mfaChallengeId: 'challenge-1',
      pendingCompanyId: 'company-1',
    }))
    const adapter = createCommandAuthAdapter({
      apiBaseUrl: 'https://api.example.test',
      anonKey: 'anon-key',
      fetchImpl,
      storage: memoryStorage(),
    })

    await expect(adapter.signIn({
      email: 'finance@example.test',
      password: 'safe-password',
    })).resolves.toEqual({
      kind: 'mfa_required',
      challengeId: 'challenge-1',
      pendingCompanyId: 'company-1',
    })
    await expect(adapter.getIdentity()).resolves.toBeNull()
  })
})
