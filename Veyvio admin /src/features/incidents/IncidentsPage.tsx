import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { INCIDENTS_SUMMARY_CARDS, INCIDENTS_TABS, SAVED_VIEWS } from '@/lib/incidents/constants'
import { canManageIncidentSettings, canReportIncident } from '@/lib/incidents/permissions'
import type { IncidentsTab, IncidentRegisterRow } from '@/lib/incidents/types'
import { IncidentsTabContent } from './components/IncidentsTabs'
import { IncidentQuickDrawer } from './components/IncidentQuickDrawer'
import { IncidentsExportButton } from './components/IncidentsExportButton'
import { PriorityIncidentBanner } from './components/PriorityIncidentBanner'
import { ReportIncidentPanel } from './components/ReportIncidentPanel'
import { api } from '@/lib/api/client'
import { safeIncidentsHub } from '@/lib/api/safe-hubs'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function IncidentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as IncidentsTab) || 'active'
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [depotId, setDepotId] = useState('all')
  const [showReport, setShowReport] = useState(searchParams.get('report') === '1')
  const [quickViewRow, setQuickViewRow] = useState<IncidentRegisterRow | null>(null)

  const permissions = user?.permissions ?? []
  const canReport = canReportIncident(permissions)
  const canSettings = canManageIncidentSettings(permissions)

  const { data: hub, isLoading, error, isError } = useQuery({
    queryKey: tKey(['incidents-hub']),
    queryFn: () => api.getIncidentsHub(),
  })

  function setTab(next: IncidentsTab) {
    if (next === 'active') searchParams.delete('tab')
    else searchParams.set('tab', next)
    setSearchParams(searchParams, { replace: true })
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: tKey(['incidents-hub']) })
  }

  if (isLoading) return <p className="text-sm text-muted">Loading incidents…</p>
  if (isError || !hub) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load incidents'}</p>
  }

  const safeHub = safeIncidentsHub(hub)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Incidents</h1>
          <p className="text-sm text-ink-soft">Record, respond to, investigate and resolve safety and operational incidents.</p>
          <p className="text-xs text-muted">{safeHub.operationalDate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReport && (
            <button type="button" onClick={() => setShowReport((v) => !v)} className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700" data-testid="report-incident-button">
              Report incident
            </button>
          )}
          <IncidentsExportButton rows={safeHub.register} />
          {canSettings && (
            <Link to="/incidents/settings" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted" data-testid="incident-settings-link">
              Settings
            </Link>
          )}
          <button type="button" onClick={refresh} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
            Refresh
          </button>
        </div>
      </div>

      {showReport && canReport && <ReportIncidentPanel onClose={() => setShowReport(false)} />}

      <PriorityIncidentBanner alerts={safeHub.priorityAlerts} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {INCIDENTS_SUMMARY_CARDS.map((card) => {
          const value = safeHub.summary[card.id]
          const sub = card.subKey ? safeHub.summary[card.subKey] : null
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setFilter(card.filterKey)
                setTab('active')
              }}
              className={`rounded-xl border p-3 text-left transition ${
                filter === card.filterKey && tab === 'active'
                  ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <p className="text-xl font-bold tabular-nums text-ink">{value}</p>
              <p className="text-xs text-ink-soft">{card.label}</p>
              {sub != null && typeof sub === 'number' && card.subKey === 'previousMonthCount' && (
                <p className="mt-1 text-xs text-muted">Previous month: {sub}</p>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search incidents…" className="w-full rounded-lg border border-border px-3 py-2 text-sm sm:max-w-xs" />
        <select value={depotId} onChange={(e) => setDepotId(e.target.value)} className="rounded-lg border border-border px-3 py-2 text-sm">
          <option value="all">All depots</option>
          {safeHub.depots.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAVED_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => {
              setFilter(view.id)
              setTab('active')
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === view.id ? 'bg-command-600 text-white' : 'bg-surface text-ink-soft ring-1 ring-border'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {INCIDENTS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'border-b-2 border-command-600 text-command-700' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <IncidentsTabContent hub={safeHub} tab={tab} filter={filter} search={search} depotId={depotId} onQuickView={setQuickViewRow} />
      <IncidentQuickDrawer row={quickViewRow} onClose={() => setQuickViewRow(null)} />
    </div>
  )
}
