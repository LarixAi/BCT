import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { useOperationalContext } from '@/lib/context'
import { filterLiveRuns } from '@/lib/live/build-live-operations'
import type { LiveBoardFilter, LiveSavedView } from '@/lib/live/live-operations'
import { findTripForDuty } from '@/lib/operations/live-operations-context'
import { buildNotificationsInbox } from '@/lib/notifications/build-notifications'
import { LiveCriticalIncidentsBanner } from './LiveCriticalIncidentsBanner'
import { LiveMapSyncBar } from './LiveMapSyncBar'
import { LiveOperationsRail } from './LiveOperationsRail'
import { LiveRunDock } from './LiveRunDock'
import { LiveOperationsMap } from './map/LiveOperationsMap'
import { toLiveMapVehicles } from './map/toLiveMapVehicles'
import { useLiveOperationsWorkspace } from './useLiveOperationsWorkspace'
import { tKey } from '@/lib/tenant/tenant-query-scope'


function savedViewToFilter(view: LiveSavedView): LiveBoardFilter {
  if (view === 'late') return 'late'
  if (view === 'assistance') return 'assistance'
  if (view === 'vehicle_issues') return 'stale_gps'
  if (view === 'my_exceptions') return 'exceptions'
  return 'all'
}

function severityRank(severity: string): number {
  if (severity === 'critical') return 0
  if (severity === 'urgent') return 1
  return 2
}

export function LiveOperationsPage() {
  const { operationalDate, operationalDateIso, depotId } = useOperationalContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [listTab, setListTab] = useState<'active' | 'completed'>('active')
  const [paused, setPaused] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<LiveBoardFilter>('all')
  const [savedView, setSavedView] = useState<LiveSavedView>('all')
  const [selectedDutyId, setSelectedDutyId] = useState<string | null>(searchParams.get('duty'))
  const [dockCollapsed, setDockCollapsed] = useState(false)

  const { model, liveVehicles, isLoading, isError, error, refetch, dataUpdatedAt } =
    useLiveOperationsWorkspace({
      dateIso: operationalDateIso,
      paused,
      listTab,
    })

  const { data: opsTrips = [] } = useQuery({
    queryKey: tKey(['operational-trips']),
    queryFn: () => api.getOperationalTrips(),
  })

  const { data: selectedDuty } = useQuery({
    queryKey: tKey(['duty', selectedDutyId]),
    queryFn: () => api.getDuty(selectedDutyId!),
    enabled: Boolean(selectedDutyId),
  })

  const { data: notifications = [] } = useQuery({
    queryKey: tKey(['notifications-inbox']),
    queryFn: () => api.getNotifications(),
  })

  const notificationCount = useMemo(
    () => buildNotificationsInbox(notifications).filter((n) => n.actionRequired && !n.acknowledged).length,
    [notifications],
  )

  const selectedTrip = useMemo(
    () => (selectedDutyId ? findTripForDuty(opsTrips, selectedDutyId) : null),
    [opsTrips, selectedDutyId],
  )

  useEffect(() => {
    const duty = searchParams.get('duty')
    if (duty) setSelectedDutyId(duty)
  }, [searchParams])

  const filteredRuns = useMemo(() => {
    if (!model) return []
    return filterLiveRuns(model.runs, filter, search)
  }, [model, filter, search])

  const mapVehicles = useMemo(() => {
    const ids = new Set(filteredRuns.map((r) => r.id))
    const scoped = liveVehicles.filter((v) => ids.has(v.dutyId))
    return toLiveMapVehicles(scoped, filteredRuns, { staleOnly: filter === 'stale_gps' })
  }, [liveVehicles, filteredRuns, filter])

  const vehiclesByDuty = useMemo(() => new Map(liveVehicles.map((v) => [v.dutyId, v])), [liveVehicles])
  const selectedRun =
    filteredRuns.find((r) => r.id === selectedDutyId) ??
    model?.runs.find((r) => r.id === selectedDutyId) ??
    null

  const topException = useMemo(() => {
    if (!model?.exceptions.length) return null
    return [...model.exceptions].sort((a, b) => severityRank(a.severity) - severityRank(b.severity))[0]
  }, [model?.exceptions])

  useEffect(() => {
    if (selectedDutyId || filteredRuns.length === 0) return
    const first = filteredRuns[0]
    setSelectedDutyId(first.id)
    const next = new URLSearchParams(searchParams)
    next.set('duty', first.id)
    setSearchParams(next, { replace: true })
  }, [filteredRuns, selectedDutyId, searchParams, setSearchParams])

  function selectDuty(id: string) {
    setSelectedDutyId(id)
    const next = new URLSearchParams(searchParams)
    next.set('duty', id)
    setSearchParams(next, { replace: true })
  }

  function applySavedView(view: LiveSavedView) {
    setSavedView(view)
    setFilter(savedViewToFilter(view))
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
    <div className="-m-3 flex h-[calc(100dvh-3rem)] flex-col overflow-hidden md:-m-4">
      <LiveMapSyncBar
        dateLabel={operationalDate}
        currentTime={model.currentTimeLabel}
        lastUpdatedLabel={
          lastUpdatedSeconds != null ? `${lastUpdatedSeconds}s ago` : model.connection.lastUpdatedLabel
        }
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
        depotLabel={depotId !== 'all' ? depotId : null}
        trackingDisabled={!model.trackingEnabled}
      />

      <LiveCriticalIncidentsBanner />

      <div className="relative min-h-0 flex-1">
        <LiveOperationsMap
          variant="immersive"
          vehicles={mapVehicles}
          selectedVehicleId={selectedDutyId}
          onVehicleSelect={(vehicle) => selectDuty(vehicle.id)}
        />

        <LiveRunDock
          runs={filteredRuns}
          selectedId={selectedDutyId}
          vehiclesByDuty={vehiclesByDuty}
          onSelect={selectDuty}
          collapsed={dockCollapsed}
          onToggleCollapsed={() => setDockCollapsed((c) => !c)}
        />

        <LiveOperationsRail
          run={selectedRun}
          trip={selectedTrip}
          duty={selectedDuty ?? null}
          notificationCount={notificationCount}
          exception={topException}
        />
      </div>
    </div>
  )
}
