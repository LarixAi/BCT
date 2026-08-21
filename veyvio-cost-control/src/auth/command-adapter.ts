import type { FinanceRole } from '../server/finance-api'
import type {
  AuthAdapter,
  AuthIdentity,
  AuthMembership,
  AuthSignInResult,
} from './types'

type CommandUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

type CommandMembership = {
  companyId?: string
  tenantId?: string
  tenantName?: string
  role: FinanceRole
}

type LoginResponse = {
  accessToken?: string
  refreshToken?: string
  requiresTenantSelection?: boolean
  requiresMfaChallenge?: boolean
  mfaChallengeId?: string
  pendingCompanyId?: string | null
  memberships?: CommandMembership[]
  user?: CommandUser
}

type TokenResponse = {
  accessToken: string
  refreshToken: string
  user?: CommandUser
  memberships?: CommandMembership[]
  requiresTenantSelection?: boolean
}

type PersistedSession = {
  accessToken: string
  refreshToken: string
  identity: AuthIdentity | null
  pendingMemberships: AuthMembership[]
}

type CommandAuthConfig = {
  apiBaseUrl: string
  anonKey: string
  fetchImpl?: typeof fetch
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

const SESSION_KEY = 'veyvio-finance-auth-v1'

function endpoint(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return base.includes('/functions/v1/') ? `${base}/api${suffix}` : `${base}/api${suffix}`
}

function browserStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage
}

function readSession(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): PersistedSession | null {
  try {
    const value = storage?.getItem(SESSION_KEY)
    return value ? (JSON.parse(value) as PersistedSession) : null
  } catch {
    storage?.removeItem(SESSION_KEY)
    return null
  }
}

function memberships(input: CommandMembership[] | undefined): AuthMembership[] {
  return (input ?? []).flatMap((item) => {
    const organisationId = item.companyId ?? item.tenantId
    if (!organisationId || !item.role) return []
    return [{
      organisationId,
      organisationName: item.tenantName?.trim() || 'Company',
      role: item.role,
    }]
  })
}

function displayName(user: CommandUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email
}

function userFromAccessToken(accessToken: string): CommandUser {
  try {
    const encoded = accessToken.split('.')[1]
    if (!encoded) throw new Error('Missing token payload')
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(normalized)) as {
      sub?: string
      email?: string
      user_metadata?: { first_name?: string; last_name?: string }
    }
    if (!payload.sub || !payload.email) throw new Error('Missing identity claims')
    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.user_metadata?.first_name,
      lastName: payload.user_metadata?.last_name,
    }
  } catch {
    throw new Error('Sign in failed — the secure session was invalid')
  }
}

async function responseJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message ?? fallback
    throw Object.assign(new Error(message), { status: response.status })
  }
  return response.json() as Promise<T>
}

export function createCommandAuthAdapter(config: CommandAuthConfig): AuthAdapter {
  const fetchImpl = config.fetchImpl ?? fetch
  const storage = config.storage ?? browserStorage()
  let session = readSession(storage)

  const save = (next: PersistedSession | null) => {
    session = next
    if (next) storage?.setItem(SESSION_KEY, JSON.stringify(next))
    else storage?.removeItem(SESSION_KEY)
  }

  const request = async <T>(
    path: string,
    init: RequestInit,
    accessToken?: string,
  ): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken ?? config.anonKey}`,
    }
    let response: Response
    try {
      response = await fetchImpl(endpoint(config.apiBaseUrl, path), {
        ...init,
        headers: { ...headers, ...(init.headers ?? {}) },
      })
    } catch {
      throw new Error('Could not reach Veyvio sign-in — check your connection')
    }
    return responseJson<T>(response, 'Veyvio sign-in request failed')
  }

  const financeMemberships = (accessToken: string) =>
    request<{ memberships: CommandMembership[] }>(
      '/auth/finance-memberships',
      { method: 'GET' },
      accessToken,
    ).then((result) => memberships(result.memberships))

  const identityFrom = async (
    result: TokenResponse | LoginResponse,
  ): Promise<AuthIdentity> => {
    if (!result.accessToken) throw new Error('Sign in failed — no secure session was returned')
    const user = result.user ?? userFromAccessToken(result.accessToken)
    const allowed = await financeMemberships(result.accessToken)
    const identity: AuthIdentity = {
      userSubject: user.id,
      email: user.email,
      displayName: displayName(user),
      accessToken: result.accessToken,
      memberships: allowed,
    }
    save({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? session?.refreshToken ?? '',
      identity,
      pendingMemberships: identity.memberships,
    })
    return identity
  }

  return {
    async getIdentity() {
      if (!session?.accessToken || !session.identity) return null
      try {
        const user = await request<CommandUser>(
          '/auth/me',
          { method: 'GET' },
          session.accessToken,
        )
        const allowed = await financeMemberships(session.accessToken)
        const identity: AuthIdentity = {
          ...session.identity,
          userSubject: user.id,
          email: user.email,
          displayName: displayName(user),
          memberships: allowed,
        }
        save({ ...session, identity, pendingMemberships: allowed })
        return identity
      } catch {
        save(null)
        return null
      }
    },
    async signIn(input): Promise<AuthSignInResult> {
      const result = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: input.email.trim().toLowerCase(),
          password: input.password,
        }),
      })
      if (result.requiresMfaChallenge && result.mfaChallengeId) {
        return {
          kind: 'mfa_required',
          challengeId: result.mfaChallengeId,
          pendingCompanyId: result.pendingCompanyId ?? null,
        }
      }
      const pending = memberships(result.memberships)
      if (result.requiresTenantSelection && result.accessToken) {
        save({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken ?? '',
          identity: null,
          pendingMemberships: pending,
        })
      }
      return { kind: 'signed_in', identity: await identityFrom(result) }
    },
    async completeMfa(input) {
      const result = await request<TokenResponse>('/auth/login/confirm', {
        method: 'POST',
        body: JSON.stringify({
          challengeId: input.challengeId,
          code: input.code,
          companyId: input.pendingCompanyId ?? undefined,
        }),
      })
      return identityFrom(result)
    },
    async selectOrganisation(organisationId) {
      if (!session?.refreshToken) throw new Error('Session expired — sign in again')
      const result = await request<TokenResponse>(
        '/auth/select-tenant',
        {
          method: 'POST',
          body: JSON.stringify({
            companyId: organisationId,
            tenantId: organisationId,
            refreshToken: session.refreshToken,
          }),
        },
        session.accessToken,
      )
      return identityFrom(result)
    },
    async signOut() {
      save(null)
    },
    async requestPasswordReset(email) {
      await request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
    },
    async updatePassword(input) {
      await request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: input.resetToken, password: input.password }),
      })
    },
    async acceptInvitation(input) {
      const names = input.displayName.trim().split(/\s+/)
      await request('/auth/accept-invitation', {
        method: 'POST',
        body: JSON.stringify({
          token: input.invitationToken,
          password: input.password,
          firstName: names.shift() ?? '',
          lastName: names.join(' '),
        }),
      })
      return null
    },
  }
}

export function readCommandAuthConfig(
  env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>,
): CommandAuthConfig | null {
  const apiBaseUrl = env.VITE_API_URL?.trim() || env.VITE_COMMAND_API_BASE_URL?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()
  return apiBaseUrl && anonKey ? { apiBaseUrl, anonKey } : null
}
