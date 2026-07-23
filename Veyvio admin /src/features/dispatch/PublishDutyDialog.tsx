import type { DutyRecord } from '@/lib/api/types'

function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  if (value.length >= 16 && value.includes('T')) {
    return value.slice(11, 16)
  }
  return value.slice(0, 5)
}

export function PublishDutyDialog({
  duty,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  duty: DutyRecord
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const driverName = duty.driver
    ? `${duty.driver.firstName} ${duty.driver.lastName}`.trim()
    : 'Unassigned driver'
  const vehicle = duty.vehicle?.registrationNumber ?? 'No vehicle'
  const deadline = duty.acknowledgementDeadline
    ? new Date(duty.acknowledgementDeadline).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'End of day before service'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-ink">Publish duty to {driverName}?</h2>
        <p className="mt-2 text-sm text-ink-soft">
          {duty.dutyDate}, {formatTime(duty.startTime)}–{formatTime(duty.endTime)}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-ink-soft">
          <li>Vehicle {vehicle}</li>
          <li>{duty.route?.name ?? duty.reference}</li>
          <li>Driver acknowledgement required by: {deadline}</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Once published, this duty appears in Veyvio Driver. Draft duties stay hidden from the driver.
        </p>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-command-600 px-3 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60"
          >
            {busy ? 'Publishing…' : 'Publish duty'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function publicationBadge(status: string | undefined) {
  const value = status ?? 'draft'
  if (value === 'published') {
    return {
      label: 'Published',
      className: 'bg-emerald-100 text-emerald-800',
    }
  }
  if (value === 'ready_to_publish') {
    return {
      label: 'Ready to publish',
      className: 'bg-sky-100 text-sky-800',
    }
  }
  if (value === 'cancelled') {
    return {
      label: 'Cancelled',
      className: 'bg-surface-muted text-ink-soft',
    }
  }
  return {
    label: 'Draft',
    className: 'bg-amber-100 text-amber-900',
  }
}
