import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { DISPATCH_MODE_OPTIONS } from '@/lib/bookings/constants'
import type { AutoPlanProposal, BookingDraft, DispatchMode } from '@/lib/bookings/types'
import { evaluateDriverEligibility, jobContextFromBookingRequirements } from '@/lib/eligibility/engine'
import { resolveFleetResourcesHub } from '@/lib/fleet-resources/resolve-hub'
import { evaluateVehicleRelease } from '@/lib/vehicles/release'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function DispatchStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const { data: depots = [] } = useQuery({ queryKey: tKey(['depots']), queryFn: () => api.getDepots() })
  const { data: driverProfiles = [] } = useQuery({
    queryKey: tKey(['driver-profiles']),
    queryFn: () => api.getDriverProfiles(),
  })
  const { data: vehicleProfiles = [] } = useQuery({
    queryKey: tKey(['vehicle-profiles']),
    queryFn: () => api.getVehicleProfiles(),
  })
  const { data: staff = [] } = useQuery({ queryKey: tKey(['staff']), queryFn: () => api.getStaff() })
  const { data: resources } = useQuery({
    queryKey: tKey(['fleet-resources-hub']),
    queryFn: () =>
      resolveFleetResourcesHub({
        fetchLiveHub: () => api.getFleetResourcesHub(),
        fetchProfiles: () => api.getVehicleProfiles(),
      }),
    retry: 1,
  })
  const resourceCtx = useMemo(
    () => ({
      tyres: resources?.hub.tyres,
      equipment: resources?.hub.equipment,
    }),
    [resources],
  )

  const dispatch = draft.dispatch

  function setDispatch(patch: Partial<typeof dispatch>) {
    onChange({ dispatch: { ...dispatch, ...patch } })
  }

  const jobCtx = useMemo(
    () =>
      jobContextFromBookingRequirements({
        wheelchairAccessible: draft.requirements.wheelchairAccessible,
        safeguardingRequired: draft.passengers.some((p) => p.safeguardingFlag),
        schoolContract: draft.bookingType === 'school',
        escortRequired: draft.requirements.passengerAssistant,
      }),
    [draft],
  )

  const vehicleCtx = useMemo(
    () => ({
      wheelchairRequired: jobCtx.wheelchairRequired,
      schoolContract: jobCtx.schoolContract,
      minSeatingCapacity: draft.passengers.length || undefined,
    }),
    [jobCtx, draft.passengers.length],
  )

  const vehicleOptions = vehicleProfiles.map((v) => {
    const release = evaluateVehicleRelease(v, vehicleCtx, resourceCtx)
    const suffix = release.canAllocate ? '' : ' — not released'
    return {
      value: v.id,
      label: `${v.registrationNumber}${suffix}`,
      disabled: !release.canAllocate,
    }
  })

  const selectedVehicle = vehicleProfiles.find((v) => v.id === dispatch.vehicleId)
  const selectedVehicleRelease = selectedVehicle
    ? evaluateVehicleRelease(selectedVehicle, vehicleCtx, resourceCtx)
    : null
  const driverOptions = driverProfiles.map((d) => {
    const eligibility = evaluateDriverEligibility(d, jobCtx)
    const suffix = eligibility.canAssign ? '' : ' — not eligible'
    return {
      value: d.id,
      label: `${d.firstName} ${d.lastName}${suffix}`,
      disabled: !eligibility.canAssign,
    }
  })

  const selectedDriver = driverProfiles.find((d) => d.id === dispatch.driverId)
  const selectedEligibility = selectedDriver ? evaluateDriverEligibility(selectedDriver, jobCtx) : null

  return (
    <div className="space-y-4">
      <SectionCard title="Dispatch mode" description="Admin books the requirement — dispatch delivers the operation">
        <div className="space-y-2">
          {DISPATCH_MODE_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                dispatch.mode === opt.id ? 'border-command-500 bg-command-50' : 'border-border'
              }`}
            >
              <input
                type="radio"
                name="dispatch-mode"
                checked={dispatch.mode === opt.id}
                onChange={() => setDispatch({ mode: opt.id as DispatchMode })}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-ink">{opt.label}</p>
                <p className="text-sm text-ink-soft">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      {dispatch.mode === 'assign_now' && (
        <SectionCard title="Assignment">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Depot"
              value={dispatch.depotId ?? ''}
              onChange={(v) => setDispatch({ depotId: v || null })}
              options={depots.map((d) => ({ value: d.id, label: d.name }))}
            />
            <SelectField
              label="Driver"
              value={dispatch.driverId ?? ''}
              onChange={(v) => setDispatch({ driverId: v || null })}
              options={driverOptions}
            />
            <SelectField
              label="Vehicle"
              value={dispatch.vehicleId ?? ''}
              onChange={(v) => setDispatch({ vehicleId: v || null })}
              options={vehicleOptions}
            />
            <SelectField
              label="Passenger assistant"
              value={dispatch.assistantId ?? ''}
              onChange={(v) => setDispatch({ assistantId: v || null })}
              options={[{ value: '', label: 'None' }, ...staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))]}
            />
          </div>

          {selectedVehicle && (
            <div className="mt-4 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-ink">
              <p className="font-medium">Readiness (shared projection)</p>
              <p className="mt-1 text-xs text-ink-soft">
                {selectedVehicle.readiness.assignmentEligible
                  ? 'Eligible for assignment under current release rules.'
                  : 'Not eligible — maintenance, defects or release state block dispatch.'}
              </p>
              {selectedVehicle.readiness.blockingReasons.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-red-800">
                  {selectedVehicle.readiness.blockingReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              {selectedVehicle.readiness.warningReasons.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-amber-800">
                  {selectedVehicle.readiness.warningReasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs">
                <Link to={`/maintenance?vehicle=${selectedVehicle.id}`} className="font-medium text-command-600 hover:underline">
                  Open in Maintenance →
                </Link>
                {' · '}
                <Link to={`/vehicles/${selectedVehicle.id}?tab=Maintenance`} className="font-medium text-command-600 hover:underline">
                  Vehicle maintenance →
                </Link>
              </p>
            </div>
          )}

          {selectedVehicleRelease && !selectedVehicleRelease.canAllocate && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <p className="font-medium">Vehicle cannot be assigned for this booking</p>
              <ul className="mt-1 list-inside list-disc">
                {selectedVehicleRelease.failures.map((f) => (
                  <li key={f.code}>{f.message}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedVehicleRelease?.canAllocate && selectedVehicleRelease.warnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Vehicle release warnings</p>
              <ul className="mt-1 list-inside list-disc">
                {selectedVehicleRelease.warnings.map((w) => (
                  <li key={w.code}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedEligibility && !selectedEligibility.canAssign && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <p className="font-medium">Driver cannot be assigned for this booking</p>
              <ul className="mt-1 list-inside list-disc">
                {selectedEligibility.failures.map((f) => (
                  <li key={f.code}>{f.message}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedEligibility?.canAssign && selectedEligibility.warnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Assignment warnings</p>
              <ul className="mt-1 list-inside list-disc">
                {selectedEligibility.warnings.map((w) => (
                  <li key={w.code}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      )}

      {dispatch.mode === 'auto_plan' && (
        <AutoPlanPanel
          draft={draft}
          onAccept={(proposal) =>
            setDispatch({
              driverId: proposal.driverId,
              vehicleId: proposal.vehicleId,
            })
          }
        />
      )}
    </div>
  )
}

function AutoPlanPanel({
  draft,
  onAccept,
}: {
  draft: BookingDraft
  onAccept: (proposal: AutoPlanProposal) => void
}) {
  const { data: proposal, isLoading, refetch, isFetching } = useQuery({
    queryKey: tKey(['auto-plan', draft.id, draft.bookingType, draft.requirements.wheelchairAccessible]),
    queryFn: () => api.getAutoPlanProposal(draft),
  })

  if (isLoading) {
    return (
      <SectionCard title="Auto-plan proposal">
        <p className="text-sm text-ink-soft">Generating proposal…</p>
      </SectionCard>
    )
  }

  if (!proposal) {
    return (
      <SectionCard title="Auto-plan proposal">
        <p className="text-sm text-ink-soft">
          No eligible driver found for this booking — check compliance, restrictions and job requirements.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
        >
          Retry
        </button>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Auto-plan proposal" description="Review before accepting assignment">
      <div className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p>
            <span className="text-ink-soft">Driver:</span>{' '}
            <span className="font-medium">{proposal.driverName}</span>
          </p>
          <p>
            <span className="text-ink-soft">Vehicle:</span>{' '}
            <span className="font-medium">{proposal.vehicleRegistration}</span>
          </p>
          <p>
            <span className="text-ink-soft">Run:</span>{' '}
            <span className="font-medium">{proposal.runReference}</span>
          </p>
          <p>
            <span className="text-ink-soft">Punctuality score:</span>{' '}
            <span className="font-medium">{proposal.punctualityScore}%</span>
          </p>
        </div>
        {proposal.pickupSequence.length > 0 && (
          <div>
            <p className="text-ink-soft">Pickup sequence</p>
            <ol className="mt-1 list-inside list-decimal text-ink">
              {proposal.pickupSequence.map((stop) => (
                <li key={stop}>{stop}</li>
              ))}
            </ol>
          </div>
        )}
        {proposal.notes && (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900">{proposal.notes}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAccept(proposal)}
            disabled={isFetching}
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
          >
            Accept proposal
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
          >
            Regenerate
          </button>
        </div>
      </div>
    </SectionCard>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; disabled?: boolean }[]
}) {
  return (
    <label className="text-sm">
      <span className="text-ink-soft">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
