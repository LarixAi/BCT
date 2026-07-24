import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import type { DutyRecord } from '@/lib/api/types'
import type { OperationalTrip } from '@/lib/transfers/types'

export type DispatchControlAction =
  | 'replace_driver'
  | 'replace_vehicle'
  | 'move_job'
  | 'reorder_stops'
  | 'urgent_booking'
  | 'cancel_job'
  | 'no_show'
  | 'contact_passenger'
  | 'contact_driver'
  | 'replacement_trip'
  | 'safeguarding'

type DispatchControlsPanelProps = {
  duty: DutyRecord | null
  trip: OperationalTrip | null
  onAction: (action: DispatchControlAction) => void
  actionMessage: string | null
}

const CONTROLS: { id: DispatchControlAction; label: string; description: string }[] = [
  { id: 'replace_driver', label: 'Replace driver', description: 'Reassign with audit trail' },
  { id: 'replace_vehicle', label: 'Replace vehicle', description: 'Swap release-ready vehicle' },
  { id: 'move_job', label: 'Move job', description: 'Transfer to another trip' },
  { id: 'reorder_stops', label: 'Reorder stops', description: 'Publish route version' },
  { id: 'urgent_booking', label: 'Add urgent booking', description: 'Create emergency job' },
  { id: 'cancel_job', label: 'Cancel job', description: 'Record reason and notify' },
  { id: 'no_show', label: 'Mark no-show', description: 'Passenger did not attend' },
  { id: 'contact_passenger', label: 'Contact passenger', description: 'SMS or call log' },
  { id: 'contact_driver', label: 'Contact driver', description: 'Message active driver' },
  { id: 'replacement_trip', label: 'Create replacement trip', description: 'New vehicle journey' },
  { id: 'safeguarding', label: 'Escalate safeguarding', description: 'Critical compliance route' },
]

export function DispatchControlsPanel({ duty, trip, onAction, actionMessage }: DispatchControlsPanelProps) {
  const runRef = duty?.reference ?? trip?.runReference ?? ''
  const driverName = duty?.driver
    ? `${duty.driver.firstName} ${duty.driver.lastName}`
    : trip?.driverName ?? ''

  return (
    <SectionCard
      title="Dispatch controls"
      description={
        duty
          ? `Actions for ${duty.reference} — every change is audited`
          : 'Select a run or trip to enable controls'
      }
    >
      {actionMessage && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {actionMessage}
        </div>
      )}

      {!duty && !trip ? (
        <p className="text-sm text-muted">Select an active run from the board or map to take action.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {CONTROLS.map((control) => {
            if (control.id === 'urgent_booking') {
              return (
                <Link
                  key={control.id}
                  to="/bookings/new/urgent"
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:bg-surface-muted"
                >
                  <ControlLabel label={control.label} description={control.description} />
                </Link>
              )
            }
            if (control.id === 'contact_driver' && driverName) {
              return (
                <Link
                  key={control.id}
                  to={`/messages?compose=1&to=${encodeURIComponent(driverName)}&run=${encodeURIComponent(runRef)}`}
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:bg-surface-muted"
                >
                  <ControlLabel label={control.label} description={control.description} />
                </Link>
              )
            }
            if (control.id === 'safeguarding') {
              return (
                <Link
                  key={control.id}
                  to={`/exceptions?create=1&run=${encodeURIComponent(runRef)}&severity=critical`}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left hover:bg-red-100"
                >
                  <ControlLabel label={control.label} description={control.description} />
                </Link>
              )
            }
            if (control.id === 'reorder_stops' && trip) {
              return (
                <Link
                  key={control.id}
                  to={`/trips/${trip.id}?tab=route`}
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:bg-surface-muted"
                >
                  <ControlLabel label={control.label} description={control.description} />
                </Link>
              )
            }
            if (control.id === 'replacement_trip') {
              return (
                <Link
                  key={control.id}
                  to="/schedule?mode=planning"
                  className="rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:bg-surface-muted"
                >
                  <ControlLabel label={control.label} description={control.description} />
                </Link>
              )
            }
            return (
              <button
                key={control.id}
                type="button"
                onClick={() => onAction(control.id)}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:bg-surface-muted"
              >
                <ControlLabel label={control.label} description={control.description} />
              </button>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

function ControlLabel({ label, description }: { label: string; description: string }) {
  return (
    <>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p className="text-xs text-ink-soft">{description}</p>
    </>
  )
}
