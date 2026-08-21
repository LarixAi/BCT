import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { AuthUser, TenantMembershipOption } from './api/types'
import { queryClient } from './query-client'
import { clearWorkspaceClientState } from './tenant/workspace'
import { setScopedCompanyId } from './tenant/tenant-query-scope'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  switching: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{
    requiresTenantSelection: boolean
    requiresMfaChallenge?: boolean
    mfaChallengeId?: string
    devMfaCode?: string
    pendingCompanyId?: string | null
    memberships: TenantMembershipOption[]
    tenantStatus?: string | null
  }>
  verifyMfa: (input: {
    challengeId: string
    code: string
    companyId?: string | null
  }) => Promise<void>
  selectTenant: (tenantId: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  const refreshUser = useCallback(async () => {
    if (!api.hasAuthSession() || !api.hasTenant()) {
      setUser(null)
      return
    }
    const me = await api.getMe()
    setUser(me)
  }, [])

  useEffect(() => {
    setScopedCompanyId(user?.activeTenantId ?? '')
  }, [user?.activeTenantId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (typeof api.getSessionStatus === 'function') {
          const status = await api.getSessionStatus()
          if (cancelled) return
          if (!status.authenticated) {
            setUser(null)
            return
          }
          if (!status.hasTenant) {
            setUser(null)
            return
          }
          await refreshUser()
        } else if (api.hasAuthSession() && api.hasTenant()) {
          await refreshUser()
        } else {
          setUser(null)
        }
      } catch {
        if (!cancelled) {
          api.clearToken()
          setUser(null)
          clearWorkspaceClientState(queryClient, { reason: 'session-expired' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const result = await api.login(email, password, rememberMe)
    if (result.requiresMfaChallenge) {
      setUser(null)
      if (result.memberships?.length) api.setPendingMemberships(result.memberships)
      return {
        requiresTenantSelection: Boolean(result.requiresTenantSelection),
        requiresMfaChallenge: true,
        mfaChallengeId: result.mfaChallengeId,
        devMfaCode: result.devMfaCode,
        pendingCompanyId: result.pendingCompanyId,
        memberships: result.memberships ?? [],
      }
    }
    if (result.requiresTenantSelection) {
      if (result.memberships?.length) api.setPendingMemberships(result.memberships)
      clearWorkspaceClientState(queryClient, { reason: 'login' })
      return {
        requiresTenantSelection: true,
        memberships: result.memberships ?? [],
      }
    }
    clearWorkspaceClientState(queryClient, { reason: 'login' })
    if (result.user) {
      setUser(result.user)
    } else {
      await refreshUser()
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
  }) => {
    const result = await api.verifyMfa({
      challengeId: input.challengeId,
      code: input.code,
      companyId: input.companyId ?? undefined,
    })
    if (result.requiresTenantSelection) {
      const memberships = 'memberships' in result ? result.memberships : undefined
      if (Array.isArray(memberships) && memberships.length) api.setPendingMemberships(memberships)
      clearWorkspaceClientState(queryClient, { reason: 'login' })
      throw Object.assign(new Error('Select a company'), { requiresTenantSelection: true })
    }
    clearWorkspaceClientState(queryClient, { reason: 'login' })
    if (result.user) setUser(result.user)
    else await refreshUser()
  }, [refreshUser])

  const selectTenant = useCallback(async (tenantId: string) => {
    const fromCompanyId = user?.activeTenantId ?? null
    setSwitching(true)
    try {
      clearWorkspaceClientState(queryClient, {
        fromCompanyId,
        toCompanyId: tenantId,
        reason: fromCompanyId ? 'company-switch' : 'company-select',
      })
      const result = await api.selectTenant(tenantId)
      if (result.user) setUser(result.user)
      else await refreshUser()
    } finally {
      setSwitching(false)
    }
  }, [user?.activeTenantId, refreshUser])

  const logout = useCallback(() => {
    const fromCompanyId = user?.activeTenantId ?? null
    clearWorkspaceClientState(queryClient, { fromCompanyId, reason: 'logout' })
    void (typeof api.logoutRemote === 'function' ? api.logoutRemote() : Promise.resolve(api.clearToken()))
    setUser(null)
  }, [user?.activeTenantId])

  return (
    <AuthContext.Provider value={{ user, loading, switching, login, verifyMfa, selectTenant, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useActiveCompanyId(): string {
  const { user } = useAuth()
  return user?.activeTenantId ?? ''
}
