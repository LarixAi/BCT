import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL } from '@/lib/attendance/constants'
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  moveLeaveRequest,
  rejectLeaveRequest,
  suggestLeaveDates,
} from '@/lib/attendance/leave-workflow'
import type { LeaveRequestRecord } from '@/lib/attendance/types'
import { suggestAlternativeDates } from '@/lib/holiday/engine'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/cn'

export function TimeOffPage() {
  const { user } = useAuth()
  const actorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'Operations'
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [moveStart, setMoveStart] = useState('')
  const [moveEnd, setMoveEnd] = useState('')
  const [moveReason, setMoveReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => api.getLeaveRequests(),
  })

  const rows = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data],
  )

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null

  const pending = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
    queryClient.invalidateQueries({ queryKey: ['attendance-hub'] })
  }

  const mutateLeave = useMutation({
    mutationFn: async (next: LeaveRequestRecord) => api.updateLeaveRequest(next),
    onSuccess: (row) => {
      invalidate()
      setSelectedId(row.id)
      setRejectReason('')
      setCancelReason('')
      setMoveReason('')
    },
  })

  if (isLoading) return <p className="text-sm text-muted">Loading leave requests…</p>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Time off</h1>
          <p className="text-sm text-ink-soft">
            Future leave requests and approvals — separate from live Attendance, sharing the same
            availability record. Move and cancel always leave an audit trail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/attendance"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            Attendance board
          </Link>
          <Link
            to="/schedule"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
          >
            Schedule impact
          </Link>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">⚠ Driver leave request — {pending.length} awaiting approval</p>
          <p className="mt-1">
            Review conflicts, assign cover where needed, then approve. Pending leave does not remove
            the driver until approved, but future duties stay flagged.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <SectionCard title="Leave queue" description={`${rows.length} requests`}>
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-3 text-left text-sm hover:border-command-400',
                    selected?.id === row.id
                      ? 'border-command-500 ring-1 ring-command-500'
                      : 'border-border bg-surface',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{row.personName}</p>
                      <p className="text-xs text-muted">
                        {row.personNumber} · {row.depotName} · {LEAVE_TYPE_LABEL[row.leaveType]}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        row.status === 'pending' && 'bg-amber-100 text-amber-950',
                        row.status === 'approved' && 'bg-emerald-100 text-emerald-900',
                        row.status === 'rejected' && 'bg-red-100 text-red-900',
                        row.status === 'cancelled' && 'bg-surface-muted text-ink-soft',
                        row.status === 'moved' && 'bg-sky-100 text-sky-950',
                      )}
                    >
                      {LEAVE_STATUS_LABEL[row.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-ink-soft">
                    {formatWindow(row)}
                    {row.partialDay ? ' · Partial day' : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Trips affected: {row.impact.tripsAffected} · School routes:{' '}
                    {row.impact.schoolRoutesAffected} · Readiness: {row.impact.readinessPercent}% (
                    {row.impact.readinessBand} impact)
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        {selected && (
          <SectionCard
            title={selected.reference}
            description={`${LEAVE_TYPE_LABEL[selected.leaveType]} · ${LEAVE_STATUS_LABEL[selected.status]}`}
          >
            <dl className="space-y-2 text-sm">
              <Row label="Driver" value={`${selected.personName} (${selected.personNumber})`} />
              <Row label="Dates" value={formatWindow(selected)} />
              <Row label="Reason" value={selected.reason} />
              <Row label="Attachment" value={selected.attachmentLabel ?? 'None'} />
              <Row
                label="Operational readiness"
                value={`${selected.impact.readinessPercent}% — ${selected.impact.readinessSummary}`}
              />
              <Row
                label="Impact"
                value={`${selected.impact.tripsAffected} trips · ${selected.impact.schoolRoutesAffected} school · ${selected.impact.passengersAffected} passengers · replacement ${selected.impact.replacementRequired ? 'required' : 'optional'}`}
              />
              {selected.previousWindow && (
                <Row
                  label="Previous dates"
                  value={`${selected.previousWindow.startDate} → ${selected.previousWindow.endDate}`}
                />
              )}
            </dl>

            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {(selected.status === 'pending' || selected.status === 'moved') && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={mutateLeave.isPending}
                    onClick={() =>
                      mutateLeave.mutate(approveLeaveRequest(selected, actorName, 'Cover checked'))
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={mutateLeave.isPending || !rejectReason.trim()}
                    onClick={() =>
                      mutateLeave.mutate(rejectLeaveRequest(selected, actorName, rejectReason))
                    }
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                  {(() => {
                    const alt = suggestAlternativeDates({
                      startDate: selected.startDate,
                      endDate: selected.endDate,
                    })
                    if (!alt) return null
                    return (
                      <button
                        type="button"
                        disabled={mutateLeave.isPending}
                        onClick={() =>
                          mutateLeave.mutate(
                            suggestLeaveDates(
                              selected,
                              actorName,
                              alt,
                              'Please consider these alternative dates.',
                            ),
                          )
                        }
                        className="rounded-lg border border-command-200 px-3 py-1.5 text-sm font-medium text-command-800 hover:bg-command-50 disabled:opacity-60"
                      >
                        Suggest {alt.startDate} → {alt.endDate}
                      </button>
                    )
                  })()}
                </div>
              )}
              {(selected.status === 'pending' || selected.status === 'moved') && (
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason (required to reject)"
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                />
              )}

              {(selected.status === 'approved' ||
                selected.status === 'pending' ||
                selected.status === 'moved') && (
                <div className="space-y-2 rounded-lg border border-border bg-surface-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Move leave
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={moveStart}
                      onChange={(e) => setMoveStart(e.target.value)}
                      className="rounded-lg border border-border px-2 py-1.5 text-sm"
                    />
                    <input
                      type="date"
                      value={moveEnd}
                      onChange={(e) => setMoveEnd(e.target.value)}
                      className="rounded-lg border border-border px-2 py-1.5 text-sm"
                    />
                  </div>
                  <input
                    value={moveReason}
                    onChange={(e) => setMoveReason(e.target.value)}
                    placeholder="Reason for moving dates"
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={
                      mutateLeave.isPending || !moveStart || !moveEnd || !moveReason.trim()
                    }
                    onClick={() =>
                      mutateLeave.mutate(
                        moveLeaveRequest(
                          selected,
                          actorName,
                          { startDate: moveStart, endDate: moveEnd },
                          moveReason,
                        ),
                      )
                    }
                    className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
                  >
                    Move dates
                  </button>
                </div>
              )}

              {selected.status !== 'cancelled' && selected.status !== 'rejected' && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Cancel leave
                  </p>
                  <input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Cancellation reason (recorded in audit)"
                    className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={mutateLeave.isPending || !cancelReason.trim()}
                    onClick={() =>
                      mutateLeave.mutate(cancelLeaveRequest(selected, actorName, cancelReason))
                    }
                    className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-muted disabled:opacity-60"
                  >
                    Cancel leave
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Audit trail
              </p>
              <ol className="mt-2 space-y-2 text-sm">
                {selected.audit.map((e) => (
                  <li key={e.id} className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                    <p className="font-medium text-ink">
                      {e.action} · {e.actorName}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(e.at).toLocaleString('en-GB')}
                    </p>
                    <p className="mt-1 text-ink-soft">{e.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  )
}

function formatWindow(row: LeaveRequestRecord) {
  if (row.startDate === row.endDate) {
    return `${row.startDate}${row.startTime ? ` ${row.startTime}` : ''}${row.endTime ? `–${row.endTime}` : ''}`
  }
  return `${row.startDate} → ${row.endDate}`
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
