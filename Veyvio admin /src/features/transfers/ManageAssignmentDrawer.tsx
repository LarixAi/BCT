import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import {
  TRANSFER_REASON_CODES,
  TRANSFER_WORKFLOW_LABELS,
  PASSENGER_FACING_TRANSFER_MESSAGE,
} from '@/lib/transfers/constants'
import { allowedTransferScopes, canPerformHandover, canOverrideTransferWarnings } from '@/lib/transfers/permissions'
import { HandoverWorkflowDialog } from './HandoverWorkflowDialog'
import type {
  CreateTransferInput,
  TransferCandidate,
  TransferScope,
  TransferWorkflowType,
} from '@/lib/transfers/types'
import { hasBlockingTransferErrors, hasTransferWarnings, getJobsInScope, requiresHandoverRecording } from '@/lib/transfers/validation'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

const STEPS = [
  'What to transfer',
  'Current position',
  'Receiving driver',
  'Validation',
  'Reason',
  'Impact preview',
  'Confirm',
] as const

export function ManageAssignmentDrawer({
  tripId,
  onClose,
  onComplete,
  initialScope,
}: {
  tripId: string
  onClose: () => void
  onComplete?: () => void
  initialScope?: TransferScope
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [scope, setScope] = useState<TransferScope>(initialScope ?? 'remaining_jobs')
  const [showHandover, setShowHandover] = useState(false)
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<TransferCandidate | null>(null)
  const [destinationTripId, setDestinationTripId] = useState<string | null>(null)
  const [reasonCode, setReasonCode] = useState('trip_late')
  const [adminNotes, setAdminNotes] = useState('')
  const [handoverLocation, setHandoverLocation] = useState('')
  const [handoverAuthorisedBy, setHandoverAuthorisedBy] = useState('')
  const [overrideWarnings, setOverrideWarnings] = useState(false)
  const [error, setError] = useState('')

  const { data: position } = useQuery({
    queryKey: ['operational-position', tripId],
    queryFn: () => api.getOperationalPosition(tripId),
  })

  const { data: candidates = [] } = useQuery({
    queryKey: ['transfer-candidates', tripId],
    queryFn: () => api.getTransferCandidates(tripId),
    enabled: step >= 2,
  })

  const { data: otherTrips = [] } = useQuery({
    queryKey: ['operational-trips'],
    queryFn: () => api.getOperationalTrips(),
    enabled: scope === 'selected_jobs' || scope === 'remaining_jobs',
  })

  const draftInput = useMemo((): CreateTransferInput | null => {
    if (!position) return null
    const reason = TRANSFER_REASON_CODES.find((r) => r.code === reasonCode)
    const jobsInScope = getJobsInScope(position.trip, {
      scope,
      sourceJobIds: scope === 'selected_jobs' ? selectedJobIds : undefined,
    })
    const onboard = requiresHandoverRecording(jobsInScope)
    return {
      sourceTripId: tripId,
      scope,
      workflowType: (onboard ? 'physical_handover' : 'live_transfer') as TransferWorkflowType,
      sourceJobIds: scope === 'selected_jobs' ? selectedJobIds : undefined,
      destinationTripId,
      newDriverId: selectedCandidate?.driverId ?? null,
      newVehicleId: selectedCandidate?.vehicleId ?? null,
      reasonCategory: reason?.category ?? 'operational_recovery',
      reasonCode,
      adminNotes: adminNotes || null,
      overrideWarnings,
      handoverLocation: handoverLocation || null,
      handoverAuthorisedBy: handoverAuthorisedBy || null,
    }
  }, [
    position,
    tripId,
    scope,
    selectedJobIds,
    destinationTripId,
    selectedCandidate,
    reasonCode,
    adminNotes,
    overrideWarnings,
    handoverLocation,
    handoverAuthorisedBy,
  ])

  const { data: validation } = useQuery({
    queryKey: ['transfer-validation', draftInput],
    queryFn: () => api.validateTransfer(draftInput!),
    enabled: !!draftInput && step >= 3,
  })

  const { data: impact } = useQuery({
    queryKey: ['transfer-impact', draftInput],
    queryFn: () => api.previewTransferImpact(draftInput!),
    enabled: !!draftInput && step >= 5,
  })

  const commit = useMutation({
    mutationFn: () => api.commitTransfer(draftInput!, `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-trip', tripId] })
      queryClient.invalidateQueries({ queryKey: ['operational-position', tripId] })
      queryClient.invalidateQueries({ queryKey: ['assignment-history', tripId] })
      queryClient.invalidateQueries({ queryKey: ['duties'] })
      queryClient.invalidateQueries({ queryKey: ['live-dispatch'] })
      onComplete?.()
      onClose()
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Transfer failed'),
  })

  const trip = position?.trip
  const jobsInScope = trip
    ? getJobsInScope(trip, { scope, sourceJobIds: scope === 'selected_jobs' ? selectedJobIds : undefined })
    : []
  const needsHandoverRecording = requiresHandoverRecording(jobsInScope)
  const workflowType = validation?.workflowType ?? (needsHandoverRecording ? 'physical_handover' : 'reassignment')
  const validationItems = validation?.items ?? []
  const blocking = hasBlockingTransferErrors(validationItems)
  const warnings = hasTransferWarnings(validationItems)
  const permissions = user?.permissions ?? []
  const scopeOptions = allowedTransferScopes(permissions)
  const handoverAllowed = canPerformHandover(permissions)
  const overrideAllowed = canOverrideTransferWarnings(permissions)

  function toggleJob(id: string) {
    setSelectedJobIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function nextStep() {
    setError('')
    if (step === 0 && scope === 'selected_jobs' && selectedJobIds.length === 0) {
      setError('Select at least one job.')
      return
    }
    if (step === 2 && !selectedCandidate && scope !== 'return_to_queue') {
      setError('Select a receiving driver or return to queue.')
      return
    }
    if (step === 4) {
      const reason = TRANSFER_REASON_CODES.find((r) => r.code === reasonCode)
      if (reason?.requiresNotes && !adminNotes.trim()) {
        setError('Detailed notes are required for this reason.')
        return
      }
      if (needsHandoverRecording && (!handoverLocation.trim() || !handoverAuthorisedBy.trim())) {
        setError('Handover location and authorisation are required when moving onboard passengers.')
        return
      }
    }
    if (step === 3 && blocking && !overrideWarnings) {
      setError('Resolve blocking validation errors or request manager override on the next step.')
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-command-600">Manage assignment</p>
              <h2 className="text-lg font-semibold text-slate-900">{trip?.reference ?? 'Loading…'}</h2>
              <p className="text-sm text-slate-600">
                {trip?.runReference ? `Run ${trip.runReference}` : 'Operational trip'}
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
          <ol className="mt-4 flex gap-1 overflow-x-auto text-[10px]">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`shrink-0 rounded-full px-2 py-0.5 ${
                  i === step ? 'bg-command-600 text-white' : i < step ? 'bg-command-100 text-command-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Select exactly what is being moved — not a generic reassignment.</p>
              {scopeOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                    scope === opt.id ? 'border-command-500 bg-command-50' : 'border-slate-200'
                  }`}
                >
                  <input type="radio" name="scope" checked={scope === opt.id} onChange={() => setScope(opt.id)} className="mt-1" />
                  <div>
                    <p className="font-medium text-slate-900">{opt.label}</p>
                    <p className="text-sm text-slate-600">{opt.description}</p>
                  </div>
                </label>
              ))}
              {scope === 'selected_jobs' && trip && (
                <SectionCard title="Select passengers to move">
                  <p className="mb-2 text-xs text-slate-500">
                    Select any passenger — onboard or not yet collected. Onboard moves are recorded as a handover.
                  </p>
                  <ul className="space-y-2 text-sm">
                    {trip.jobs
                      .filter((j) => j.status !== 'completed' && j.status !== 'transferred')
                      .map((j) => (
                        <li key={j.id}>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedJobIds.includes(j.id)}
                              onChange={() => toggleJob(j.id)}
                            />
                            <span>
                              {j.passengerName}
                              <span className="ml-1 text-slate-500">({j.status})</span>
                              {j.status === 'onboard' && (
                                <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                                  onboard — handover recorded
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      ))}
                  </ul>
                </SectionCard>
              )}
              {handoverAllowed && trip && trip.passengersOnboard > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHandover(true)}
                  className="text-sm text-command-700 underline hover:text-command-800"
                >
                  Or use the dedicated handover shortcut
                </button>
              )}
            </div>
          )}

          {step === 1 && position && (
            <SectionCard title="Current operational position">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <Stat label="Driver" value={trip?.driverName ?? 'Unassigned'} />
                <Stat label="Vehicle" value={trip?.vehicleRegistration ?? 'Unassigned'} />
                <Stat label="Trip status" value={trip?.status ?? '—'} />
                <Stat label="Onboard" value={String(trip?.passengersOnboard ?? 0)} />
                <Stat label="Completed jobs" value={String(position.completedJobs.length)} />
                <Stat label="Remaining jobs" value={String(position.remainingJobs.length)} />
                <Stat label="Delay" value={`${trip?.delayMinutes ?? 0} min`} />
                <Stat label="Driver online" value={trip?.driverOnline ? 'Yes' : 'No'} />
                <Stat label="Manifest v" value={String(trip?.manifestVersion ?? 0)} />
                <Stat label="Acknowledged" value={trip?.acknowledgedAt ? 'Yes' : 'Pending'} />
              </dl>
              {position.activeJob && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Active job: {position.activeJob.passengerName} ({position.activeJob.status})
                </p>
              )}
              {trip && trip.passengersOnboard > 0 && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {trip.passengersOnboard} passenger(s) onboard — you can move them using{' '}
                  <strong>Selected jobs</strong> or <strong>Remaining unstarted jobs</strong>. Record handover
                  location and authorisation on the reason step.
                </p>
              )}
            </SectionCard>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {scope !== 'return_to_queue' && (
                <>
                  <p className="text-sm text-slate-600">Ranked candidates — safest operational choices first.</p>
                  <div className="space-y-2">
                    {candidates.map((c) => (
                      <button
                        key={c.driverId}
                        type="button"
                        onClick={() => setSelectedCandidate(c)}
                        className={`w-full rounded-lg border p-3 text-left text-sm ${
                          selectedCandidate?.driverId === c.driverId
                            ? 'border-command-500 bg-command-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{c.driverName}</p>
                          <span className="text-xs text-slate-500">#{c.rank}</span>
                        </div>
                        <p className="mt-1 text-slate-600">
                          {c.vehicleRegistration ?? 'No vehicle'} · ETA {c.estimatedTravelMinutes} min ·{' '}
                          {c.isOnline ? 'Online' : 'Offline'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Punctuality {c.punctualityScore}% · WC {c.wheelchairCapacity} · Duty {c.remainingDutyHours.toFixed(1)}h left
                          {c.hasScheduleConflict && ' · Schedule conflict'}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {(scope === 'selected_jobs' || scope === 'remaining_jobs') && (
                <SectionCard title="Destination trip (optional)">
                  <select
                    value={destinationTripId ?? ''}
                    onChange={(e) => setDestinationTripId(e.target.value || null)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  >
                    <option value="">Create rescue / new trip</option>
                    {otherTrips
                      .filter((t) => t.id !== tripId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.reference} — {t.driverName ?? 'Unassigned'}
                        </option>
                      ))}
                  </select>
                </SectionCard>
              )}
              {scope === 'return_to_queue' && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Work will return to the unassigned queue and appear as an urgent exception.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <SectionCard title="Pre-transfer validation">
              <p className="mb-2 text-sm text-slate-600">
                Workflow: <strong>{TRANSFER_WORKFLOW_LABELS[workflowType]}</strong>
              </p>
              <ul className="space-y-2 text-sm">
                {validationItems.map((item) => (
                  <li
                    key={item.code}
                    className={`rounded-lg px-3 py-2 ${
                      item.level === 'error'
                        ? 'bg-red-50 text-red-900'
                        : item.level === 'warning'
                          ? 'bg-amber-50 text-amber-900'
                          : 'bg-blue-50 text-blue-900'
                    }`}
                  >
                    {item.message}
                  </li>
                ))}
                {validationItems.length === 0 && (
                  <li className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">All checks passed.</li>
                )}
              </ul>
              {warnings && overrideAllowed && (
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={overrideWarnings} onChange={(e) => setOverrideWarnings(e.target.checked)} />
                  Manager override — acknowledge warnings and proceed
                </label>
              )}
            </SectionCard>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-slate-600">Transfer reason</span>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                >
                  {TRANSFER_REASON_CODES.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Admin notes (internal)</span>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </label>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Passenger message: {PASSENGER_FACING_TRANSFER_MESSAGE}
              </p>

              {(needsHandoverRecording || step >= 4) && jobsInScope.some((j) => j.status === 'onboard') && (
                <SectionCard title="Record handover (required for onboard passengers)">
                  <p className="mb-3 text-xs text-slate-500">
                    This creates an immutable transfer record with handover location, authorisation, driver
                    notifications, and change history on the trip.
                  </p>
                  <div className="space-y-3">
                    <label className="block text-sm">
                      <span className="text-slate-600">Handover location</span>
                      <input
                        value={handoverLocation}
                        onChange={(e) => setHandoverLocation(e.target.value)}
                        placeholder="e.g. A406 lay-by northbound"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-slate-600">Authorised by</span>
                      <input
                        value={handoverAuthorisedBy}
                        onChange={(e) => setHandoverAuthorisedBy(e.target.value)}
                        placeholder="Duty manager or dispatcher name"
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
                      />
                    </label>
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {step === 5 && impact && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ImpactCard title="Before" snapshot={impact.before} />
                <ImpactCard title="After" snapshot={impact.after} />
              </div>
              {impact.arrivalImprovementMinutes != null && (
                <p className="text-sm text-emerald-800">
                  School arrival improves by {impact.arrivalImprovementMinutes} minutes.
                </p>
              )}
              <SectionCard title="Affected passengers">
                <ul className="list-inside list-disc text-sm">
                  {impact.affectedPassengers.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </SectionCard>
              {impact.jobsRemainingWithOriginal.length > 0 && (
                <p className="text-sm text-slate-600">
                  Remaining with original driver: {impact.jobsRemainingWithOriginal.join(', ')}
                </p>
              )}
              {impact.managerApprovalRequired && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Manager approval may be required before commit.
                </p>
              )}
            </div>
          )}

          {step === 6 && (
            <SectionCard title="Confirm transfer">
              <p className="text-sm text-slate-700">
                Confirming will permanently record this move. Nothing is silently reassigned.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>
                  <strong>Transfer record</strong> — reason, scope, before/after snapshot, transfer ID
                </li>
                <li>
                  <strong>Change history</strong> — visible on the trip and run detail pages (immutable)
                </li>
                <li>
                  <strong>Driver notifications</strong> — original and receiving drivers notified; acknowledgement tracked
                </li>
                {needsHandoverRecording && (
                  <li>
                    <strong>Handover</strong> — location ({handoverLocation || '—'}), authorised by{' '}
                    {handoverAuthorisedBy || '—'}
                  </li>
                )}
                <li>
                  <strong>Manifest</strong> — version bumped; ETAs recalculated
                </li>
              </ul>
              <ul className="mt-3 list-inside list-disc text-sm text-slate-600">
                <li>Scope: {scopeOptions.find((s) => s.id === scope)?.label ?? scope}</li>
                <li>Reason: {TRANSFER_REASON_CODES.find((r) => r.code === reasonCode)?.label}</li>
                <li>Moving: {jobsInScope.map((j) => j.passengerName).join(', ') || '—'}</li>
                {selectedCandidate && <li>Receiving: {selectedCandidate.driverName}</li>}
              </ul>
              {blocking && !overrideWarnings && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                  {validationItems
                    .filter((i) => i.level === 'error')
                    .map((i) => i.message)
                    .join(' ')}{' '}
                  Go back to Validation to review.
                </p>
              )}
            </SectionCard>
          )}

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        </div>

        <footer className="flex justify-between border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : onClose())}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium"
          >
            {step > 0 ? 'Back' : 'Cancel'}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => commit.mutate()}
              disabled={commit.isPending || (blocking && !overrideWarnings)}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
            >
              Confirm transfer
            </button>
          )}
        </footer>
      </div>
      {showHandover && (
        <HandoverWorkflowDialog
          tripId={tripId}
          onClose={() => setShowHandover(false)}
          onComplete={onComplete}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium capitalize text-slate-900">{value}</dd>
    </div>
  )
}

function ImpactCard({
  title,
  snapshot,
}: {
  title: string
  snapshot: import('@/lib/transfers/types').TransferImpactSnapshot
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2">Driver: {snapshot.driverName ?? '—'}</p>
      <p>Vehicle: {snapshot.vehicleRegistration ?? '—'}</p>
      <p>Pickup ETA: {snapshot.pickupEta ?? '—'}</p>
      <p>Jobs: {snapshot.jobCount}</p>
      <p>Delay: {snapshot.delayMinutes} min</p>
      <p>Onboard: {snapshot.passengersOnboard}</p>
    </div>
  )
}
