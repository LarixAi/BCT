import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOperationalContext } from '@/lib/context'
import { filterLiveRuns } from '@/lib/live/build-live-operations'
import type { LiveBoardFilter, LiveBoardTab, LiveSavedView } from '@/lib/live/live-operations'
import { LiveCriticalIncidentsBanner } from './LiveCriticalIncidentsBanner'
import {
  LiveActivityFeed,
  LiveControlBar,
  LiveExceptionQueue,
  LiveOperationsBoard,
  LiveSummaryStrip,
} from './LiveWorkspacePanels'
import { LiveOperationsMap } from './map/LiveOperationsMap'
import { toLiveMapVehicles } from './map/toLiveMapVehicles'
import { RunDetailDrawer } from './RunDetailDrawer'
import { useLiveOperationsWorkspace } from './useLiveOperationsWorkspace'

function savedViewToFilter(view: LiveSavedView): LiveBoardFilter {
  if (view === 'late') return 'late'
  if (view === 'assistance') return 'assistance'
  if (view === 'vehicle_issues') return 'stale_gps'
  if (view === 'my_exceptions') return 'exceptions'
  return 'all'
}

export function LiveOperationsPage() {
  const { operationalDate, operationalDateIso, depotId } = useOperationalContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [listTab, setListTab] = useState<'active' | 'completed'>('active')
  const [paused, setPaused] = useState(false)
  const [search, setSearch] = useState('')
  const [boardTab, setBoardTab] = useState<LiveBoardTab>('runs')
  const [filter, setFilter] = useState<LiveBoardFilter>('all')
  const [savedView, setSavedView] = useState<LiveSavedView>('all')
  const [selectedDutyId, setSelectedDutyId] = useState<string | null>(searchParams.get('duty'))
  const [mapCollapsed, setMapCollapsed] = useState(false)

  const { model, liveVehicles, isLoading, isError, error, refetch, dataUpdatedAt } =
    useLiveOperationsWorkspace({
      dateIso: operationalDateIso,
      paused,
      listTab,
    })

  useEffect(() => {
    const duty = searchParams.get('duty')
    if (duty) setSelectedDutyId(duty)
  }, [searchParams])

  const filteredRuns = useMemo(() => {
    if (!model) return []
    return filterLiveRuns(model.runs, filter, search)
  }, [model, filter, search])

  const filteredTrips = useMemo(() => {
    if (!model) return []
    const ids = new Set(filteredRuns.map((r) => r.id))
    return model.trips.filter((t) => ids.has(t.id.replace(/^trip-/, '')))
  }, [model, filteredRuns])

  const mapVehicles = useMemo(() => {
    const ids = new Set(filteredRuns.map((r) => r.id))
    const scoped = liveVehicles.filter((v) => ids.has(v.dutyId))
    return toLiveMapVehicles(scoped, filteredRuns, { staleOnly: filter === 'stale_gps' })
  }, [liveVehicles, filteredRuns, filter])

  const selectedVehicle = liveVehicles.find((v) => v.dutyId === selectedDutyId) ?? null
  const selectedRun = filteredRuns.find((r) => r.id === selectedDutyId) ?? model?.runs.find((r) => r.id === selectedDutyId) ?? null

  const mapDescription =
    mapVehicles.length === 0
      ? 'Operating area shown — markers appear when duties report location'
      : `${mapVehicles.length} on board · status by icon and label`

  function selectDuty(id: string) {
    setSelectedDutyId(id)
    const next = new URLSearchParams(searchParams)
    next.set('duty', id)
    setSearchParams(next, { replace: true })
  }

  function applySavedView(view: LiveSavedView) {
    setSavedView(view)
    setFilter(savedViewToFilter(view))
    if (view === 'my_exceptions') setBoardTab('exceptions')
    if (view === 'late') setBoardTab('runs')
  }

  if (isLoading && !model) {
    return <p className="text-sm text-muted">Loading live operations…</p>
  }

  if (isError || !model) {
    return (
      <p className="text-sm text-red-800">
        {error instanceof Error ? error.message : 'Could not load live operations'}
      </p>
    )
  }

  const lastUpdatedSeconds = dataUpdatedAt ? Math.round((Date.now() - dataUpdatedAt) / 1000) : null

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <LiveControlBar
        dateLabel={operationalDate}
        currentTime={model.currentTimeLabel}
        lastUpdatedLabel={
          lastUpdatedSeconds != null ? `${lastUpdatedSeconds}s ago` : model.connection.lastUpdatedLabel
        }
        connectionMessage={model.connection.message}
        connectionStatus={model.connection.status}
        search={search}
        onSearch={setSearch}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        onRefresh={() => refetch()}
        savedView={savedView}
        onSavedView={applySavedView}
        listTab={listTab}
        onListTab={setListTab}
      />

      <LiveCriticalIncidentsBanner />

      {depotId !== 'all' && (
        <p className="text-xs text-muted">Depot filter from command bar: {depotId}</p>
      )}

      {!model.trackingEnabled && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          GPS tracking is disabled for this company. Trip and driver status updates are still shown.
        </p>
      )}

      <LiveSummaryStrip
        model={model}
        filter={filter}
        onFilter={(f) => {
          setFilter(f)
          setSavedView('all')
        }}
      />

      <div
        className={
          mapCollapsed
            ? 'grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr_340px]'
            : 'grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.1fr_1fr_340px]'
        }
      >
        {!mapCollapsed && (
          <LiveOperationsMap
            vehicles={mapVehicles}
            selectedVehicleId={selectedDutyId}
            onVehicleSelect={(vehicle) => selectDuty(vehicle.id)}
            onCollapse={() => setMapCollapsed(true)}
            description={mapDescription}
          />
        )}

        <div className="flex min-h-0 flex-col gap-2">
          {mapCollapsed && (
            <button
              type="button"
              onClick={() => setMapCollapsed(false)}
              className="self-start text-xs font-medium text-command-700 hover:underline"
            >
              Show live map
            </button>
          )}
          <LiveOperationsBoard
            tab={boardTab}
            onTab={setBoardTab}
            runs={filteredRuns}
            trips={filteredTrips}
            selectedId={selectedDutyId}
            onSelect={selectDuty}
          />
        </div>

        <RunDetailDrawer run={selectedRun} vehicle={selectedVehicle} exceptions={model.exceptions} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LiveExceptionQueue exceptions={model.exceptions} />
        <LiveActivityFeed items={model.activity} />
      </div>
    </div>
  )
}
