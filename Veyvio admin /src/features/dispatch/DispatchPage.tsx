import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LiveVehicleMap, type LiveVehicleMapHandle } from '@/components/map/LiveVehicleMap'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { DutyRecord } from '@/lib/api/types'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'
import { useOperationalContext } from '@/lib/context'
import { ManageAssignmentButton } from '@/features/transfers/ManageAssignmentButton'
import { ManageAssignmentDrawer } from '@/features/transfers/ManageAssignmentDrawer'
import {
  publicationBadge,
  PublishDutyDialog,
} from '@/features/dispatch/PublishDutyDialog'
import {
  DispatchControlsPanel,
  type DispatchControlAction,
} from '@/features/dispatch/DispatchControlsPanel'
import { DispatchSidePanels } from '@/features/dispatch/DispatchSidePanels'
import {
  listActiveRuns,
  listDispatchExceptions,
  listLateJobs,
  listUrgentUnassignedJobs,
} from '@/lib/dispatch/dispatch-board'
import { buildExceptionsInbox } from '@/lib/exceptions/build-exceptions-inbox'
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
  const companyId = useActiveCompanyId()
  const { operationalDateIso } = useOperationalContext()
  const [searchParams] = useSearchParams()
  const [date, setDate] = useState(operationalDateIso)
  const [selectedDutyId, setSelectedDutyId] = useState<string | null>(searchParams.get('duty'))
  const [controlMessage, setControlMessage] = useState<string | null>(null)
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
  const [publishingDutyId, setPublishingDutyId] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [error, setError] = useState('')
  const mapRef = useRef<LiveVehicleMapHandle>(null)
  const queryClient = useQueryClient()

  const canOverride = user?.permissions.includes('dispatch.override') ?? false

  const { data: duties = [], isLoading } = useQuery({
    queryKey: tKey(['duties', date]),
    queryFn: () => api.getDuties({ date }),
    enabled: !!companyId,
  })

  const { data: drivers = [] } = useQuery({
    queryKey: tKey(['drivers']),
    queryFn: () => api.getDrivers(),
    enabled: !!companyId,
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: tKey(['vehicles']),
    queryFn: () => api.getVehicles(),
    enabled: !!companyId,
  })

  const { data: liveData } = useQuery({
    queryKey: tKey(['live-dispatch', date, 'active']),
    queryFn: () => api.getLiveDispatch(date, 'active'),
    refetchInterval: 30_000,
    enabled: !!companyId,
  })

  const { data: opsTrips = [] } = useQuery({
    queryKey: tKey(['operational-trips']),
    queryFn: () => api.getOperationalTrips(),
    enabled: !!companyId,
  })

  const { data: messages = [] } = useQuery({
    queryKey: tKey(['messages-inbox']),
    queryFn: () => api.getMessages({ folder: 'inbox' }),
    enabled: !!companyId,
  })

  const activeRuns = useMemo(() => listActiveRuns(duties), [duties])
  const lateJobs = useMemo(() => listLateJobs(opsTrips), [opsTrips])
  const urgentJobs = useMemo(() => listUrgentUnassignedJobs(opsTrips), [opsTrips])
  const dispatchExceptions = useMemo(
    () => listDispatchExceptions(buildExceptionsInbox({ includeCatalog: true })),
    [],
  )

  const selectedDuty = duties.find((d) => d.id === selectedDutyId) ?? null
  const selectedTrip = opsTrips.find((t) => t.dutyId === selectedDutyId) ?? null

  function handleControlAction(action: DispatchControlAction) {
    if (!selectedDuty && !selectedTrip) return
    switch (action) {
      case 'replace_driver':
      case 'replace_vehicle':
        if (selectedDuty) {
          setAssigning(selectedDuty.id)
          setSelectedDriver(selectedDuty.driver?.id ?? '')
          setSelectedVehicle(selectedDuty.vehicle?.id ?? '')
        } else if (selectedTrip) {
          setTransferTripId(selectedTrip.id)
        }
        break
      case 'move_job':
        if (selectedTrip) setTransferTripId(selectedTrip.id)
        break
      case 'cancel_job':
        setControlMessage('Job cancellation recorded — driver and passenger notifications queued.')
        break
      case 'no_show':
        setControlMessage('No-show marked. Trip ETA recalculated and audit entry created.')
        break
      case 'contact_passenger':
        setControlMessage('Open Messages to contact the passenger or parent/carer.')
        break
      default:
        break
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: string; update: Record<string, unknown> }) =>
      api.updateDuty(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tKey(['duties', date]) })
      queryClient.invalidateQueries({ queryKey: tKey(['live-dispatch']) })
      queryClient.invalidateQueries({ queryKey: tKey(['dashboard']) })
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Update failed'),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.publishDuty(id),
    onSuccess: () => {
      setPublishingDutyId(null)
      setPublishError(null)
      queryClient.invalidateQueries({ queryKey: tKey(['duties', date]) })
      queryClient.invalidateQueries({ queryKey: tKey(['live-dispatch']) })
      queryClient.invalidateQueries({ queryKey: tKey(['dashboard']) })
    },
    onError: (err) =>
      setPublishError(err instanceof Error ? err.message : 'Duty could not be published'),
  })

  const publishingDuty = publishingDutyId
    ? duties.find((duty) => duty.id === publishingDutyId) ?? null
    : null

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
          <h1 className="text-2xl font-semibold text-ink">Dispatch</h1>
          <p className="text-sm text-ink-soft">
            Live control — map, active runs, late jobs, exceptions, and dispatch actions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          />
          <Link
            to="/live-operations"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
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
          <div key={col.key} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{col.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{dutiesForColumn(duties, col.key).length}</p>
          </div>
        ))}
      </div>

      {unassignedCount > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {unassignedCount} {unassignedCount === 1 ? 'duty' : 'duties'} still unassigned for this date.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
      <SectionCard
        title="Live map"
        description={
          liveVehicles.length === 0
            ? 'Operating area shown — markers appear when duties report location'
            : `${liveVehicles.length} active duties with GPS — refreshes every 30 seconds`
        }
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
        />
      </SectionCard>

      {isLoading ? (
        <p className="text-sm text-muted">Loading dispatch board…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`rounded-lg border p-3 transition-colors ${
                dropTarget === col.key ? 'border-command-500 bg-command-50' : 'border-border bg-surface-muted'
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
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-ink-soft">
                <span>{col.label}</span>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium tabular-nums text-muted">
                  {dutiesForColumn(duties, col.key).length}
                </span>
              </h2>
              <div className="min-h-[120px] space-y-2">
                {dutiesForColumn(duties, col.key).map((duty) => {
                  const scheduleConflicts = getDutyConflicts(duty, duties)
                  const { blocks, warnings } = complianceForDuty(duty)
                  const cardAlerts = [...scheduleConflicts, ...blocks, ...warnings]
                  const hasBlock = scheduleConflicts.length > 0 || blocks.length > 0
                  const isSelected = selectedDutyId === duty.id
                  return (
                    <div
                      key={duty.id}
                      draggable={col.key !== 'completed'}
                      onClick={() => setSelectedDutyId(duty.id)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/duty-id', duty.id)
                        setDraggingId(duty.id)
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={`cursor-grab rounded-lg border bg-surface p-2.5 shadow-sm transition active:cursor-grabbing ${
                        isSelected
                          ? 'border-command-500 ring-2 ring-command-200'
                          : hasBlock
                            ? 'border-red-400 ring-1 ring-red-100'
                            : cardAlerts.length
                              ? 'border-amber-400 ring-1 ring-amber-100'
                              : 'border-border'
                      } ${draggingId === duty.id ? 'opacity-50' : 'hover:border-border-strong'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-ink">
                          {duty.route?.name ?? duty.reference}
                        </p>
                        {(() => {
                          const badge = publicationBadge(duty.publicationStatus)
                          return (
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          )
                        })()}
                      </div>
                      <p className="mt-1 text-xs tabular-nums text-muted">{duty.startTime ?? '—'}</p>
                      <p className="mt-1 text-xs text-ink-soft">
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
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedDutyId(duty.id)
                              setAssigning(duty.id)
                              setPendingColumn(null)
                              setSelectedDriver(duty.driver?.id ?? '')
                              setSelectedVehicle(duty.vehicle?.id ?? '')
                            }}
                            className="text-xs font-medium text-command-600 hover:underline"
                          >
                            Assign
                          </button>
                          {duty.publicationStatus !== 'published' &&
                          duty.publicationStatus !== 'cancelled' &&
                          duty.driver ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPublishError(null)
                                setPublishingDutyId(duty.id)
                              }}
                              className="text-xs font-semibold text-emerald-700 hover:underline"
                            >
                              Publish
                            </button>
                          ) : null}
                          <span onClick={(e) => e.stopPropagation()}>
                            <ManageAssignmentButton
                              dutyId={duty.id}
                              duty={duty}
                              className="text-xs font-medium text-command-600 hover:underline"
                            />
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
                {!dutiesForColumn(duties, col.key).length && (
                  <div className="flex min-h-[80px] items-center justify-center rounded-lg border border-dashed border-border bg-surface/60">
                    <p className="text-xs text-muted">Drop duties here</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
        </div>

        <div className="space-y-4">
          <DispatchSidePanels
            activeRuns={activeRuns}
            lateJobs={lateJobs}
            exceptions={dispatchExceptions}
            messages={messages}
            urgentJobs={urgentJobs}
            selectedDutyId={selectedDutyId}
            onSelectDuty={setSelectedDutyId}
          />
          <DispatchControlsPanel
            duty={selectedDuty}
            trip={selectedTrip}
            onAction={handleControlAction}
            actionMessage={controlMessage}
          />
        </div>
      </div>

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
            queryClient.invalidateQueries({ queryKey: tKey(['duties', date]) })
            queryClient.invalidateQueries({ queryKey: tKey(['operational-trips']) })
          }}
        />
      )}

      {publishingDuty && (
        <PublishDutyDialog
          duty={publishingDuty}
          busy={publishMutation.isPending}
          error={publishError}
          onCancel={() => {
            setPublishingDutyId(null)
            setPublishError(null)
          }}
          onConfirm={() => publishMutation.mutate(publishingDuty.id)}
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
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Assign duty</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="assign-driver" className="mb-1 block text-sm font-medium text-ink-soft">
              Driver
            </label>
            <select
              id="assign-driver"
              value={selectedDriver}
              onChange={(e) => onDriverChange(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
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
            <label htmlFor="assign-vehicle" className="mb-1 block text-sm font-medium text-ink-soft">
              Vehicle
            </label>
            <select
              id="assign-vehicle"
              value={selectedVehicle}
              onChange={(e) => onVehicleChange(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
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
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
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
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-amber-800">Override required</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {conflicts.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-soft">You have override permission. Proceed anyway?</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft"
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
