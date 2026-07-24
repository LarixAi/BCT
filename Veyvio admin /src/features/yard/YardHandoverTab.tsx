import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import type { YardHubData } from '@/lib/yard/types'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ready_for_handover: 'Ready for handover',
  awaiting_acceptance: 'Awaiting acceptance',
  accepted: 'Accepted',
  reopened: 'Reopened',
}

export function YardHandoverTab({ hub }: { hub: YardHubData }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const handover = hub.handover
  const [notes, setNotes] = useState(handover?.notes ?? '')
  const [incomingName, setIncomingName] = useState('')

  const submit = useMutation({
    mutationFn: () => api.submitYardHandover(hub.depotId, notes, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tKey(['yard-hub', hub.depotId]) }),
  })

  const accept = useMutation({
    mutationFn: () =>
      api.acceptYardHandover({
        handoverId: handover!.id,
        incomingSupervisor: incomingName || actorName,
        notes,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tKey(['yard-hub', hub.depotId]) }),
  })

  if (!handover) {
    return <p className="text-sm text-muted">No handover data for this depot.</p>
  }

  const canSubmit = handover.status === 'draft'
  const canAccept = handover.status === 'awaiting_acceptance'

  return (
    <div className="space-y-4">
      <SectionCard
        title="Shift handover"
        description={`${handover.depotName} · ${handover.shiftLabel} · ${STATUS_LABELS[handover.status] ?? handover.status}`}
      >
        <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Outgoing supervisor</dt>
            <dd className="font-medium">{handover.outgoingSupervisor}</dd>
          </div>
          <div>
            <dt className="text-muted">Incoming supervisor</dt>
            <dd className="font-medium">{handover.incomingSupervisor ?? '—'}</dd>
          </div>
          {handover.acceptedAt && (
            <div className="sm:col-span-2">
              <dt className="text-muted">Accepted</dt>
              <dd className="font-medium">
                {handover.acceptedBy} · {new Date(handover.acceptedAt).toLocaleString('en-GB')}
              </dd>
            </div>
          )}
        </dl>

        <div className="grid gap-4 lg:grid-cols-2">
          {handover.sections.map((section) => (
            <div key={section.label} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-ink">
                {section.label}
                <span className="ml-2 text-xs font-normal text-muted">({section.items.length})</span>
              </p>
              {section.items.length === 0 ? (
                <p className="mt-1 text-xs text-muted">None</p>
              ) : (
                <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                  {section.items.map((item) => (
                    <li key={item.id}>· {item.label}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-ink-soft">Handover notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={handover.status === 'accepted'}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm disabled:bg-surface-muted"
            placeholder="Notes from outgoing shift…"
          />
        </label>

        {canAccept && (
          <label className="mt-3 block text-sm">
            <span className="text-ink-soft">Incoming supervisor name</span>
            <input
              value={incomingName}
              onChange={(e) => setIncomingName(e.target.value)}
              placeholder={actorName}
              className="mt-1 w-full max-w-xs rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {canSubmit && (
            <button
              type="button"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
            >
              Submit for acceptance
            </button>
          )}
          {canAccept && (
            <button
              type="button"
              onClick={() => accept.mutate()}
              disabled={accept.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Accept handover
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
