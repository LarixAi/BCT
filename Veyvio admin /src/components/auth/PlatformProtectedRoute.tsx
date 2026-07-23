import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api/client'

const PLATFORM_ROLES = new Set(['platform_admin', 'platform_support', 'platform_billing'])

export function PlatformProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-page text-sm text-muted">
        Loading…
      </div>
    )
  }

  if (!api.getToken()) {
    return <Navigate to="/login" replace />
  }

  if (!api.hasTenant()) {
    return <Navigate to="/select-company" replace />
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-page text-sm text-muted">
        Loading platform access…
      </div>
    )
  }

  if (!user.platformRole || !PLATFORM_ROLES.has(user.platformRole)) {
    return <Navigate to="/access-denied" replace />
  }

  return <Outlet />
}
