import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard, StatusBadge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { suggestedActionsFor } from '@/lib/exceptions/suggested-actions'
import type { OperationalException } from '@/lib/types'

type DrawerTab = 'overview' | 'timeline' | 'actions' | 'notes'

export function ExceptionInvestigationPanel({
  exception,
  onAssignMe,
  onInvestigate,
  onEscalate,
  onClose,
  onAddNote,
}: {
  exception: OperationalException | null
  onAssignMe: () => void
  onInvestigate: () => void
  onEscalate: () => void
  onClose: () => void
  onAddNote: (body: string) => void
}) {
  const [tab, setTab] = useState<DrawerTab>('overview')
  const [note, setNote] = useState('')

  if (!exception) {
    return (
      <SectionCard title="Investigation" description="Select an exception to open the case drawer">
        <p className="text-sm text-muted">
          Select an exception to open the full case — facts, timeline, and recovery actions.
        </p>
      </SectionCard>
    )
  }

  const suggestions = suggestedActionsFor(exception)

  return (
    <SectionCard
      title={exception.title}
      description={`${exception.severity} · ${exception.category} · ${exception.owner ?? 'Unassigned'}`}
      className="min-h-0 overflow-hidden"
      flush
    >
      <div className="flex gap-1 border-b border-border bg-surface-muted p-2">
        {(['overview', 'timeline', 'actions', 'notes'] as DrawerTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium capitalize',
              tab === t ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-h-[520px] space-y-3 overflow-y-auto p-4 text-sm">
        {tab === 'overview' && (
          <>
            <div className="flex items-center justify-between gap-2">
              <StatusBadge kind="severity" value={exception.severity} />
              <span className="capitalize text-ink-soft">{exception.status.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-ink-soft">{exception.description ?? exception.recommendedAction}</p>
            <Row label="Raised" value={exception.raisedAt} />
            <Row label="Source" value={exception.source ?? '—'} />
            <Row label="Vehicle" value={exception.vehicleRegistration ?? '—'} />
            <Row label="Driver" value={exception.driverName ?? '—'} />
            <Row label="Passenger" value={exception.passengerName ?? '—'} />
            <Row label="Booking" value={exception.bookingRef ?? '—'} />
            <Row label="Run" value={exception.runRef ?? exception.relatedRecord} />
            <Row label="Depot" value={exception.depot} />
            <Row
              label="SLA"
              value={
                exception.slaMinutesRemaining == null
                  ? '—'
                  : exception.slaMinutesRemaining < 0
                    ? 'Breached'
                    : `${exception.slaMinutesRemaining} min`
              }
            />
            {exception.escalated && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-900">
                Escalated — senior attention required before this can clear.
              </p>
            )}
            {exception.attachments && exception.attachments.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Attachments</p>
                <ul className="mt-1 space-y-1">
                  {exception.attachments.map((a) => (
                    <li key={a.id} className="rounded border border-border px-2 py-1.5 text-xs text-ink-soft">
                      {a.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link
              to={exception.relatedHref}
              className="block rounded-lg border border-border px-3 py-2 text-center text-sm font-medium text-command-700 hover:bg-command-50"
            >
              Open related record →
            </Link>
          </>
        )}

        {tab === 'timeline' && (
          <ul className="space-y-2">
            {(exception.timeline ?? []).length === 0 && (
              <li className="text-muted">No timeline events yet.</li>
            )}
            {(exception.timeline ?? []).map((item) => (
              <li key={`${item.at}-${item.label}`} className="border-b border-border pb-2">
                <p className="text-[11px] text-muted">{item.at}</p>
                <p className="font-medium text-ink">{item.label}</p>
              </li>
            ))}
            {(exception.audit ?? []).map((entry) => (
              <li key={entry.id} className="border-b border-border pb-2">
                <p className="text-[11px] text-muted">
                  {entry.at} · {entry.actor}
                </p>
                <p className="font-medium text-ink">{entry.action}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === 'actions' && (
          <div className="space-y-3">
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Suggested actions
                </p>
                {suggestions.map((action) => (
                  <div key={action.id} className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                    <p className="font-medium text-ink">{action.title}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{action.detail}</p>
                    {action.href && (
                      <Link to={action.href} className="mt-1 inline-block text-xs font-medium text-command-700 hover:underline">
                        Open →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <ActionLink label="Call driver" href="/messages" />
              <ActionLink label="Call passenger" href="/messages" />
              <ActionLink label="Reassign vehicle" href="/dispatch" />
              <ActionLink label="Transfer driver" href="/dispatch" />
              <ActionLink label="Create incident" href="/incidents" />
              <button
                type="button"
                onClick={onEscalate}
                className="rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs font-medium text-red-800 hover:bg-red-100"
              >
                Escalate
              </button>
              <button
                type="button"
                onClick={onAssignMe}
                className="rounded-lg border border-border px-2 py-2 text-xs font-medium text-ink-soft hover:bg-surface-muted"
              >
                Assign to me
              </button>
              <button
                type="button"
                onClick={onInvestigate}
                className="rounded-lg border border-border px-2 py-2 text-xs font-medium text-ink-soft hover:bg-surface-muted"
              >
                Investigating
              </button>
              <button
                type="button"
                onClick={onClose}
                className="col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
              >
                Close exception
              </button>
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-3">
            <ul className="space-y-2">
              {(exception.notes ?? []).length === 0 && (
                <li className="text-muted">No notes yet.</li>
              )}
              {(exception.notes ?? []).map((n) => (
                <li key={n.id} className="border-b border-border pb-2">
                  <p className="text-[11px] text-muted">
                    {n.at} · {n.author}
                  </p>
                  <p className="font-medium text-ink">{n.body}</p>
                </li>
              ))}
            </ul>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!note.trim()) return
                onAddNote(note.trim())
                setNote('')
              }}
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add an investigation note…"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
              >
                Add note
              </button>
            </form>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium capitalize text-ink">{value}</span>
    </div>
  )
}

function ActionLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      to={href}
      className="rounded-lg border border-border px-2 py-2 text-center text-xs font-medium text-ink-soft hover:bg-surface-muted"
    >
      {label}
    </Link>
  )
}
