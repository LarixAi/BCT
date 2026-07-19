import { useState } from 'react'
import { LogOut, Search, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/ui'
import { NotificationBellDropdown } from '@/components/layout/NotificationBellDropdown'
import { isMockApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'

export function TopBar() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { user, logout } = useAuth()
  const { companyName, depotId, setDepotId, operationalDate, connectionStatus, depots } =
    useOperationalContext()

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-white px-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{companyName}</p>
        <p className="truncate text-xs text-muted">
          {operationalDate}
          {isMockApi && (
            <span className="ml-2 rounded bg-ready/15 px-1.5 py-0.5 text-[10px] font-medium text-ready">
              Demo
            </span>
          )}
        </p>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <label className="sr-only" htmlFor="depot-select">
          Depot
        </label>
        <select
          id="depot-select"
          value={depotId}
          onChange={(e) => setDepotId(e.target.value)}
          className="rounded-md border border-border bg-page px-2.5 py-1.5 text-sm text-ink-soft"
        >
          {depots.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault()
            const query = search.trim()
            if (query) navigate(`/search?q=${encodeURIComponent(query)}`)
          }}
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search bookings, trips, drivers…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-64 rounded-md border border-border bg-page py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-muted focus:border-command-500 focus:outline-none focus:ring-2 focus:ring-command-500/20"
          />
        </form>
      </div>

      <StatusBadge kind="connection" value={connectionStatus} />

      <NotificationBellDropdown />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm text-ink-soft hover:bg-page"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-command-500 text-[10px] font-bold text-white">
            {(user?.firstName?.[0] ?? 'U').toUpperCase()}
            {(user?.lastName?.[0] ?? '').toUpperCase()}
          </span>
          <span className="hidden sm:inline">{user?.firstName ?? 'User'}</span>
          <User className="hidden h-3.5 w-3.5 text-muted sm:block" />
        </button>
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="rounded-md p-2 text-muted hover:bg-page hover:text-ink"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
