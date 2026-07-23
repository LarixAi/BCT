import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api/client'
import { tenantSetupPath } from '@/features/auth/SignupPages'
import { requiresMfa } from '@/features/auth/InviteAuthPages'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

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
        Loading company context…
      </div>
    )
  }

  const setupPath = tenantSetupPath(user.tenantStatus)
  const onSetupRoute =
    location.pathname.startsWith('/company-verification') ||
    location.pathname.startsWith('/setup/')
  if (setupPath && !onSetupRoute) {
    return <Navigate to={setupPath} replace />
  }

  if (
    !setupPath &&
    requiresMfa(user.role, user.mfaEnabled) &&
    location.pathname !== '/setup/security'
  ) {
    return <Navigate to="/setup/security" replace />
  }

  return <Outlet />
}
