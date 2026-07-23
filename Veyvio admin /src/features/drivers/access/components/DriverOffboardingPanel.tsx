import type { Dispatch, SetStateAction } from 'react'
import { mutationErrorMessage } from '../utils/driver-access-formatters'

export function DriverOffboardingPanel({
  canOffboard,
  showOffboard,
  setShowOffboard,
  offboardReason,
  setOffboardReason,
  offboardEndDate,
  setOffboardEndDate,
  offboardPending,
  offboardError,
  onOffboard,
  isOffboarded,
}: {
  canOffboard: boolean
  showOffboard: boolean
  setShowOffboard: Dispatch<SetStateAction<boolean>>
  offboardReason: string
  setOffboardReason: (value: string) => void
  offboardEndDate: string
  setOffboardEndDate: (value: string) => void
  offboardPending: boolean
  offboardError: unknown
  onOffboard: () => void
  isOffboarded: boolean
}) {
  if (!canOffboard || isOffboarded) return null

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setShowOffboard((v) => !v)}
        className="rounded-lg border border-critical/40 px-3 py-1.5 text-sm font-medium text-critical hover:bg-critical/10"
      >
        Offboard driver
      </button>

      {showOffboard ? (
        <div className="space-y-2 rounded-lg border border-critical/20 bg-critical/5 p-3">
          <p className="text-sm font-medium text-ink">Offboard driver</p>
          <p className="text-xs text-ink-soft">
            Ends sessions, revokes devices, and archives identity. Historical records are retained.
          </p>
          <input
            type="date"
            value={offboardEndDate}
            onChange={(e) => setOffboardEndDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
          />
          <textarea
            value={offboardReason}
            onChange={(e) => setOffboardReason(e.target.value)}
            rows={2}
            placeholder="Reason required"
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={!offboardReason.trim() || !offboardEndDate || offboardPending}
            onClick={onOffboard}
            className="rounded-lg bg-critical px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {offboardPending ? 'Offboarding…' : 'Confirm offboard'}
          </button>
          {offboardError ? (
            <p className="text-sm text-red-800">{mutationErrorMessage(offboardError, 'Offboard failed')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
