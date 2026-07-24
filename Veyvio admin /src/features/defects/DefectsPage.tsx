import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DEFECTS_SUMMARY_CARDS, DEFECTS_TABS, SAVED_VIEWS } from '@/lib/defects/constants'
import { canReportDefect } from '@/lib/defects/permissions'
import type { DefectsTab } from '@/lib/defects/types'
import { DefectsTabContent } from './DefectsTabs'
import { DefectsBulkActionBar } from './components/DefectsBulkActionBar'
import { DefectsExportButton } from './components/DefectsExportButton'
import { PriorityAlertPanel } from './components/PriorityAlertPanel'
import { ReportDefectPanel } from './components/ReportDefectPanel'
import { api } from '@/lib/api/client'
import { safeDefectsHub } from '@/lib/api/safe-hubs'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function DefectsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as DefectsTab) || 'overview'
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [depotId, setDepotId] = useState('all')
  const [showReport, setShowReport] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const permissions = user?.permissions ?? []
  const canReport = canReportDefect(permissions)

  const { data: hub, isLoading, error, isError } = useQuery({
    queryKey: tKey(['defects-hub']),
    queryFn: () => api.getDefectsHub(),
  })

  function setTab(next: DefectsTab) {
    if (next === 'overview') searchParams.delete('tab')
    else searchParams.set('tab', next)
    setSearchParams(searchParams, { replace: true })
    setSelected([])
  }

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAll(ids: string[]) {
    setSelected(ids)
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: tKey(['defects-hub']) })
  }

  if (isLoading) return <p className="text-sm text-muted">Loading defects…</p>
  if (isError || !hub) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load defects'}</p>
  }

  const safeHub = safeDefectsHub(hub)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Defects</h1>
          <p className="text-sm text-ink-soft">
            Review, prioritise and resolve vehicle faults across the operation.
          </p>
          <p className="text-xs text-muted">{safeHub.operationalDate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReport && (
            <button
              type="button"
              onClick={() => setShowReport((v) => !v)}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
            >
              Report defect
            </button>
          )}
          <Link to="/maintenance?tab=work-orders" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
            Create workshop job
          </Link>
          <DefectsExportButton rows={safeHub.register} />
          <button type="button" onClick={refresh} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
            Refresh
          </button>
        </div>
      </div>

      {showReport && canReport && <ReportDefectPanel hub={safeHub} onClose={() => setShowReport(false)} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {DEFECTS_SUMMARY_CARDS.map((card) => {
          const value = safeHub.summary[card.id]
          const sub = card.subKey ? safeHub.summary[card.subKey] : null
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setFilter(card.filterKey)
                setTab('overview')
              }}
              className={`rounded-xl border p-3 text-left transition ${
                filter === card.filterKey && tab === 'overview'
                  ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <p className="text-xl font-bold tabular-nums text-ink">{value}</p>
              <p className="text-xs text-ink-soft">{card.label}</p>
              {sub != null && typeof sub === 'number' && sub > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  {card.subKey === 'addedToday' && `${sub} added today`}
                  {card.subKey === 'allVor' && `${sub} vehicles VOR`}
                  {card.subKey === 'oldestTriageHours' && `Oldest: ${sub} hr`}
                  {card.subKey === 'overdueAffectingActive' && `${sub} affect active vehicles`}
                </p>
              )}
            </button>
          )
        })}
      </div>

      <PriorityAlertPanel alerts={safeHub.priorityAlerts} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search defects…"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm sm:max-w-xs"
        />
        <select
          value={depotId}
          onChange={(e) => setDepotId(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
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
              setTab('overview')
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
        {DEFECTS_TABS.map((t) => (
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

      <DefectsBulkActionBar
        selected={selected}
        rows={safeHub.register}
        onClear={() => setSelected([])}
      />

      <DefectsTabContent
        hub={safeHub}
        tab={tab}
        filter={filter}
        search={search}
        depotId={depotId}
        selected={selected}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
      />
    </div>
  )
}
