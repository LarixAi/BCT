import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { YARD_SUMMARY_CARDS, YARD_TABS, YARD_TASK_TYPE_LABELS } from '@/lib/yard/constants'
import { canCreateYardTask, canRecordYardMovement } from '@/lib/yard/permissions'
import type { YardTab, YardTaskType, YardVehicleRow } from '@/lib/yard/types'
import { YardLiveTab } from './YardLiveTab'
import { YardMovementsTab } from './YardMovementsTab'
import { YardTasksTab } from './YardTasksTab'
import { YardMapTab } from './YardMapTab'
import { YardHandoverTab } from './YardHandoverTab'
import { YardExceptionsTab } from './YardExceptionsTab'
import { YardDriverMessagesTab } from './YardDriverMessagesTab'
import { YardBodyworkTab } from './YardBodyworkTab'
import { YardVehicleChecksTab } from './YardVehicleChecksTab'
import { RecordMovementPanel } from './components/RecordMovementPanel'
import { CreateYardTaskPanel } from './components/CreateYardTaskPanel'
import { VehicleOperationsDrawer } from './components/VehicleOperationsDrawer'
import { api } from '@/lib/api/client'
import { safeYardHub } from '@/lib/api/safe-hubs'
import { useAuth } from '@/lib/auth-context'

export function YardOperationsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as YardTab) || 'live'
  const depotId = searchParams.get('depot') ?? ''
  const vehicleDeepLink = searchParams.get('vehicle') ?? ''
  const taskHint = searchParams.get('task') ?? ''
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState(vehicleDeepLink)
  const [selected, setSelected] = useState<YardVehicleRow | null>(null)
  const [showMovement, setShowMovement] = useState(false)
  const [showTask, setShowTask] = useState(taskHint === 'prepare_for_service' || taskHint === 'return_inspection')

  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canMove = canRecordYardMovement(permissions)
  const canTask = canCreateYardTask(permissions)

  const { data: hub, isLoading, error, isError } = useQuery({
    queryKey: ['yard-hub', depotId || 'default'],
    queryFn: () => api.getYardHub(depotId || undefined),
  })

  function setTab(next: YardTab) {
    if (next === 'live') searchParams.delete('tab')
    else searchParams.set('tab', next)
    setSearchParams(searchParams, { replace: true })
  }

  function setDepot(next: string) {
    if (!next) searchParams.delete('depot')
    else searchParams.set('depot', next)
    setSearchParams(searchParams, { replace: true })
    setSelected(null)
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['yard-hub'] })
  }

  if (isLoading) return <p className="text-sm text-muted">Loading yard operations…</p>
  if (isError || !hub) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load yard operations'}</p>
  }

  const safeHub = safeYardHub(hub)

  function selectVehicle(vehicleId: string) {
    const row = safeHub.vehicles.find((v) => v.vehicleId === vehicleId) ?? null
    setSelected(row)
    setTab('live')
  }

  const openExceptions = safeHub.exceptions.filter((e) => e.escalationStatus !== 'resolved').length
  const selectedDepot = depotId || safeHub.depotId || safeHub.depots[0]?.id || ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Yard Operations</h1>
          <p className="text-sm text-ink-soft">
            {safeHub.depotName} · {safeHub.operationalDate} · {safeHub.shiftLabel}
          </p>
          <p className="text-xs text-muted">Live vehicle movements, readiness and depot activity</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDepot}
            onChange={(e) => setDepot(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
            aria-label="Depot"
          >
            {safeHub.depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={refresh} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
            Refresh
          </button>
          {canTask && (
            <button
              type="button"
              onClick={() => {
                setShowTask((v) => !v)
                setShowMovement(false)
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
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

      {taskHint && (
        <div className="rounded-lg border border-command-200 bg-command-50 px-3 py-2 text-sm text-command-900" role="status">
          {taskHint === 'return_inspection'
            ? 'Maintenance requested a return-from-workshop check — create a return inspection task for the vehicle.'
            : taskHint === 'prepare_for_service'
              ? 'Maintenance requested prepare-for-workshop — create a yard task and capture mileage before handover.'
              : `Task hint from Maintenance: ${taskHint.replace(/_/g, ' ')}.`}
          {vehicleDeepLink && <span className="ml-1">Vehicle filter: {vehicleDeepLink}</span>}
        </div>
      )}

      {showMovement && canMove && <RecordMovementPanel hub={safeHub} actorName={actorName} onClose={() => setShowMovement(false)} />}
      {showTask && canTask && (
        <CreateYardTaskPanel
          hub={safeHub}
          initialTaskType={taskHint in YARD_TASK_TYPE_LABELS ? (taskHint as YardTaskType) : undefined}
          initialVehicleId={vehicleDeepLink || undefined}
          onClose={() => setShowTask(false)}
        />
      )}

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
                filter === card.filterKey ? 'border-command-500 bg-command-50 ring-1 ring-command-500' : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <p className="text-xl font-bold tabular-nums text-ink">{safeHub.summary[card.id]}</p>
              <p className="text-xs text-ink-soft">{card.label}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {YARD_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-surface text-command-700 ring-1 ring-border' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
            {t.id === 'exceptions' && openExceptions > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800">{openExceptions}</span>
            )}
            {t.id === 'checks' && (safeHub.vehicleChecks?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-900">
                {safeHub.vehicleChecks?.length}
              </span>
            )}
            {t.id === 'bodywork' && (safeHub.bodyworkReports?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                {safeHub.bodyworkReports?.length}
              </span>
            )}
            {t.id === 'messages' && (safeHub.driverMessages?.length ?? 0) > 0 && (
              <span className="ml-1.5 rounded-full bg-command-100 px-1.5 py-0.5 text-xs font-semibold text-command-800">
                {safeHub.driverMessages?.length}
              </span>
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
            className="w-full max-w-md rounded-lg border border-border px-3 py-1.5 text-sm"
          />
          <YardLiveTab hub={safeHub} filter={filter} search={search} selectedId={selected?.vehicleId ?? null} onSelect={setSelected} />
        </>
      )}

      {tab === 'movements' && <YardMovementsTab hub={safeHub} />}
      {tab === 'tasks' && <YardTasksTab hub={safeHub} />}
      {tab === 'map' && <YardMapTab hub={safeHub} />}
      {tab === 'handover' && <YardHandoverTab hub={safeHub} />}
      {tab === 'exceptions' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <YardExceptionsTab hub={safeHub} onSelectVehicle={selectVehicle} />
          {selected && <VehicleOperationsDrawer hub={safeHub} row={selected} onClose={() => setSelected(null)} />}
        </div>
      )}
      {tab === 'checks' && <YardVehicleChecksTab hub={safeHub} />}
      {tab === 'bodywork' && <YardBodyworkTab hub={safeHub} />}
      {tab === 'messages' && <YardDriverMessagesTab hub={safeHub} />}
    </div>
  )
}
