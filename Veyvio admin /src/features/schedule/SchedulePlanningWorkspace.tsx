import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ChevronRight, GripVertical, Plus, XCircle } from 'lucide-react'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api/client'
import type { DutyRecord } from '@/lib/api/types'
import type { PlanningAssignmentValidation, PlanningJob } from '@/lib/schedule/planning-types'
import { listUnscheduledPlanningJobs } from '@/lib/schedule/unscheduled-jobs'
import { buildScheduleOptimisations } from '@/lib/schedule/schedule-optimisation'
import { ScheduleOptimisationPanel } from '@/features/schedule/ScheduleOptimisationPanel'
import { scheduleServiceColour } from '@/lib/ops/runs-trips-schedule'
import type { OperationalTrip } from '@/lib/transfers/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const SOURCE_FILTERS = [
  { id: 'all', label: 'All sources' },
  { id: 'booking', label: 'Bookings' },
  { id: 'dial_a_ride', label: 'Dial-a-Ride' },
  { id: 'school_route', label: 'School routes' },
] as const

type SourceFilter = (typeof SOURCE_FILTERS)[number]['id']

function ValidationBadge({ level }: { level: PlanningAssignmentValidation['level'] }) {
  if (level === 'compatible') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Compatible
      </span>
    )
  }
  if (level === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
        <AlertTriangle className="h-3.5 w-3.5" />
        Warning
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800">
      <XCircle className="h-3.5 w-3.5" />
      Blocked
    </span>
  )
}

function JobCard({
  job,
  selected,
  checked,
  onSelect,
  onToggle,
}: {
  job: PlanningJob
  selected: boolean
  checked: boolean
  onSelect: () => void
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border p-3 text-left transition',
        selected ? 'border-command-400 bg-command-50/60 ring-1 ring-command-300' : 'border-border bg-surface hover:bg-surface-muted',
      )}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
          aria-label={`Select ${job.passengerName}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-ink">{job.requiredTime}</p>
            {job.priority === 'urgent' && <StatusPill status="critical" />}
          </div>
          <p className="mt-0.5 font-medium text-ink">{job.passengerName}</p>
          <p className="mt-1 text-xs text-ink-soft">{job.journey}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
              {job.sourceLabel}
            </span>
            <span className="text-[11px] text-ink-soft">{job.estimatedDurationMinutes} min</span>
            {job.requirements.map((req) => (
              <span key={req} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                {req}
              </span>
            ))}
          </div>
        </div>
        <GripVertical className="h-4 w-4 shrink-0 text-ink-soft/50" aria-hidden />
      </div>
    </button>
  )
}

function DutyTimelineCard({
  duty,
  trips,
  selectedTripId,
  onSelectTrip,
  onSelectDuty,
  selected,
}: {
  duty: DutyRecord
  trips: OperationalTrip[]
  selectedTripId: string | null
  onSelectTrip: (tripId: string) => void
  onSelectDuty: () => void
  selected: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        selected ? 'border-command-400 bg-command-50/40' : 'border-border bg-surface',
      )}
    >
      <button type="button" onClick={onSelectDuty} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-ink">{duty.reference}</p>
            <p className="text-xs text-ink-soft">
              {duty.startTime ?? '—'} · {duty.route?.name ?? 'Unnamed run'}
            </p>
          </div>
          <StatusPill status={duty.status === 'unassigned' ? 'unassigned' : 'assigned'} />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : 'No driver'} ·{' '}
          {duty.vehicle?.registrationNumber ?? 'No vehicle'}
        </p>
      </button>
      <div className="mt-3 space-y-2">
        {trips.length === 0 ? (
          <p className="text-xs text-ink-soft">No trips on this run yet.</p>
        ) : (
          trips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              onClick={() => onSelectTrip(trip.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm',
                selectedTripId === trip.id
                  ? 'border-command-300 bg-white'
                  : 'border-border bg-surface-muted hover:bg-white',
              )}
            >
              <span>
                <span className="font-medium text-ink">{trip.reference}</span>
                <span className="ml-2 text-ink-soft">{trip.jobs.length} jobs</span>
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', scheduleServiceColour(trip.routeName))}>
                {trip.assignmentStatus}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export function SchedulePlanningWorkspace({ serviceDate }: { serviceDate: string }) {
  const queryClient = useQueryClient()
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [selectedDutyId, setSelectedDutyId] = useState<string | null>(null)
  const [checkedJobIds, setCheckedJobIds] = useState<string[]>([])
  const [draftDriverId, setDraftDriverId] = useState<string>('')
  const [draftVehicleId, setDraftVehicleId] = useState<string>('')
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: tKey(['operational-trips']),
    queryFn: () => api.getOperationalTrips(),
  })

  const { data: duties = [], isLoading: dutiesLoading } = useQuery({
    queryKey: tKey(['duties-planning', serviceDate]),
    queryFn: () => api.getDuties({ date: serviceDate }),
  })

  const { data: drivers = [] } = useQuery({
    queryKey: tKey(['driver-profiles']),
    queryFn: () => api.getDriverProfiles(),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: tKey(['vehicle-profiles']),
    queryFn: () => api.getVehicleProfiles(),
  })

  const unscheduledJobs = useMemo(() => listUnscheduledPlanningJobs(trips), [trips])

  const filteredJobs = useMemo(() => {
    let list = unscheduledJobs
    if (sourceFilter !== 'all') {
      list = list.filter((j) => j.sourceType === sourceFilter)
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (j) =>
        j.passengerName.toLowerCase().includes(q) ||
        j.journey.toLowerCase().includes(q) ||
        j.reference.toLowerCase().includes(q),
    )
  }, [unscheduledJobs, sourceFilter, search])

  const tripsByDuty = useMemo(() => {
    const map = new Map<string, OperationalTrip[]>()
    for (const trip of trips) {
      if (!trip.dutyId) continue
      const list = map.get(trip.dutyId) ?? []
      list.push(trip)
      map.set(trip.dutyId, list)
    }
    return map
  }, [trips])

  const selectedJob = filteredJobs.find((j) => j.jobId === selectedJobId) ?? unscheduledJobs.find((j) => j.jobId === selectedJobId) ?? null
  const activeTripId = selectedTripId ?? selectedJob?.tripId ?? null
  const activeTrip = trips.find((t) => t.id === activeTripId) ?? null
  const activeDuty = duties.find((d) => d.id === (selectedDutyId ?? activeTrip?.dutyId)) ?? null

  const optimisationSuggestions = useMemo(
    () =>
      buildScheduleOptimisations({
        unscheduledJobs,
        checkedJobIds,
        activeTrip: activeTrip ?? null,
        duties,
        trips,
        drivers,
        vehicles,
      }),
    [unscheduledJobs, checkedJobIds, activeTrip, duties, trips, drivers, vehicles],
  )

  const { data: validation } = useQuery({
    queryKey: tKey(['schedule-planning-validation', activeTripId, draftDriverId, draftVehicleId, serviceDate]),
    queryFn: () =>
      api.validateSchedulePlanningAssignment({
        tripId: activeTripId!,
        driverId: draftDriverId || null,
        vehicleId: draftVehicleId || null,
        dutyDate: serviceDate,
      }),
    enabled: Boolean(activeTripId),
  })

  const invalidatePlanning = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['operational-trips']) })
    queryClient.invalidateQueries({ queryKey: tKey(['duties-planning', serviceDate]) })
    queryClient.invalidateQueries({ queryKey: tKey(['duties-week']) })
  }

  const assignMutation = useMutation({
    mutationFn: () =>
      api.assignPlanningTrip(activeTripId!, {
        driverId: draftDriverId || null,
        vehicleId: draftVehicleId || null,
      }),
    onSuccess: () => {
      setActionMessage('Driver and vehicle assigned to trip.')
      invalidatePlanning()
    },
  })

  const moveJobMutation = useMutation({
    mutationFn: ({ jobId, tripId }: { jobId: string; tripId: string }) => api.movePlanningJob(jobId, tripId),
    onSuccess: () => {
      setActionMessage('Job moved to selected trip.')
      invalidatePlanning()
    },
  })

  const createTripMutation = useMutation({
    mutationFn: (jobIds: string[]) =>
      api.createPlanningTripFromJobs(jobIds, {
        dutyId: selectedDutyId,
        runReference: activeDuty?.reference ?? null,
        routeName: activeDuty?.route?.name ?? 'Planned trip',
      }),
    onSuccess: (trip) => {
      setSelectedTripId(trip.id)
      setCheckedJobIds([])
      setActionMessage(`Trip ${trip.reference} created with ${trip.jobs.length} jobs.`)
      invalidatePlanning()
    },
  })

  const publishMutation = useMutation({
    mutationFn: (dutyId: string) => api.publishDuty(dutyId),
    onSuccess: () => {
      setActionMessage('Run published — driver acknowledgement required.')
      invalidatePlanning()
    },
    onError: (err: Error) => setActionMessage(err.message),
  })

  const toggleJobChecked = (jobId: string) => {
    setCheckedJobIds((prev) => (prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]))
  }

  const handleAssignToTrip = () => {
    if (!selectedJobId || !activeTripId || selectedJobId === activeTripId) return
    moveJobMutation.mutate({ jobId: selectedJobId, tripId: activeTripId })
  }

  return (
    <div className="space-y-4">
      {actionMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-950">
          {actionMessage}
        </div>
      )}

      <div className="grid min-h-[32rem] gap-4 lg:grid-cols-[minmax(240px,280px)_1fr_minmax(260px,300px)]">
        <SectionCard title="Unscheduled jobs" className="flex flex-col">
          <p className="mb-3 text-xs text-ink-soft">
            {filteredJobs.length} jobs need a run or trip assignment for {serviceDate}.
          </p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search passenger or route"
            className="mb-3 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
          <div className="mb-3 flex flex-wrap gap-1">
            {SOURCE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSourceFilter(f.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  sourceFilter === f.id ? 'bg-command-600 text-white' : 'bg-surface-muted text-ink-soft',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {tripsLoading ? (
              <p className="text-sm text-ink-soft">Loading jobs…</p>
            ) : filteredJobs.length === 0 ? (
              <p className="text-sm text-ink-soft">No unscheduled jobs for this filter.</p>
            ) : (
              filteredJobs.map((job) => (
                <JobCard
                  key={job.jobId}
                  job={job}
                  selected={selectedJobId === job.jobId}
                  checked={checkedJobIds.includes(job.jobId)}
                  onSelect={() => {
                    setSelectedJobId(job.jobId)
                    setSelectedTripId(job.tripId)
                  }}
                  onToggle={() => toggleJobChecked(job.jobId)}
                />
              ))
            )}
          </div>
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <button
              type="button"
              disabled={checkedJobIds.length === 0 || createTripMutation.isPending}
              onClick={() => createTripMutation.mutate(checkedJobIds)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-command-600 px-3 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Create trip ({checkedJobIds.length})
            </button>
            <Link
              to="/jobs?tab=unscheduled"
              className="block text-center text-xs font-medium text-command-700 hover:underline"
            >
              Open full job register
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Runs and trips" className="flex flex-col">
          <p className="mb-3 text-xs text-ink-soft">
            {duties.length} runs on {serviceDate}. Select a trip to assign crew and publish.
          </p>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {dutiesLoading ? (
              <p className="text-sm text-ink-soft">Loading runs…</p>
            ) : duties.length === 0 ? (
              <p className="text-sm text-ink-soft">No runs planned for this date.</p>
            ) : (
              duties.map((duty) => (
                <DutyTimelineCard
                  key={duty.id}
                  duty={duty}
                  trips={tripsByDuty.get(duty.id) ?? []}
                  selectedTripId={selectedTripId}
                  selected={selectedDutyId === duty.id}
                  onSelectDuty={() => {
                    setSelectedDutyId(duty.id)
                    const firstTrip = tripsByDuty.get(duty.id)?.[0]
                    if (firstTrip) setSelectedTripId(firstTrip.id)
                  }}
                  onSelectTrip={(tripId) => {
                    setSelectedTripId(tripId)
                    setSelectedDutyId(duty.id)
                  }}
                />
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Details and validation" className="flex flex-col">
          {!selectedJob && !activeTrip ? (
            <p className="text-sm text-ink-soft">Select a job or trip to review compatibility checks.</p>
          ) : (
            <div className="space-y-4">
              {selectedJob && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Selected job</p>
                  <p className="mt-1 font-semibold text-ink">{selectedJob.passengerName}</p>
                  <p className="text-sm text-ink-soft">{selectedJob.journey}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {selectedJob.sourceLabel} · {selectedJob.requiredTime} · {selectedJob.reference}
                  </p>
                </div>
              )}

              {activeTrip && (
                <div className="rounded-xl border border-border bg-surface-muted/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Trip</p>
                  <p className="mt-1 font-semibold text-ink">{activeTrip.reference}</p>
                  <p className="text-sm text-ink-soft">{activeTrip.routeName}</p>
                  <p className="mt-1 text-xs text-ink-soft">{activeTrip.jobs.length} jobs on trip</p>
                </div>
              )}

              {activeTrip && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-ink-soft">
                    Driver
                    <select
                      value={draftDriverId}
                      onChange={(e) => setDraftDriverId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    >
                      <option value="">Select driver</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.firstName} {d.lastName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-ink-soft">
                    Vehicle
                    <select
                      value={draftVehicleId}
                      onChange={(e) => setDraftVehicleId(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    >
                      <option value="">Select vehicle</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registrationNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {validation && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Validation</p>
                    <ValidationBadge level={validation.level} />
                  </div>
                  <ul className="space-y-2">
                    {validation.items.length === 0 ? (
                      <li className="text-sm text-emerald-800">Ready to assign and publish.</li>
                    ) : (
                      validation.items.map((item) => (
                        <li
                          key={item.id}
                          className={cn(
                            'rounded-lg px-3 py-2 text-sm',
                            item.level === 'blocked'
                              ? 'bg-red-50 text-red-900'
                              : item.level === 'warning'
                                ? 'bg-amber-50 text-amber-950'
                                : 'bg-emerald-50 text-emerald-900',
                          )}
                        >
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs opacity-90">{item.detail}</p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}

              <div className="space-y-2 border-t border-border pt-3">
                {selectedJob && activeTripId && selectedJob.tripId !== activeTripId && (
                  <button
                    type="button"
                    onClick={handleAssignToTrip}
                    disabled={moveJobMutation.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-muted"
                  >
                    Move job into {activeTrip?.reference}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => assignMutation.mutate()}
                  disabled={!activeTripId || !validation?.canAssign || assignMutation.isPending}
                  className="w-full rounded-xl bg-command-600 px-3 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-50"
                >
                  Assign driver and vehicle
                </button>
                {activeDuty && (
                  <button
                    type="button"
                    onClick={() => publishMutation.mutate(activeDuty.id)}
                    disabled={!validation?.canPublish || publishMutation.isPending}
                    className="w-full rounded-xl border border-command-300 bg-command-50 px-3 py-2 text-sm font-semibold text-command-900 hover:bg-command-100 disabled:opacity-50"
                  >
                    Publish run {activeDuty.reference}
                  </button>
                )}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <ScheduleOptimisationPanel
        suggestions={optimisationSuggestions}
        onApplyCrew={(driverId, vehicleId) => {
          setDraftDriverId(driverId)
          if (vehicleId) setDraftVehicleId(vehicleId)
          setActionMessage('Crew suggestion applied — review validation before assigning.')
        }}
        onApplyGrouping={(jobIds) => {
          setCheckedJobIds(jobIds)
          setActionMessage('Jobs selected — use Create trip to group them.')
        }}
      />
    </div>
  )
}
