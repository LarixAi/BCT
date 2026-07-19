import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CHECKS_SUMMARY_CARDS, CHECKS_TABS } from '@/lib/checks/constants'
import { canStartAdminCheck } from '@/lib/checks/permissions'
import type { ChecksTab } from '@/lib/checks/types'
import {
  ChecksActionTab,
  ChecksHistoryTab,
  ChecksLiveTab,
  ChecksOverdueTab,
  ChecksOverviewTab,
  ChecksSubmittedTab,
} from './ChecksTabs'
import { ChecksTemplatesTab, ChecksIntelligenceTab } from './ChecksTemplatesTab'
import { StartAdminCheckPanel } from './components/StartAdminCheckPanel'
import { api } from '@/lib/api/client'
import { safeChecksHub } from '@/lib/api/safe-hubs'
import { useAuth } from '@/lib/auth-context'

export function VehicleChecksPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as ChecksTab) || 'overview'
  const statusParam = searchParams.get('status')
  const [filter, setFilter] = useState(
    statusParam === 'pending' ? 'action' : statusParam === 'missed' ? 'overdue' : 'all',
  )
  const [search, setSearch] = useState('')
  const [depotId, setDepotId] = useState('all')
  const [showStart, setShowStart] = useState(false)

  const permissions = user?.permissions ?? []
  const canStart = canStartAdminCheck(permissions)

  const { data: hub, isLoading, error, isError } = useQuery({
    queryKey: ['checks-hub'],
    queryFn: () => api.getChecksHub(),
  })

  function setTab(next: ChecksTab) {
    if (next === 'overview') searchParams.delete('tab')
    else searchParams.set('tab', next)
    setSearchParams(searchParams, { replace: true })
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['checks-hub'] })
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading vehicle checks…</p>
  if (isError || !hub) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load vehicle checks'}</p>
  }

  const safeHub = safeChecksHub(hub)

  const actionCount = safeHub.summary.actionRequired

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Vehicle Checks</h1>
          <p className="text-sm text-slate-600">
            Monitor vehicle safety checks, review reported defects and control vehicle release across the operation.
          </p>
          <p className="text-xs text-slate-500">{safeHub.operationalDate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refresh} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
            Refresh
          </button>
          {canStart && (
            <button
              type="button"
              onClick={() => setShowStart((v) => !v)}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
            >
              Start admin check
            </button>
          )}
        </div>
      </div>

      {showStart && canStart && <StartAdminCheckPanel hub={safeHub} onClose={() => setShowStart(false)} />}

      {(tab === 'overview' || !searchParams.get('tab')) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CHECKS_SUMMARY_CARDS.map((card) => {
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
                  filter === card.filterKey ? 'border-command-500 bg-command-50 ring-1 ring-command-500' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-xl font-bold tabular-nums text-slate-900">{safeHub.summary[card.id]}</p>
                <p className="text-xs text-slate-600">{card.label}</p>
                {sub != null && typeof sub === 'number' && sub > 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    {card.subKey === 'oldestInProgressMinutes' ? `Oldest started ${sub} min ago` : `${sub} need attention`}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {CHECKS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-white text-command-700 ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
            {t.id === 'action' && actionCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800">{actionCount}</span>
            )}
            {t.phase && <span className="ml-1 text-xs text-slate-400">P{t.phase}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search vehicles, drivers, check type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
        <select value={depotId} onChange={(e) => setDepotId(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" aria-label="Depot">
          <option value="all">All depots</option>
          {safeHub.depots.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {tab === 'overview' && <ChecksOverviewTab hub={safeHub} filter={filter} search={search} depotId={depotId} />}
      {tab === 'live' && <ChecksLiveTab hub={safeHub} />}
      {tab === 'submitted' && <ChecksSubmittedTab hub={safeHub} search={search} depotId={depotId} />}
      {tab === 'action' && <ChecksActionTab hub={safeHub} search={search} depotId={depotId} />}
      {tab === 'overdue' && <ChecksOverdueTab hub={safeHub} search={search} depotId={depotId} />}
      {tab === 'history' && <ChecksHistoryTab hub={safeHub} search={search} depotId={depotId} />}
      {tab === 'templates' && (
        <div className="space-y-6">
          <ChecksTemplatesTab hub={safeHub} />
          <ChecksIntelligenceTab hub={safeHub} />
        </div>
      )}
    </div>
  )
}
