import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LiveVehicleMap, type LiveVehicleMapHandle } from '@/components/map/LiveVehicleMap'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { DutyRecord } from '@/lib/api/types'
import { useAuth } from '@/lib/auth-context'
import { useOperationalContext } from '@/lib/context'
import { ManageAssignmentButton } from '@/features/transfers/ManageAssignmentButton'
import { ManageAssignmentDrawer } from '@/features/transfers/ManageAssignmentDrawer'
import {
  applyUpdatePreview,
  columnForDuty,
  dutiesForColumn,
  getDutyComplianceBlocks,
  getDutyComplianceWarnings,
  getDutyConflicts,
  resolveDriver,
  resolveVehicle,
  updateForColumn,
  type DispatchColumn,
} from '@/lib/dispatch-utils'

const COLUMNS: Array<{ key: DispatchColumn; label: string }> = [
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
]

export function DispatchPage() {
  const { user } = useAuth()
  const { operationalDateIso } = useOperationalContext()
  const [date, setDate] = useState(operationalDateIso)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [pendingColumn, setPendingColumn] = useState<DispatchColumn | null>(null)
  const [selectedDriver, setSelectedDriver] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DispatchColumn | null>(null)
  const [pendingMove, setPendingMove] = useState<{
    dutyId: string
    update: Record<string, unknown>
    conflicts: string[]
  } | null>(null)
  const [transferTripId, setTransferTripId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const mapRef = useRef<LiveVehicleMapHandle>(null)
  const queryClient = useQueryClient()

  const canOverride = user?.permissions.includes('dispatch.override') ?? false

  const { data: duties = [], isLoading } = useQuery({
    queryKey: ['duties', date],
    queryFn: () => api.getDuties({ date }),
  })

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.getDrivers(),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  })

  const { data: liveData } = useQuery({
    queryKey: ['live-dispatch', date, 'active'],
    queryFn: () => api.getLiveDispatch(date, 'active'),
    refetchInterval: 30_000,
  })

  const { data: opsTrips = [] } = useQuery({
    queryKey: ['operational-trips'],
    queryFn: () => api.getOperationalTrips(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: string; update: Record<string, unknown> }) =>
      api.updateDuty(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duties', date] })
      queryClient.invalidateQueries({ queryKey: ['live-dispatch'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Update failed'),
  })

  const assignBlocks = getDutyComplianceBlocks(
    drivers.find((d) => d.id === selectedDriver) ?? null,
    vehicles.find((v) => v.id === selectedVehicle) ?? null,
  )
  const assignWarnings = getDutyComplianceWarnings(
    drivers.find((d) => d.id === selectedDriver) ?? null,
    vehicles.find((v) => v.id === selectedVehicle) ?? null,
  )

  async function applyUpdate(dutyId: string, update: Record<string, unknown>) {
    setError('')
    await updateMutation.mutateAsync({ id: dutyId, update })
  }

  function complianceForDuty(duty: DutyRecord) {
    const driver = resolveDriver(duty.driver, drivers)
    const vehicle = resolveVehicle(duty.vehicle, vehicles)
    return {
      blocks: getDutyComplianceBlocks(driver, vehicle),
      warnings: getDutyComplianceWarnings(driver, vehicle),
    }
  }

  async function handleDrop(dutyId: string, targetColumn: DispatchColumn) {
    const duty = duties.find((d) => d.id === dutyId)
    if (!duty) return

    if (columnForDuty(duty) === targetColumn) return

    const opsTrip = opsTrips.find((t) => t.dutyId === dutyId)
    if (opsTrip && targetColumn !== 'completed') {
      setTransferTripId(opsTrip.id)
      return
    }

    const update = updateForColumn(targetColumn)
    if (!update) return

    if (targetColumn === 'assigned' && (!duty.driver || !duty.vehicle)) {
      setAssigning(dutyId)
      setPendingColumn('assigned')
      setSelectedDriver(duty.driver?.id ?? '')
      setSelectedVehicle(duty.vehicle?.id ?? '')
      return
    }

    const preview = applyUpdatePreview(duty, update)
    const scheduleConflicts = getDutyConflicts(preview, duties)
    const { blocks } = complianceForDuty(preview)
    const allBlocks = [...scheduleConflicts, ...blocks]

    if (allBlocks.length > 0 && !canOverride) {
      setError(`Cannot move duty: ${allBlocks.join('; ')}`)
      return
    }

    if (allBlocks.length > 0 && canOverride) {
      setPendingMove({ dutyId, update: { ...update, dispatchOverride: true }, conflicts: allBlocks })
      return
    }

    await applyUpdate(dutyId, update)
  }

  async function handleAssign(dutyId: string) {
    const update: Record<string, unknown> = {
      driverId: selectedDriver || null,
      vehicleId: selectedVehicle || null,
    }
    if (pendingColumn === 'assigned' && selectedDriver && selectedVehicle) {
      update.status = 'assigned'
    }

    const duty = duties.find((d) => d.id === dutyId)
    if (duty) {
      const driver = drivers.find((d) => d.id === selectedDriver) ?? null
      const vehicle = vehicles.find((v) => v.id === selectedVehicle) ?? null
      const preview: DutyRecord = {
        ...duty,
        driver: driver
          ? { id: driver.id, firstName: driver.firstName, lastName: driver.lastName, status: driver.status }
          : null,
        vehicle: vehicle
          ? { id: vehicle.id, registrationNumber: vehicle.registrationNumber, status: vehicle.status }
          : null,
        status: typeof update.status === 'string' ? update.status : duty.status,
      }
      const allBlocks = [
        ...getDutyConflicts(preview, duties),
        ...getDutyComplianceBlocks(driver, vehicle),
      ]

      if (allBlocks.length > 0 && !canOverride) {
        setError(`Cannot assign: ${allBlocks.join('; ')}`)
        return
      }
      if (allBlocks.length > 0 && canOverride) {
        setPendingMove({
          dutyId,
          update: { ...update, dispatchOverride: true },
          conflicts: allBlocks,
        })
        setAssigning(null)
        setPendingColumn(null)
        return
      }
    }

    await applyUpdate(dutyId, update)
    setAssigning(null)
    setPendingColumn(null)
    setSelectedDriver('')
    setSelectedVehicle('')
  }

  const liveVehicles = liveData?.vehicles ?? []
  const unassignedCount = dutiesForColumn(duties, 'unassigned').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dispatch</h1>
          <p className="text-sm text-slate-600">
            Plan and assign duties — dragging between columns opens the transfer workflow when an operational trip exists
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <Link
            to="/live-operations"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Live Operations
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{col.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{dutiesForColumn(duties, col.key).length}</p>
          </div>
        ))}
      </div>

      {unassignedCount > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {unassignedCount} {unassignedCount === 1 ? 'duty' : 'duties'} still unassigned for this date.
        </p>
      )}

      <SectionCard
        title="Live map"
        description="Active duties with GPS — refreshes every 30 seconds"
        flush
        action={
          <button
            type="button"
            onClick={() => mapRef.current?.fitFleet()}
            className="text-xs font-medium text-command-600 hover:underline"
          >
            Fit all vehicles
          </button>
        }
      >
        <LiveVehicleMap
          ref={mapRef}
          vehicles={liveVehicles}
          className="h-64"
          edgeToEdge
          resultsLabel={`${liveVehicles.length} active duties`}
        />
      </SectionCard>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading dispatch board…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`rounded-lg border p-3 transition-colors ${
                dropTarget === col.key ? 'border-command-500 bg-command-50' : 'border-slate-200 bg-slate-50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDropTarget(col.key)
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDropTarget(null)
                const dutyId = e.dataTransfer.getData('text/duty-id')
                if (dutyId) void handleDrop(dutyId, col.key)
                setDraggingId(null)
              }}
            >
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>{col.label}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">
                  {dutiesForColumn(duties, col.key).length}
                </span>
              </h2>
              <div className="min-h-[120px] space-y-2">
                {dutiesForColumn(duties, col.key).map((duty) => {
                  const scheduleConflicts = getDutyConflicts(duty, duties)
                  const { blocks, warnings } = complianceForDuty(duty)
                  const cardAlerts = [...scheduleConflicts, ...blocks, ...warnings]
                  const hasBlock = scheduleConflicts.length > 0 || blocks.length > 0
                  return (
                    <div
                      key={duty.id}
                      draggable={col.key !== 'completed'}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/duty-id', duty.id)
                        setDraggingId(duty.id)
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={`cursor-grab rounded-lg border bg-white p-2.5 shadow-sm transition active:cursor-grabbing ${
                        hasBlock
                          ? 'border-red-400 ring-1 ring-red-100'
                          : cardAlerts.length
                            ? 'border-amber-400 ring-1 ring-amber-100'
                            : 'border-slate-200'
                      } ${draggingId === duty.id ? 'opacity-50' : 'hover:border-slate-300'}`}
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {duty.route?.name ?? duty.reference}
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-slate-500">{duty.startTime ?? '—'}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : 'No driver'}
                        {' · '}
                        {duty.vehicle?.registrationNumber ?? 'No vehicle'}
                      </p>
                      {cardAlerts.length > 0 && (
                        <span
                          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            hasBlock ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {cardAlerts[0]}
                        </span>
                      )}
                      {col.key !== 'completed' && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAssigning(duty.id)
                              setPendingColumn(null)
                              setSelectedDriver(duty.driver?.id ?? '')
                              setSelectedVehicle(duty.vehicle?.id ?? '')
                            }}
                            className="text-xs font-medium text-command-600 hover:underline"
                          >
                            Assign
                          </button>
                          <ManageAssignmentButton
                            dutyId={duty.id}
                            className="text-xs font-medium text-command-600 hover:underline"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
                {!dutiesForColumn(duties, col.key).length && (
                  <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/60">
                    <p className="text-xs text-slate-400">Drop duties here</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {assigning && (
        <AssignModal
          drivers={drivers}
          vehicles={vehicles}
          selectedDriver={selectedDriver}
          selectedVehicle={selectedVehicle}
          onDriverChange={setSelectedDriver}
          onVehicleChange={setSelectedVehicle}
          blocks={assignBlocks}
          warnings={assignWarnings}
          canOverride={canOverride}
          onCancel={() => {
            setAssigning(null)
            setPendingColumn(null)
          }}
          onSave={() => handleAssign(assigning)}
        />
      )}

      {pendingMove && (
        <OverrideModal
          conflicts={pendingMove.conflicts}
          onCancel={() => setPendingMove(null)}
          onConfirm={async () => {
            await applyUpdate(pendingMove.dutyId, pendingMove.update)
            setPendingMove(null)
          }}
        />
      )}

      {transferTripId && (
        <ManageAssignmentDrawer
          tripId={transferTripId}
          initialScope="entire_trip"
          onClose={() => setTransferTripId(null)}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['duties', date] })
            queryClient.invalidateQueries({ queryKey: ['operational-trips'] })
          }}
        />
      )}
    </div>
  )
}

function AssignModal({
  drivers,
  vehicles,
  selectedDriver,
  selectedVehicle,
  onDriverChange,
  onVehicleChange,
  blocks,
  warnings,
  canOverride,
  onCancel,
  onSave,
}: {
  drivers: Array<{ id: string; firstName: string; lastName: string }>
  vehicles: Array<{ id: string; registrationNumber: string }>
  selectedDriver: string
  selectedVehicle: string
  onDriverChange: (id: string) => void
  onVehicleChange: (id: string) => void
  blocks: string[]
  warnings: string[]
  canOverride: boolean
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Assign duty</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="assign-driver" className="mb-1 block text-sm font-medium text-slate-700">
              Driver
            </label>
            <select
              id="assign-driver"
              value={selectedDriver}
              onChange={(e) => onDriverChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assign-vehicle" className="mb-1 block text-sm font-medium text-slate-700">
              Vehicle
            </label>
            <select
              id="assign-vehicle"
              value={selectedVehicle}
              onChange={(e) => onVehicleChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber}
                </option>
              ))}
            </select>
          </div>
        </div>
        {blocks.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-900">
            {blocks.map((w) => (
              <li key={w}>Blocked: {w}</li>
            ))}
          </ul>
        )}
        {warnings.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            {warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={blocks.length > 0 && !canOverride}
            onClick={onSave}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
          >
            Save assignment
          </button>
        </div>
      </div>
    </div>
  )
}

function OverrideModal({
  conflicts,
  onCancel,
  onConfirm,
}: {
  conflicts: string[]
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-amber-800">Override required</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {conflicts.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-slate-600">You have override permission. Proceed anyway?</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Override and save
          </button>
        </div>
      </div>
    </div>
  )
}
