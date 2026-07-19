import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { AuthUser, TenantMembershipOption } from './api/types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{
    requiresTenantSelection: boolean
    requiresMfaChallenge?: boolean
    mfaChallengeId?: string
    devMfaCode?: string
    pendingCompanyId?: string | null
    accessToken?: string
    refreshToken?: string
    memberships: TenantMembershipOption[]
    tenantStatus?: string | null
  }>
  verifyMfa: (input: {
    challengeId: string
    code: string
    companyId?: string | null
    accessToken?: string | null
    refreshToken?: string | null
  }) => Promise<void>
  selectTenant: (tenantId: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!api.getToken() || !api.hasTenant()) {
      setUser(null)
      return
    }
    const me = await api.getMe()
    setUser(me)
  }, [])

  useEffect(() => {
    if (!api.getToken()) {
      setLoading(false)
      return
    }
    if (!api.hasTenant()) {
      setLoading(false)
      return
    }
    refreshUser()
      .catch(() => {
        api.clearToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const result = await api.login(email, password, rememberMe)
    if (result.refreshToken && typeof window !== 'undefined') {
      // already stored by real-client
    }
    if (result.requiresMfaChallenge) {
      // Keep a short-lived token for factor verification only — never mark tenant as selected.
      setUser(null)
      if (result.accessToken) api.setToken(result.accessToken, false)
      if (result.refreshToken && typeof window !== 'undefined') {
        localStorage.setItem('refresh_token', result.refreshToken)
      }
      if (result.memberships?.length) api.setPendingMemberships(result.memberships)
      return {
        requiresTenantSelection: Boolean(result.requiresTenantSelection),
        requiresMfaChallenge: true,
        mfaChallengeId: result.mfaChallengeId,
        devMfaCode: result.devMfaCode,
        pendingCompanyId: result.pendingCompanyId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        memberships: result.memberships ?? [],
      }
    }
    if (result.requiresTenantSelection) {
      if (result.accessToken) api.setToken(result.accessToken, false)
      if (result.memberships?.length) api.setPendingMemberships(result.memberships)
      return {
        requiresTenantSelection: true,
        memberships: result.memberships ?? [],
      }
    }
    if (result.accessToken) {
      api.setToken(result.accessToken, true)
      if (result.user) {
        setUser(result.user)
      } else {
        await refreshUser()
      }
    }
    return {
      requiresTenantSelection: false,
      memberships: [],
      tenantStatus: result.user?.tenantStatus ?? null,
    }
  }, [refreshUser])

  const verifyMfa = useCallback(async (input: {
    challengeId: string
    code: string
    companyId?: string | null
    accessToken?: string | null
    refreshToken?: string | null
  }) => {
    const refreshToken =
      input.refreshToken ||
      (typeof window === 'undefined' ? null : localStorage.getItem('refresh_token'))
    if (!refreshToken) {
      throw new Error('Your sign-in session expired before MFA could complete. Sign in again.')
    }
    const result = await api.verifyMfa({
      challengeId: input.challengeId,
      code: input.code,
      companyId: input.companyId ?? undefined,
      refreshToken,
      accessToken: input.accessToken ?? undefined,
    })
    if (result.requiresTenantSelection) {
      const memberships = 'memberships' in result ? result.memberships : undefined
      if (Array.isArray(memberships) && memberships.length) api.setPendingMemberships(memberships)
      throw Object.assign(new Error('Select a company'), { requiresTenantSelection: true })
    }
    if (result.accessToken) {
      api.setToken(result.accessToken, true)
      if (result.user) setUser(result.user)
      else await refreshUser()
    }
  }, [refreshUser])

  const selectTenant = useCallback(async (tenantId: string) => {
    const result = await api.selectTenant(tenantId)
    api.setToken(result.accessToken, true)
    setUser(result.user)
  }, [])

  const logout = useCallback(() => {
    api.clearToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyMfa, selectTenant, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
