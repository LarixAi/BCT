import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { financeRoleCanAccessPage, type FinancePage } from './page-access'

export function RequireIdentity() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'checking') return <AuthStatus message="Checking your secure session…" />
  if (auth.status === 'unavailable') return <Navigate to="/auth/unavailable" replace />
  if (auth.status !== 'signed_in' || !auth.identity) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/auth/sign-in?returnTo=${returnTo}`} replace />
  }
  return <Outlet />
}

export function RequireFinanceWorkspace() {
  const auth = useAuth()
  const location = useLocation()
  if (!auth.activeMembership) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/auth/company?returnTo=${returnTo}`} replace />
  }
  return <Outlet />
}

export function RequireFinancePage({
  page,
  children,
}: {
  page: FinancePage
  children?: ReactNode
}) {
  const auth = useAuth()
  const location = useLocation()
  const role = auth.activeMembership?.role
  if (!role || !financeRoleCanAccessPage(role, page)) {
    return (
      <Navigate
        to={`/access-denied?from=${encodeURIComponent(
          `${location.pathname}${location.search}`,
        )}`}
        replace
      />
    )
  }
  return children ?? <Outlet />
}

function AuthStatus({ message }: { message: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand-mark" aria-hidden>
          V
        </div>
        <h1>{message}</h1>
      </section>
    </main>
  )
}
