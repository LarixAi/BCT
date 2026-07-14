import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import type { AuthUser, TenantMembershipOption } from './api/types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{
    requiresTenantSelection: boolean
    memberships: TenantMembershipOption[]
  }>
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
    return { requiresTenantSelection: false, memberships: [] }
  }, [])

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
    <AuthContext.Provider value={{ user, loading, login, selectTenant, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
