import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { DISPATCH_MODE_OPTIONS } from '@/lib/bookings/constants'
import type { AutoPlanProposal, BookingDraft, DispatchMode } from '@/lib/bookings/types'
import { evaluateDriverEligibility, jobContextFromBookingRequirements } from '@/lib/eligibility/engine'
import { evaluateVehicleRelease } from '@/lib/vehicles/release'
import { api } from '@/lib/api/client'

export function DispatchStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const { data: depots = [] } = useQuery({ queryKey: ['depots'], queryFn: () => api.getDepots() })
  const { data: driverProfiles = [] } = useQuery({
    queryKey: ['driver-profiles'],
    queryFn: () => api.getDriverProfiles(),
  })
  const { data: vehicleProfiles = [] } = useQuery({
    queryKey: ['vehicle-profiles'],
    queryFn: () => api.getVehicleProfiles(),
  })
  const { data: staff = [] } = useQuery({ queryKey: ['staff'], queryFn: () => api.getStaff() })

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
    const release = evaluateVehicleRelease(v, vehicleCtx)
    const suffix = release.canAllocate ? '' : ' — not released'
    return {
      value: v.id,
      label: `${v.registrationNumber}${suffix}`,
      disabled: !release.canAllocate,
    }
  })

  const selectedVehicle = vehicleProfiles.find((v) => v.id === dispatch.vehicleId)
  const selectedVehicleRelease = selectedVehicle ? evaluateVehicleRelease(selectedVehicle, vehicleCtx) : null
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
                dispatch.mode === opt.id ? 'border-command-500 bg-command-50' : 'border-slate-200'
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
                <p className="font-medium text-slate-900">{opt.label}</p>
                <p className="text-sm text-slate-600">{opt.description}</p>
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
    queryKey: ['auto-plan', draft.id, draft.bookingType, draft.requirements.wheelchairAccessible],
    queryFn: () => api.getAutoPlanProposal(draft),
  })

  if (isLoading) {
    return (
      <SectionCard title="Auto-plan proposal">
        <p className="text-sm text-slate-600">Generating proposal…</p>
      </SectionCard>
    )
  }

  if (!proposal) {
    return (
      <SectionCard title="Auto-plan proposal">
        <p className="text-sm text-slate-600">
          No eligible driver found for this booking — check compliance, restrictions and job requirements.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
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
            <span className="text-slate-600">Driver:</span>{' '}
            <span className="font-medium">{proposal.driverName}</span>
          </p>
          <p>
            <span className="text-slate-600">Vehicle:</span>{' '}
            <span className="font-medium">{proposal.vehicleRegistration}</span>
          </p>
          <p>
            <span className="text-slate-600">Run:</span>{' '}
            <span className="font-medium">{proposal.runReference}</span>
          </p>
          <p>
            <span className="text-slate-600">Punctuality score:</span>{' '}
            <span className="font-medium">{proposal.punctualityScore}%</span>
          </p>
        </div>
        {proposal.pickupSequence.length > 0 && (
          <div>
            <p className="text-slate-600">Pickup sequence</p>
            <ol className="mt-1 list-inside list-decimal text-slate-800">
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
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
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
      <span className="text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5"
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
