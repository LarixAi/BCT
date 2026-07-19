import { useState } from 'react'
import { SUSPEND_REASON_OPTIONS } from '@/lib/drivers/account-access'
import type { SuspendDriverInput, SuspendReasonCategory, SuspensionDuration } from '@/lib/drivers/types'

export function SuspendDriverAccessDialog({
  driverName,
  open,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  driverName: string
  open: boolean
  pending?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (input: SuspendDriverInput) => void
}) {
  const [reasonCategory, setReasonCategory] = useState<SuspendReasonCategory>('employment_issue')
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState<SuspensionDuration>('until_restored')
  const [restoreAt, setRestoreAt] = useState('')
  const [driverMessage, setDriverMessage] = useState('')
  const [reassignActiveTrips, setReassignActiveTrips] = useState(true)
  const [notifyDriver, setNotifyDriver] = useState(true)

  if (!open) return null

  const canSubmit =
    reason.trim().length >= 8 &&
    (duration === 'until_restored' || Boolean(restoreAt)) &&
    !pending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">Suspend driver access</h2>
        <p className="mt-1 text-sm text-slate-600">
          {driverName} will be signed out and blocked from signing in until access is restored.
        </p>

        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Reason category</span>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value as SuspendReasonCategory)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {SUSPEND_REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Detailed reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Required for the access audit trail"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium text-slate-700">Duration</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="suspend-duration"
                checked={duration === 'until_restored'}
                onChange={() => setDuration('until_restored')}
              />
              Until manually restored
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="suspend-duration"
                checked={duration === 'until_datetime'}
                onChange={() => setDuration('until_datetime')}
              />
              Until selected date and time
            </label>
            {duration === 'until_datetime' && (
              <input
                type="datetime-local"
                value={restoreAt}
                onChange={(e) => setRestoreAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            )}
          </fieldset>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Driver message</span>
            <span className="ml-1 text-slate-500">(optional)</span>
            <textarea
              value={driverMessage}
              onChange={(e) => setDriverMessage(e.target.value)}
              rows={2}
              placeholder="Shown to the driver if they try to sign in"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reassignActiveTrips}
              onChange={(e) => setReassignActiveTrips(e.target.checked)}
            />
            Reassign active trips
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notifyDriver} onChange={(e) => setNotifyDriver(e.target.checked)} />
            Notify the driver
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onConfirm({
                reasonCategory,
                reason: reason.trim(),
                duration,
                restoreAt: duration === 'until_datetime' ? new Date(restoreAt).toISOString() : null,
                driverMessage: driverMessage.trim() || null,
                reassignActiveTrips,
                notifyDriver,
              })
            }
            className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-1.5 text-sm font-medium text-critical hover:bg-critical/15 disabled:opacity-50"
          >
            {pending ? 'Suspending…' : 'Suspend access'}
          </button>
        </div>
      </div>
    </div>
  )
}
