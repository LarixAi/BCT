import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api/client'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
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
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading company context…
      </div>
    )
  }

  return <Outlet />
}
