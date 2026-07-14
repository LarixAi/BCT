import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare, AlertCircle, Phone } from 'lucide-react'
import { ManageAssignmentButton } from '@/features/transfers/ManageAssignmentButton'
import { LiveCriticalIncidentsBanner } from './LiveCriticalIncidentsBanner'
import { LiveVehicleMap, type LiveVehicleMapHandle } from '@/components/map/LiveVehicleMap'
import { SectionCard, StatusBadge } from '@/components/ui'
import { api } from '@/lib/api/client'
import { mapLiveVehicleToOperation } from '@/lib/api/mappers'
import type { LiveDispatchVehicle } from '@/lib/api/types'
import { useOperationalContext } from '@/lib/context'
import type { ActiveOperation } from '@/lib/types'

type ListView = 'runs' | 'trips' | 'vehicles'
type QuickFilter = 'all' | 'late' | 'no-gps' | 'onboard'
type ListTab = 'active' | 'completed'

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'all', label: 'All active' },
  { id: 'late', label: 'Late' },
  { id: 'no-gps', label: 'No GPS' },
  { id: 'onboard', label: 'Passenger onboard' },
]

export function LiveOperationsPage() {
  const { operationalDateIso } = useOperationalContext()
  const [listTab, setListTab] = useState<ListTab>('active')
  const [listView, setListView] = useState<ListView>('runs')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [selectedDutyId, setSelectedDutyId] = useState<string | null>(null)
  const mapRef = useRef<LiveVehicleMapHandle>(null)

  const { data, isLoading, error, isError, dataUpdatedAt } = useQuery({
    queryKey: ['live-dispatch', operationalDateIso, listTab],
    queryFn: () => api.getLiveDispatch(operationalDateIso, listTab),
    refetchInterval: 30_000,
  })

  const vehicles = data?.vehicles ?? []
  const operations = useMemo(() => vehicles.map(mapLiveVehicleToOperation), [vehicles])

  const filtered = operations.filter((op) => {
    if (quickFilter === 'late') return op.delayMinutes > 0
    if (quickFilter === 'no-gps') return op.gpsFreshnessSeconds === null
    if (quickFilter === 'onboard') return op.passengerOnboard
    return true
  })

  const displayList = filtered

  const selectedVehicle = vehicles.find((v) => v.dutyId === selectedDutyId) ?? vehicles[0] ?? null
  const selected = selectedVehicle ? mapLiveVehicleToOperation(selectedVehicle) : null

  const connectionStatus = isError ? 'offline' : 'live'
  const lastUpdated = dataUpdatedAt
    ? Math.round((Date.now() - dataUpdatedAt) / 1000)
    : null

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Live Operations</h1>
          <p className="text-sm text-slate-600">
            Real-time monitoring of active duties from veymo dispatch
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/bookings/new/urgent"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Urgent booking
          </Link>
          <StatusBadge kind="connection" value={connectionStatus} />
          {lastUpdated != null && (
            <span className="text-xs text-slate-500">Last updated: {lastUpdated}s ago</span>
          )}
        </div>
      </div>

      <LiveCriticalIncidentsBanner />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['active', 'completed'] as ListTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setListTab(tab)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium capitalize',
                listTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setQuickFilter(f.id)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              quickFilter === f.id
                ? 'bg-command-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load live operations'}
        </p>
      )}

      {!data?.trackingEnabled && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          GPS tracking is disabled for this company. Duty list is available but positions may be empty.
        </p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_1fr_340px]">
        <SectionCard title="Active duties" className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
            {(['runs', 'trips', 'vehicles'] as ListView[]).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setListView(view)}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-xs font-medium capitalize',
                  listView === view ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600',
                )}
              >
                {view}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {isLoading && vehicles.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">Loading duties…</p>
            )}

            {!isLoading && displayList.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No {listTab} duties for this date.
              </p>
            )}

            {displayList.map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setSelectedDutyId(op.id)}
                className={cn(
                  'w-full rounded-lg border p-3 text-left text-sm transition',
                  selected?.id === op.id
                    ? 'border-command-500 bg-command-50'
                    : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{op.reference}</span>
                  {op.hasException && (
                    <AlertCircle className="h-4 w-4 text-amber-600" aria-label="Has exception" />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {op.driver} · {op.vehicle}
                </p>
                {vehicles.find((v) => v.dutyId === op.id)?.routeName && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {vehicles.find((v) => v.dutyId === op.id)?.routeName}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">{op.currentState}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {op.progress && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5">{op.progress} stops</span>
                  )}
                  {op.delayMinutes > 0 && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-800">
                      +{op.delayMinutes} min
                    </span>
                  )}
                  <GpsBadge seconds={op.gpsFreshnessSeconds} />
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Live map"
          className="relative min-h-[300px] overflow-hidden"
          flush
          action={
            <button
              type="button"
              onClick={() => mapRef.current?.fitFleet()}
              className="text-xs font-medium text-command-600 hover:underline"
            >
              Fit fleet
            </button>
          }
        >
          <LiveVehicleMap
            ref={mapRef}
            vehicles={vehicles}
            selectedDutyId={selectedDutyId ?? selectedVehicle?.dutyId}
            selectedVehicle={selectedVehicle}
            onSelectDuty={setSelectedDutyId}
            staleOnly={quickFilter === 'no-gps'}
            edgeToEdge
            className="h-full min-h-[300px]"
            resultsLabel={`${vehicles.length} duties · ${vehicles.filter((v) => v.lastLatitude != null).length} with GPS`}
          />
        </SectionCard>

        <OperationDrawer operation={selected} vehicle={selectedVehicle} />
      </div>
    </div>
  )
}

function OperationDrawer({
  operation,
  vehicle,
}: {
  operation: ActiveOperation | null
  vehicle: LiveDispatchVehicle | null
}) {
  if (!operation) {
    return (
      <SectionCard title="Operation details">
        <p className="text-sm text-slate-500">Select a duty to view details.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Operation details" className="overflow-y-auto">
      <div className="space-y-4 text-sm">
        <DetailRow label="Duty" value={operation.reference} />
        <DetailRow label="Vehicle" value={operation.vehicle} />
        <DetailRow label="Driver" value={operation.driver} />
        {vehicle?.routeName && <DetailRow label="Route" value={vehicle.routeName} />}
        <DetailRow label="Status" value={operation.currentState} />
        {operation.progress && <DetailRow label="Stops" value={operation.progress} />}
        {vehicle?.nextStop && (
          <DetailRow label="Next stop" value={`${vehicle.nextStop.name} (ETA ${vehicle.nextStop.etaMinutes}m)`} />
        )}
        <DetailRow
          label="GPS"
          value={
            operation.gpsFreshnessSeconds === null
              ? `Stale — ${vehicle?.staleMinutes ?? '?'} min since last update`
              : `${operation.gpsFreshnessSeconds}s ago`
          }
        />

        {operation.passengerOnboard && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            Passenger onboard — safety-controlled actions required before changes
          </div>
        )}

        {vehicle && vehicle.routeTotalStops > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Route progress</h3>
            <p className="mt-1 text-xs text-slate-700">
              {vehicle.routeCompletedStops} of {vehicle.routeTotalStops} stops
              {vehicle.routeProgressPercent != null && ` (${vehicle.routeProgressPercent}%)`}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {vehicle?.dutyId && (
            <ManageAssignmentButton dutyId={vehicle.dutyId} className="w-full rounded-lg bg-command-600 px-3 py-2 text-sm font-medium text-white hover:bg-command-700" />
          )}
          <ActionButton icon={Phone} label="Contact driver" />
          <ActionButton icon={MessageSquare} label="Send instruction" />
          <ActionButton icon={AlertCircle} label="Create exception" variant="warning" />
        </div>
      </div>
    </SectionCard>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  variant?: 'default' | 'warning'
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
        variant === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function GpsBadge({ seconds }: { seconds: number | null }) {
  if (seconds === null) return <span className="text-red-600">GPS stale</span>
  if (seconds > 120) return <span className="text-amber-600">GPS {seconds}s ago</span>
  return <span className="text-emerald-600">GPS {seconds}s ago</span>
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
