import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { YARD_SUMMARY_CARDS, YARD_TABS } from '@/lib/yard/constants'
import { canCreateYardTask, canRecordYardMovement } from '@/lib/yard/permissions'
import type { YardTab, YardVehicleRow } from '@/lib/yard/types'
import { YardLiveTab } from './YardLiveTab'
import { YardMovementsTab } from './YardMovementsTab'
import { YardTasksTab } from './YardTasksTab'
import { YardMapTab } from './YardMapTab'
import { YardHandoverTab } from './YardHandoverTab'
import { YardExceptionsTab } from './YardExceptionsTab'
import { RecordMovementPanel } from './components/RecordMovementPanel'
import { CreateYardTaskPanel } from './components/CreateYardTaskPanel'
import { VehicleOperationsDrawer } from './components/VehicleOperationsDrawer'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function YardOperationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as YardTab) || 'live'
  const depotId = searchParams.get('depot') ?? 'depot-wembley'
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<YardVehicleRow | null>(null)
  const [showMovement, setShowMovement] = useState(false)
  const [showTask, setShowTask] = useState(false)

  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canMove = canRecordYardMovement(permissions)
  const canTask = canCreateYardTask(permissions)

  const { data: hub, isLoading, error, isError } = useQuery({
    queryKey: ['yard-hub', depotId],
    queryFn: () => api.getYardHub(depotId),
  })

  function setTab(next: YardTab) {
    if (next === 'live') searchParams.delete('tab')
    else searchParams.set('tab', next)
    setSearchParams(searchParams, { replace: true })
  }

  function setDepot(next: string) {
    searchParams.set('depot', next)
    setSearchParams(searchParams, { replace: true })
    setSelected(null)
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['yard-hub', depotId] })
  }

  function selectVehicle(vehicleId: string) {
    const row = hub?.vehicles.find((v) => v.vehicleId === vehicleId) ?? null
    setSelected(row)
    setTab('live')
  }

  if (isLoading) return <p className="text-sm text-slate-500">Loading yard operations…</p>
  if (isError || !hub) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load yard operations'}</p>
  }

  const openExceptions = hub.exceptions.filter((e) => e.escalationStatus !== 'resolved').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Yard Operations</h1>
          <p className="text-sm text-slate-600">
            {hub.depotName} · {hub.operationalDate} · {hub.shiftLabel}
          </p>
          <p className="text-xs text-slate-500">Live vehicle movements, readiness and depot activity</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={depotId}
            onChange={(e) => setDepot(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            aria-label="Depot"
          >
            {hub.depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={refresh} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
            Refresh
          </button>
          {canTask && (
            <button
              type="button"
              onClick={() => {
                setShowTask((v) => !v)
                setShowMovement(false)
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Create task
            </button>
          )}
          {canMove && (
            <button
              type="button"
              onClick={() => {
                setShowMovement((v) => !v)
                setShowTask(false)
              }}
              className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
            >
              Record movement
            </button>
          )}
        </div>
      </div>

      {showMovement && canMove && <RecordMovementPanel hub={hub} actorName={actorName} onClose={() => setShowMovement(false)} />}
      {showTask && canTask && <CreateYardTaskPanel hub={hub} onClose={() => setShowTask(false)} />}

      {tab === 'live' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {YARD_SUMMARY_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setFilter(card.filterKey)
                setTab('live')
              }}
              className={`rounded-xl border p-3 text-left transition ${
                filter === card.filterKey ? 'border-command-500 bg-command-50 ring-1 ring-command-500' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <p className="text-xl font-bold tabular-nums text-slate-900">{hub.summary[card.id]}</p>
              <p className="text-xs text-slate-600">{card.label}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {YARD_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-white text-command-700 ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
            {t.id === 'exceptions' && openExceptions > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800">{openExceptions}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <>
          <input
            type="search"
            placeholder="Search registration, fleet number, bay…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <YardLiveTab hub={hub} filter={filter} search={search} selectedId={selected?.vehicleId ?? null} onSelect={setSelected} />
        </>
      )}

      {tab === 'movements' && <YardMovementsTab hub={hub} />}
      {tab === 'tasks' && <YardTasksTab hub={hub} />}
      {tab === 'map' && <YardMapTab hub={hub} />}
      {tab === 'handover' && <YardHandoverTab hub={hub} />}
      {tab === 'exceptions' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <YardExceptionsTab hub={hub} onSelectVehicle={selectVehicle} />
          {selected && <VehicleOperationsDrawer hub={hub} row={selected} onClose={() => setSelected(null)} />}
        </div>
      )}
    </div>
  )
}
