import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import type { CheckDetailRecord } from '@/lib/checks/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function OperationalImpactPanel({ check }: { check: CheckDetailRecord }) {
  const impact = check.operationalImpact
  if (!impact?.hasAssignedWork && !impact?.operationalImpact) return null

  return (
    <SectionCard title="Assigned work impact" description={impact.operationalImpact ?? 'Operational assignment details'}>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {impact.currentRunReference && <Row label="Current run" value={impact.currentRunReference} />}
        {impact.nextRunReference && <Row label="Next run" value={impact.nextRunReference} />}
        {impact.nextDepartureTime && <Row label="Departure" value={impact.nextDepartureTime} />}
        {impact.assignedDriverName && <Row label="Driver" value={impact.assignedDriverName} />}
        {impact.routeName && <Row label="Route" value={impact.routeName} />}
        <Row label="Passengers" value={String(impact.passengerCommitments)} />
        <Row label="Wheelchair required" value={impact.wheelchairRequired ? 'Yes' : 'No'} />
        {impact.safeguardingPassengers && <Row label="Safeguarding" value="Passengers flagged" />}
        <Row label="Min capacity" value={`${impact.minSeatingCapacity} seats`} />
      </dl>
    </SectionCard>
  )
}

export function ResolveImpactPanel({ check }: { check: CheckDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const [vehicleId, setVehicleId] = useState(check.replacementCandidates.find((c) => c.canAllocate)?.vehicleId ?? '')
  const [reason, setReason] = useState('Vehicle blocked following failed check')
  const [open, setOpen] = useState(false)

  const resolve = useMutation({
    mutationFn: () => api.resolveCheckImpact({ checkId: check.checkId, replacementVehicleId: vehicleId, reason }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks-hub'] })
      queryClient.invalidateQueries({ queryKey: ['check-detail', check.checkId] })
      setOpen(false)
    },
  })

  if (!check.operationalImpact?.hasAssignedWork && check.result !== 'fail') return null
  if (check.replacementCandidates.length === 0) return null

  return (
    <SectionCard title="Resolve operational impact">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700">
          Select replacement vehicle
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">Replacement vehicle</span>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              {check.replacementCandidates.map((c) => (
                <option key={c.vehicleId} value={c.vehicleId} disabled={!c.canAllocate}>
                  {c.registrationNumber} — {c.makeModel} ({c.readinessLabel})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={!vehicleId || resolve.isPending} onClick={() => resolve.mutate()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              Confirm replacement
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

export function ConditionalReleasePanel({ check }: { check: CheckDetailRecord }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const [reason, setReason] = useState('')
  const [restrictions, setRestrictions] = useState('Advisory defects — repair within 7 days')
  const [open, setOpen] = useState(false)

  const release = useMutation({
    mutationFn: () => api.conditionalReleaseCheck({ checkId: check.checkId, reason, restrictions }, actorName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks-hub'] })
      queryClient.invalidateQueries({ queryKey: ['check-detail', check.checkId] })
      setOpen(false)
    },
  })

  if (check.conditionalRelease) {
    return (
      <SectionCard title="Conditional release authorised">
        <p className="text-sm text-slate-700">{check.conditionalRelease.reason}</p>
        <p className="mt-1 text-xs text-slate-500">Restrictions: {check.conditionalRelease.restrictions}</p>
        <p className="mt-1 text-xs text-slate-500">By {check.conditionalRelease.authorisedBy}</p>
      </SectionCard>
    )
  }

  if (check.result !== 'pass_with_advisory' && check.lifecycleStatus !== 'awaiting_review') return null

  return (
    <SectionCard title="Conditional release">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-50">
          Authorise conditional release
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Restrictions</span>
            <textarea value={restrictions} onChange={(e) => setRestrictions(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={!reason || release.isPending} onClick={() => release.mutate()} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              Authorise
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

export function SuspiciousFlagsPanel({ check }: { check: CheckDetailRecord }) {
  if (check.suspiciousFlags.length === 0) return null

  return (
    <SectionCard title="Review flags" description="Unusual check behaviour — requires supervisor review">
      <ul className="space-y-2">
        {check.suspiciousFlags.map((f) => (
          <li key={f.id} className={`rounded-lg border p-3 text-sm ${f.severity === 'critical' ? 'border-red-200 bg-red-50' : f.severity === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
            <p className="font-medium">{f.label}</p>
            <p className="text-slate-600">{f.detail}</p>
            <p className="mt-1 text-xs text-slate-500">{f.recommendedAction}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
