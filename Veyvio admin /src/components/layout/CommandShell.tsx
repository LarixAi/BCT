import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { VeyvioSidebar } from './VeyvioSidebar'
import { TopBar } from './TopBar'
import { PageErrorBoundary } from './PageErrorBoundary'
import { useAuth } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'

export function CommandShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { companyName } = useOperationalContext()

  const userName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || 'User'
    : 'User'
  const userRole = user?.role?.replace(/_/g, ' ') ?? 'Operator'
  const userInitials = `${user?.firstName?.[0] ?? 'U'}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="flex h-full bg-page">
      <VeyvioSidebar
        pathname={`${location.pathname}${location.search}`}
        onNavigate={(href) => navigate(href)}
        companyName={companyName}
        userName={userName}
        userRole={userRole}
        userInitials={userInitials}
        onProfileAction={(action) => {
          if (action === 'sign-out') {
            logout()
            navigate('/login')
          }
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-3 pt-16 md:p-4 lg:pt-4">
          <PageErrorBoundary>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  )
}
