import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL } from '@/lib/attendance/constants'
import {
  approveLeaveRequest,
  rejectLeaveRequest,
  suggestLeaveDates,
} from '@/lib/attendance/leave-workflow'
import type { LeaveRequestRecord } from '@/lib/attendance/types'
import { suggestAlternativeDates } from '@/lib/holiday/engine'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/cn'
import { tKey } from '@/lib/tenant/tenant-query-scope'
import {
  buildBalanceContext,
  formatLeaveWindow,
  LEAVE_APPROVAL_STEPS,
  type LeaveApprovalDecision,
  type LeaveApprovalStepId,
} from '@/features/attendance/leave-approval-utils'

type LeaveApprovalWizardProps = {
  request: LeaveRequestRecord
  actorName: string
  onClose: () => void
  onComplete?: (row: LeaveRequestRecord) => void
}

export function LeaveApprovalWizard({
  request,
  actorName,
  onClose,
  onComplete,
}: LeaveApprovalWizardProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<LeaveApprovalStepId>('review')
  const [decision, setDecision] = useState<LeaveApprovalDecision>('approve')
  const [approveNote, setApproveNote] = useState('Cover checked — roster updated')
  const [declineReason, setDeclineReason] = useState('')
  const [coverConfirmed, setCoverConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultRow, setResultRow] = useState<LeaveRequestRecord | null>(null)

  const stepIndex = LEAVE_APPROVAL_STEPS.findIndex((s) => s.id === step)

  const { data: holiday, isLoading: holidayLoading } = useQuery({
    queryKey: tKey(['driver-holiday', request.personId]),
    queryFn: () => api.getDriverHoliday(request.personId),
    enabled: request.role === 'driver',
  })

  const { data: coverCandidates = [] } = useQuery({
    queryKey: tKey(['attendance-cover-candidates', request.reference]),
    queryFn: () => api.getAttendanceCoverCandidates(request.personName),
    enabled: step === 'impact' && request.impact.replacementRequired,
  })

  const balance = useMemo(
    () => buildBalanceContext(request, holiday),
    [request, holiday],
  )

  const suggestedDates = useMemo(
    () =>
      suggestAlternativeDates({
        startDate: request.startDate,
        endDate: request.endDate,
      }),
    [request.endDate, request.startDate],
  )

  const needsCoverAck =
    request.impact.replacementRequired || request.impact.tripsAffected > 0

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['leave-requests']) })
    queryClient.invalidateQueries({ queryKey: tKey(['attendance-hub']) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-holiday', request.personId]) })
  }

  const mutateLeave = useMutation({
    mutationFn: async (next: LeaveRequestRecord) => api.updateLeaveRequest(next),
    onSuccess: (row) => {
      invalidate()
      setResultRow(row)
      setStep('confirm')
      onComplete?.(row)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Could not save decision')
    },
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'confirm') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step])

  function goNext() {
    setError(null)
    const next = LEAVE_APPROVAL_STEPS[stepIndex + 1]
    if (next) setStep(next.id)
  }

  function goBack() {
    setError(null)
    const prev = LEAVE_APPROVAL_STEPS[stepIndex - 1]
    if (prev) setStep(prev.id)
  }

  function submitDecision() {
    setError(null)
    if (decision === 'decline' && !declineReason.trim()) {
      setError('Give the driver a clear reason for declining this request.')
      return
    }
    if (decision === 'approve' && needsCoverAck && !coverConfirmed) {
      setError('Confirm cover has been checked before approving.')
      return
    }

    if (decision === 'approve') {
      mutateLeave.mutate(approveLeaveRequest(request, actorName, approveNote))
      return
    }
    if (decision === 'decline') {
      mutateLeave.mutate(rejectLeaveRequest(request, actorName, declineReason))
      return
    }
    if (!suggestedDates) {
      setError('No alternative dates are available to suggest.')
      return
    }
    mutateLeave.mutate(
      suggestLeaveDates(
        request,
        actorName,
        suggestedDates,
        declineReason.trim() || 'Please consider these alternative dates.',
      ),
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-wizard-title"
      >
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Leave review · {request.reference}
              </p>
              <h2 id="leave-wizard-title" className="text-lg font-semibold text-ink">
                {request.personName}
              </h2>
              <p className="text-sm text-muted">
                {LEAVE_TYPE_LABEL[request.leaveType]} · {formatLeaveWindow(request)}
              </p>
            </div>
            {step !== 'confirm' ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:bg-surface-muted"
              >
                Close
              </button>
            ) : null}
          </div>

          <nav aria-label="Leave approval progress" className="mt-4 overflow-x-auto">
            <ol className="flex min-w-max gap-1">
              {LEAVE_APPROVAL_STEPS.map((s, i) => {
                const active = s.id === step
                const done = i < stepIndex
                return (
                  <li key={s.id}>
                    <span
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium',
                        active && 'bg-command-600 text-white',
                        done && !active && 'bg-command-50 text-command-800',
                        !active && !done && 'text-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                          active && 'bg-white/20',
                          done && !active && 'bg-command-200',
                          !active && !done && 'bg-surface-muted',
                        )}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      {s.label}
                    </span>
                  </li>
                )
              })}
            </ol>
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {error ? (
            <p className="mb-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
          ) : null}

          {step === 'review' ? (
            <ReviewStep request={request} />
          ) : null}

          {step === 'balance' ? (
            <BalanceStep
              request={request}
              loading={holidayLoading}
              balance={balance}
              holiday={holiday}
            />
          ) : null}

          {step === 'impact' ? (
            <ImpactStep request={request} coverCandidates={coverCandidates} />
          ) : null}

          {step === 'decision' ? (
            <DecisionStep
              decision={decision}
              onDecisionChange={setDecision}
              approveNote={approveNote}
              onApproveNoteChange={setApproveNote}
              declineReason={declineReason}
              onDeclineReasonChange={setDeclineReason}
              coverConfirmed={coverConfirmed}
              onCoverConfirmedChange={setCoverConfirmed}
              needsCoverAck={needsCoverAck}
              suggestedDates={suggestedDates}
            />
          ) : null}

          {step === 'confirm' && resultRow ? (
            <ConfirmStep row={resultRow} decision={decision} />
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-6">
          {step === 'confirm' ? (
            <>
              <Link
                to="/schedule"
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
              >
                Open schedule
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
              >
                Back to queue
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={stepIndex === 0 ? onClose : goBack}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
              >
                {stepIndex === 0 ? 'Cancel' : 'Back'}
              </button>
              {step === 'decision' ? (
                <button
                  type="button"
                  disabled={mutateLeave.isPending}
                  onClick={submitDecision}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60',
                    decision === 'decline'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-emerald-600 hover:bg-emerald-700',
                  )}
                >
                  {mutateLeave.isPending
                    ? 'Saving…'
                    : decision === 'approve'
                      ? 'Approve leave'
                      : decision === 'decline'
                        ? 'Decline leave'
                        : 'Send date suggestion'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
                >
                  Continue
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

function ReviewStep({ request }: { request: LeaveRequestRecord }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Pending leave does not remove the driver from roster until you approve. Review the request
        before checking balance and schedule impact.
      </p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Driver" value={`${request.personName} (${request.personNumber})`} />
        <Detail label="Depot" value={request.depotName} />
        <Detail label="Leave type" value={LEAVE_TYPE_LABEL[request.leaveType]} />
        <Detail label="Dates" value={formatLeaveWindow(request)} />
        <Detail
          label="Submitted"
          value={new Date(request.submittedAt).toLocaleString('en-GB')}
        />
        <Detail label="Status" value={LEAVE_STATUS_LABEL[request.status]} />
      </dl>
      <div className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Driver reason</p>
        <p className="mt-2 text-sm text-ink">{request.reason}</p>
        {request.attachmentLabel ? (
          <p className="mt-2 text-xs text-muted">Attachment: {request.attachmentLabel}</p>
        ) : null}
      </div>
      <Link
        to={`/drivers/${request.personId}`}
        className="text-sm font-medium text-command-600 hover:underline"
      >
        Open driver profile →
      </Link>
    </div>
  )
}

function BalanceStep({
  request,
  loading,
  balance,
  holiday,
}: {
  request: LeaveRequestRecord
  loading: boolean
  balance: ReturnType<typeof buildBalanceContext>
  holiday: Awaited<ReturnType<typeof api.getDriverHoliday>> | undefined
}) {
  if (request.role !== 'driver') {
    return (
      <p className="text-sm text-muted">
        Holiday balance applies to drivers only. Continue to review schedule impact.
      </p>
    )
  }

  if (loading) return <p className="text-sm text-muted">Loading holiday balance…</p>

  if (!holiday) {
    return (
      <p className="text-sm text-attention">
        Holiday balance could not be loaded. You can still review impact and decide.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Leave year {holiday.leaveYearLabel}. Approving deducts from entitlement when this is paid
        annual leave.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Remaining" value={`${balance.remainingDays ?? '—'} days`} />
        <StatCard label="This request" value={`${balance.requestDays} working days`} />
        <StatCard
          label="After approval"
          value={
            balance.deductsBalance && balance.projectedDays != null
              ? `${balance.projectedDays} days`
              : 'No deduction'
          }
        />
      </div>
      {balance.warnings.length > 0 ? (
        <ul className="space-y-2">
          {balance.warnings.map((w) => (
            <li
              key={w.code}
              className={cn(
                'rounded-lg px-3 py-2 text-sm',
                w.severity === 'block' && 'bg-critical/10 text-critical',
                w.severity === 'attention' && 'bg-amber-50 text-amber-950',
                w.severity === 'info' && 'bg-surface-muted text-ink-soft',
              )}
            >
              {w.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Balance looks OK for this request length.
        </p>
      )}
    </div>
  )
}

function ImpactStep({
  request,
  coverCandidates,
}: {
  request: LeaveRequestRecord
  coverCandidates: Awaited<ReturnType<typeof api.getAttendanceCoverCandidates>>
}) {
  const impact = request.impact
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        {impact.readinessSummary}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Trips affected" value={String(impact.tripsAffected)} />
        <StatCard label="School routes" value={String(impact.schoolRoutesAffected)} />
        <StatCard label="Passengers" value={String(impact.passengersAffected)} />
        <StatCard
          label="Readiness"
          value={`${impact.readinessPercent}% · ${impact.readinessBand} impact`}
        />
      </div>
      {impact.replacementRequired ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-950">Cover required before approval</p>
          <p className="mt-1 text-sm text-amber-900">
            Assign replacement drivers on the schedule before approving, or confirm cover is already
            arranged.
          </p>
          {coverCandidates.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {coverCandidates.slice(0, 5).map((c) => (
                <li key={c.personId} className="flex justify-between gap-2">
                  <span>{c.personName}</span>
                  <span className="text-muted">{c.availabilityLabel}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-amber-900">No cover candidates loaded for this duty.</p>
          )}
          <Link
            to="/schedule"
            className="mt-3 inline-block text-sm font-medium text-command-700 hover:underline"
          >
            Open schedule to assign cover →
          </Link>
        </div>
      ) : (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-soft">
          No mandatory cover replacement flagged for this window.
        </p>
      )}
    </div>
  )
}

function DecisionStep({
  decision,
  onDecisionChange,
  approveNote,
  onApproveNoteChange,
  declineReason,
  onDeclineReasonChange,
  coverConfirmed,
  onCoverConfirmedChange,
  needsCoverAck,
  suggestedDates,
}: {
  decision: LeaveApprovalDecision
  onDecisionChange: (d: LeaveApprovalDecision) => void
  approveNote: string
  onApproveNoteChange: (v: string) => void
  declineReason: string
  onDeclineReasonChange: (v: string) => void
  coverConfirmed: boolean
  onCoverConfirmedChange: (v: boolean) => void
  needsCoverAck: boolean
  suggestedDates: { startDate: string; endDate: string } | null
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Choose one outcome. The driver is notified when you approve or decline.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            { id: 'approve', label: 'Approve', hint: 'Confirm leave on roster' },
            { id: 'decline', label: 'Decline', hint: 'Driver keeps balance' },
            { id: 'suggest', label: 'Suggest dates', hint: 'Stay pending' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onDecisionChange(opt.id)}
            className={cn(
              'rounded-xl border px-3 py-3 text-left text-sm transition',
              decision === opt.id
                ? 'border-command-500 bg-command-50 ring-1 ring-command-500'
                : 'border-border hover:border-command-300',
              opt.id === 'decline' && decision === opt.id && 'border-red-300 bg-red-50 ring-red-400',
              opt.id === 'approve' && decision === opt.id && 'border-emerald-300 bg-emerald-50 ring-emerald-400',
            )}
          >
            <p className="font-semibold text-ink">{opt.label}</p>
            <p className="mt-1 text-xs text-muted">{opt.hint}</p>
          </button>
        ))}
      </div>

      {decision === 'approve' ? (
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-ink">Approval note (audit trail)</span>
            <input
              value={approveNote}
              onChange={(e) => onApproveNoteChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
          {needsCoverAck ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={coverConfirmed}
                onChange={(e) => onCoverConfirmedChange(e.target.checked)}
                className="mt-1"
              />
              <span>
                I have checked cover for affected trips, or no cover is required for this window.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {decision === 'decline' ? (
        <label className="block text-sm">
          <span className="font-medium text-ink">Reason for declining (sent to driver)</span>
          <textarea
            value={declineReason}
            onChange={(e) => onDeclineReasonChange(e.target.value)}
            rows={3}
            placeholder="e.g. Peak school week — please choose dates after 15 Sep"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
        </label>
      ) : null}

      {decision === 'suggest' ? (
        <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-4 text-sm">
          {suggestedDates ? (
            <p>
              Suggest{' '}
              <strong>
                {suggestedDates.startDate} → {suggestedDates.endDate}
              </strong>{' '}
              as an alternative. The request stays pending until the driver responds.
            </p>
          ) : (
            <p className="text-attention">No automatic alternative dates are available.</p>
          )}
          <label className="block">
            <span className="text-muted">Message to driver</span>
            <textarea
              value={declineReason}
              onChange={(e) => onDeclineReasonChange(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

function ConfirmStep({
  row,
  decision,
}: {
  row: LeaveRequestRecord
  decision: LeaveApprovalDecision
}) {
  const headline =
    decision === 'approve'
      ? 'Leave approved'
      : decision === 'decline'
        ? 'Leave declined'
        : 'Alternative dates suggested'

  return (
    <div className="space-y-4 text-center sm:text-left">
      <p className="text-lg font-semibold text-ink">{headline}</p>
      <p className="text-sm text-ink-soft">
        {row.personName} · {formatLeaveWindow(row)} · {LEAVE_STATUS_LABEL[row.status]}
      </p>
      <p className="text-sm text-muted">
        {decision === 'approve'
          ? 'Roster and holiday balance will update. The driver receives a notification.'
          : decision === 'decline'
            ? 'The driver can submit a new request with different dates.'
            : 'The driver receives your suggested dates and the request stays pending.'}
      </p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted px-3 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
  )
}
