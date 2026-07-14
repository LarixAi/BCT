import { LogOut, Search, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/ui'
import { NotificationBellDropdown } from '@/components/layout/NotificationBellDropdown'
import { isMockApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'

export function TopBar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { companyName, depotId, setDepotId, operationalDate, connectionStatus, depots } =
    useOperationalContext()

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{companyName}</p>
        <p className="truncate text-xs text-slate-500">
          {operationalDate}
          {isMockApi && (
            <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
              Demo
            </span>
          )}
        </p>
      </div>

      <div className="hidden items-center gap-3 md:flex">
        <label className="sr-only" htmlFor="depot-select">
          Depot
        </label>
        <select
          id="depot-select"
          value={depotId}
          onChange={(e) => setDepotId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
        >
          {depots.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search bookings, trips, drivers…"
            className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm placeholder:text-slate-400"
          />
        </div>
      </div>

      <StatusBadge kind="connection" value={connectionStatus} />

      <NotificationBellDropdown />

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">
            {user?.firstName ?? 'User'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
