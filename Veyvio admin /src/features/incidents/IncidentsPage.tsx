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
import { useAuth } from '@/lib/auth-context'

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
    queryKey: ['incidents-hub'],
    queryFn: () => api.getIncidentsHub(),
  })

  function setTab(next: IncidentsTab) {
    if (next === 'active') searchParams.delete('tab')
    else searchParams.set('tab', next)
    setSearchParams(searchParams, { replace: true })
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['incidents-hub'] })
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading incidents…</p>
  if (isError || !hub) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load incidents'}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Incidents</h1>
          <p className="text-sm text-slate-600">Record, respond to, investigate and resolve safety and operational incidents.</p>
          <p className="text-xs text-slate-500">{hub.operationalDate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReport && (
            <button type="button" onClick={() => setShowReport((v) => !v)} className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700" data-testid="report-incident-button">
              Report incident
            </button>
          )}
          <IncidentsExportButton rows={hub.register} />
          {canSettings && (
            <Link to="/incidents/settings" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50" data-testid="incident-settings-link">
              Settings
            </Link>
          )}
          <button type="button" onClick={refresh} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
            Refresh
          </button>
        </div>
      </div>

      {showReport && canReport && <ReportIncidentPanel onClose={() => setShowReport(false)} />}

      <PriorityIncidentBanner alerts={hub.priorityAlerts} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {INCIDENTS_SUMMARY_CARDS.map((card) => {
          const value = hub.summary[card.id]
          const sub = card.subKey ? hub.summary[card.subKey] : null
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
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
              <p className="text-xs text-slate-600">{card.label}</p>
              {sub != null && typeof sub === 'number' && card.subKey === 'previousMonthCount' && (
                <p className="mt-1 text-xs text-slate-500">Previous month: {sub}</p>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search incidents…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-xs" />
        <select value={depotId} onChange={(e) => setDepotId(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="all">All depots</option>
          {hub.depots.map((d) => (
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
              filter === view.id ? 'bg-command-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {INCIDENTS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'border-b-2 border-command-600 text-command-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <IncidentsTabContent hub={hub} tab={tab} filter={filter} search={search} depotId={depotId} onQuickView={setQuickViewRow} />
      <IncidentQuickDrawer row={quickViewRow} onClose={() => setQuickViewRow(null)} />
    </div>
  )
}
