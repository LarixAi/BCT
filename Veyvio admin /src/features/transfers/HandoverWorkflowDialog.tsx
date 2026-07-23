import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import type { RecoveryWorkflow } from '@/lib/transfers/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

const WORKFLOWS: { id: RecoveryWorkflow; label: string; description: string }[] = [
  {
    id: 'continue_to_destination',
    label: 'Continue to destination',
    description: 'Original driver completes current passengers; future jobs move separately',
  },
  {
    id: 'physical_handover',
    label: 'Safe physical handover',
    description: 'Controlled transfer at an approved location with recorded acknowledgements',
  },
  {
    id: 'vehicle_replacement',
    label: 'Vehicle replacement (same driver)',
    description: 'Replacement vehicle meets driver at a safe handover point',
  },
  {
    id: 'rescue_handover',
    label: 'Rescue driver and vehicle',
    description: 'New driver and vehicle attend incident location for recorded handover',
  },
  {
    id: 'escalation',
    label: 'Emergency / safeguarding escalation',
    description: 'Normal transport cannot safely continue — duty manager required',
  },
]

export function HandoverWorkflowDialog({
  tripId,
  onClose,
  onComplete,
}: {
  tripId: string
  onClose: () => void
  onComplete?: () => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [workflow, setWorkflow] = useState<RecoveryWorkflow>('rescue_handover')
  const [handoverLocation, setHandoverLocation] = useState('')
  const [receivingDriverId, setReceivingDriverId] = useState('')
  const [authorisedBy, setAuthorisedBy] = useState('')
  const [safeguardingConfirmed, setSafeguardingConfirmed] = useState(false)
  const [belongingsConfirmed, setBelongingsConfirmed] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const { data: position } = useQuery({
    queryKey: ['operational-position', tripId],
    queryFn: () => api.getOperationalPosition(tripId),
  })

  const { data: candidates = [] } = useQuery({
    queryKey: ['transfer-candidates', tripId],
    queryFn: () => api.getTransferCandidates(tripId),
  })

  const onboardJobs = position?.onboardPassengers ?? []
  const hasSafeguarding = onboardJobs.some((j) => j.safeguardingFlag)

  const commit = useMutation({
    mutationFn: () =>
      api.commitHandover(
        {
          tripId,
          workflow,
          handoverLocation,
          receivingDriverId,
          passengerJobIds: onboardJobs.map((j) => j.id),
          authorisedBy,
          safeguardingConfirmed,
          belongingsConfirmed,
          notes: notes || null,
        },
        `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim(),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operational-trip', tripId] })
      queryClient.invalidateQueries({ queryKey: ['assignment-history', tripId] })
      onComplete?.()
      onClose()
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Handover failed'),
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-ink">Recovery & handover</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Passengers onboard — controlled handover required. This is not a simple reassignment.
        </p>

        <div className="mt-4 space-y-4">
          <SectionCard title="Recovery workflow">
            <div className="space-y-2">
              {WORKFLOWS.map((w) => (
                <label
                  key={w.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                    workflow === w.id ? 'border-command-500 bg-command-50' : 'border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="workflow"
                    checked={workflow === w.id}
                    onChange={() => setWorkflow(w.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{w.label}</p>
                    <p className="text-ink-soft">{w.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Passengers onboard">
            <ul className="list-inside list-disc text-sm text-ink-soft">
              {onboardJobs.map((j) => (
                <li key={j.id}>
                  {j.passengerName}
                  {j.safeguardingFlag && (
                    <span className="ml-1 text-amber-700">(safeguarding)</span>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>

          <label className="block text-sm">
            <span className="text-ink-soft">Handover location</span>
            <input
              value={handoverLocation}
              onChange={(e) => setHandoverLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              placeholder="e.g. A406 lay-by northbound"
            />
          </label>

          <label className="block text-sm">
            <span className="text-ink-soft">Receiving driver</span>
            <select
              value={receivingDriverId}
              onChange={(e) => setReceivingDriverId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            >
              <option value="">Select driver…</option>
              {candidates.map((c) => (
                <option key={c.driverId} value={c.driverId}>
                  {c.driverName} — ETA {c.estimatedTravelMinutes} min
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-ink-soft">Authorised by</span>
            <input
              value={authorisedBy}
              onChange={(e) => setAuthorisedBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={belongingsConfirmed}
                onChange={(e) => setBelongingsConfirmed(e.target.checked)}
              />
              Passenger belongings accounted for
            </label>
            {hasSafeguarding && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={safeguardingConfirmed}
                  onChange={(e) => setSafeguardingConfirmed(e.target.checked)}
                />
                Safeguarding handover confirmed by duty manager
              </label>
            )}
          </div>

          <label className="block text-sm">
            <span className="text-ink-soft">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => commit.mutate()}
            disabled={
              commit.isPending ||
              !handoverLocation.trim() ||
              !receivingDriverId ||
              !authorisedBy.trim() ||
              !belongingsConfirmed ||
              (hasSafeguarding && !safeguardingConfirmed)
            }
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Record handover
          </button>
        </div>
      </div>
    </div>
  )
}
