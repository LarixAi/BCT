import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import { ACTIVITY_LABELS, CUSTODY_LABELS, PRESENCE_LABELS, READINESS_LABELS } from '@/lib/yard/constants'
import { canMarkYardVor, canReleaseFromYard } from '@/lib/yard/permissions'
import type { YardHubData, YardTask, YardVehicleRow } from '@/lib/yard/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function VehicleOperationsDrawer({
  hub,
  row,
  onClose,
}: {
  hub: YardHubData
  row: YardVehicleRow
  onClose?: () => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canVor = canMarkYardVor(permissions)
  const canRelease = canReleaseFromYard(permissions)
  const [showVorForm, setShowVorForm] = useState(false)
  const [vorReason, setVorReason] = useState('')
  const [showRtsForm, setShowRtsForm] = useState(false)
  const [rtsReason, setRtsReason] = useState('')

  const { data: vehicleProfile } = useQuery({
    queryKey: ['vehicle-profile', row.vehicleId],
    queryFn: () => api.getVehicleProfile(row.vehicleId),
  })

  const vehicleTasks = hub.tasks.filter((t) => t.vehicleId === row.vehicleId && !['completed', 'cancelled'].includes(t.status))

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['yard-hub', hub.depotId] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profile', row.vehicleId] })
    queryClient.invalidateQueries({ queryKey: ['vehicle-profiles'] })
  }

  const markVor = useMutation({
    mutationFn: () =>
      api.markVehicleVor(row.vehicleId, { reason: vorReason, category: 'yard_inspection' }, actorName),
    onSuccess: () => {
      invalidate()
      setShowVorForm(false)
      setVorReason('')
    },
  })

  const returnToService = useMutation({
    mutationFn: () =>
      api.returnVehicleToService(row.vehicleId, actorName, {
        reason: rtsReason,
        postRepairCheckComplete: true,
        wheelRetorqueComplete: true,
        technicianSignOff: actorName,
      }),
    onSuccess: () => {
      invalidate()
      setShowRtsForm(false)
      setRtsReason('')
    },
  })

  const release = useMutation({
    mutationFn: () =>
      api.yardVehicleCheckInOut(row.vehicleId, { action: 'check_out', notes: 'Released from yard' }, actorName),
    onSuccess: invalidate,
  })

  if (!vehicleProfile) {
    return (
      <SectionCard title="Vehicle operations">
        <p className="text-sm text-muted">Loading vehicle…</p>
      </SectionCard>
    )
  }

  const releaseBlocked = !vehicleProfile.release.canLeaveYard

  return (
    <SectionCard title="Vehicle operations">
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-lg font-semibold">{vehicleProfile.registrationNumber}</p>
          <p className="text-ink-soft">
            {vehicleProfile.fleetNumber} · {vehicleProfile.make} {vehicleProfile.model}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill status={row.readinessState} />
            <StatusPill status={row.presenceState} />
            {row.readinessState === 'vor' && <StatusPill status="vor" />}
          </div>
        </div>

        <dl className="grid gap-2 text-sm">
          <Row label="Depot" value={vehicleProfile.currentDepotName} />
          <Row label="Zone" value={row.zone} />
          <Row label="Bay" value={vehicleProfile.parkingBay ?? '—'} />
          <Row label="Confidence" value={row.locationConfidence} />
          <Row label="Presence" value={PRESENCE_LABELS[row.presenceState] ?? row.presenceState} />
          <Row label="Activity" value={ACTIVITY_LABELS[row.activityState] ?? row.activityState} />
          <Row label="Readiness" value={READINESS_LABELS[row.readinessState] ?? row.readinessState} />
          <Row label="Custody" value={CUSTODY_LABELS[row.custodyState] ?? row.custodyState} />
          <Row label="Assigned staff" value={row.assignedStaffName ?? '—'} />
          <Row label="Next departure" value={vehicleProfile.nextDepartureTime ?? '—'} />
          <Row label="Open defects" value={String(vehicleProfile.openDefectCount)} />
          <Row label="Last updated" value={formatDate(vehicleProfile.updatedAt.slice(0, 10))} />
        </dl>

        {vehicleProfile.release.failures.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-medium">Release check — {vehicleProfile.release.releaseDecision.replace(/_/g, ' ')}</p>
            <ul className="mt-1 list-inside list-disc">
              {vehicleProfile.release.failures.map((b) => (
                <li key={b.code}>{b.message}</li>
              ))}
            </ul>
          </div>
        )}

        {vehicleTasks.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted">Current tasks ({vehicleTasks.length})</p>
            <ul className="space-y-1 text-xs">
              {vehicleTasks.map((t) => (
                <TaskLine key={t.id} task={t} />
              ))}
            </ul>
          </div>
        )}

        {row.exceptionLabels.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
            <p className="font-medium">Open issues</p>
            <ul className="mt-1 list-inside list-disc">
              {row.exceptionLabels.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {canRelease && row.presenceState === 'in_yard' && (
            <button
              type="button"
              onClick={() => release.mutate()}
              disabled={releaseBlocked || release.isPending}
              title={releaseBlocked ? 'Release blocked — resolve failures first' : 'Release vehicle to driver'}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Release vehicle
            </button>
          )}
          {canVor && row.readinessState !== 'vor' && !showVorForm && (
            <button type="button" onClick={() => setShowVorForm(true)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50">
              Mark VOR
            </button>
          )}
          {canVor && row.readinessState === 'vor' && !showRtsForm && (
            <button type="button" onClick={() => setShowRtsForm(true)} className="rounded-lg border border-command-200 px-3 py-1.5 text-xs font-medium text-command-700 hover:bg-command-50">
              Return to service
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink-soft">
              Close
            </button>
          )}
        </div>

        {showVorForm && (
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
            <label className="block text-xs">
              <span className="text-ink-soft">VOR reason</span>
              <input value={vorReason} onChange={(e) => setVorReason(e.target.value)} className="mt-1 w-full rounded border border-border px-2 py-1" />
            </label>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={!vorReason || markVor.isPending} onClick={() => markVor.mutate()} className="rounded bg-red-700 px-3 py-1 text-xs text-white disabled:opacity-50">
                Confirm VOR
              </button>
              <button type="button" onClick={() => setShowVorForm(false)} className="text-xs text-ink-soft">
                Cancel
              </button>
            </div>
          </div>
        )}

        {showRtsForm && (
          <div className="rounded-lg border border-command-200 bg-command-50/50 p-3">
            <label className="block text-xs">
              <span className="text-ink-soft">Return-to-service reason</span>
              <input value={rtsReason} onChange={(e) => setRtsReason(e.target.value)} className="mt-1 w-full rounded border border-border px-2 py-1" />
            </label>
            <p className="mt-1 text-xs text-muted">Requires post-repair inspection and authorised sign-off.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={!rtsReason || returnToService.isPending} onClick={() => returnToService.mutate()} className="rounded bg-command-600 px-3 py-1 text-xs text-white disabled:opacity-50">
                Authorise return
              </button>
              <button type="button" onClick={() => setShowRtsForm(false)} className="text-xs text-ink-soft">
                Cancel
              </button>
            </div>
          </div>
        )}

        <Link to={`/vehicles/${vehicleProfile.id}`} className="inline-block text-sm font-medium text-command-600 hover:underline">
          Open vehicle profile →
        </Link>

        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted">Movement history</p>
          <ul className="space-y-1 text-xs text-ink-soft">
            {vehicleProfile.auditEvents.slice(-4).reverse().map((e) => (
              <li key={e.id}>
                {new Date(e.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} — {e.action}
                {e.reason ? ` · ${e.reason}` : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  )
}

function TaskLine({ task }: { task: YardTask }) {
  return (
    <li className="flex justify-between gap-2 rounded bg-surface-muted px-2 py-1">
      <span>{task.title}</span>
      <span className="text-muted">{task.status.replace(/_/g, ' ')}</span>
    </li>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
