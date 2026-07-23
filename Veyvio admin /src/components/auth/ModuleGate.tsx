import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { isModuleEnabled, moduleForPath } from '@/lib/platform/module-routes'

export function ModuleGate() {
  const { user } = useAuth()
  const location = useLocation()
  const required = moduleForPath(location.pathname)

  if (!isModuleEnabled(user?.enabledModules, required)) {
    return <Navigate to="/module-unavailable" replace state={{ from: location.pathname, module: required }} />
  }

  return <Outlet />
}
