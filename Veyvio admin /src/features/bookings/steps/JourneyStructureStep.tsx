import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import {
  JOURNEY_STRUCTURE_OPTIONS,
  RECURRENCE_PATTERN_OPTIONS,
  SERVICE_PURPOSE_OPTIONS,
  applyJourneyStructure,
  bookingTypeToStructure,
  type JourneyStructure,
  type RecurrencePattern,
} from '@/lib/bookings/booking-journey-utils'
import type { BookingDraft } from '@/lib/bookings/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const RECURRENCE_DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
]

export function JourneyStructureStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const { data: depots = [] } = useQuery({
    queryKey: tKey(['depots']),
    queryFn: () => api.getDepots(),
  })

  const structure = bookingTypeToStructure(draft.bookingType)
  const isRecurring = draft.recurrence.enabled || draft.bookingType === 'recurring'
  const recurrencePattern: RecurrencePattern = isRecurring
    ? draft.recurrence.daysOfWeek.length === 7
      ? 'daily'
      : 'weekly'
    : 'none'

  function setStructure(next: JourneyStructure) {
    onChange(applyJourneyStructure(draft, next, isRecurring))
  }

  function setRecurrencePattern(pattern: RecurrencePattern) {
    const enabled = pattern !== 'none'
    const patch = applyJourneyStructure(draft, structure, enabled)
    if (enabled && pattern === 'weekly' && !draft.recurrence.daysOfWeek.length) {
      patch.recurrence = {
        ...draft.recurrence,
        ...patch.recurrence,
        enabled: true,
        daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
        startDate: draft.recurrence.startDate || draft.trips[0]?.pickupDate || '',
      }
    }
    onChange(patch)
  }

  return (
    <div className="space-y-4">
      <SectionCard title="What journey is being booked?" description="Step 1 — journey structure">
        <div className="grid gap-3 sm:grid-cols-2">
          {JOURNEY_STRUCTURE_OPTIONS.map((opt) => {
            const selected = structure === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStructure(opt.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? 'border-command-500 bg-command-50 ring-2 ring-command-500/20'
                    : 'border-border hover:border-command-400'
                }`}
              >
                <p className="font-semibold text-ink">{opt.label}</p>
                <p className="mt-1 text-sm text-ink-soft">{opt.description}</p>
              </button>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Service details">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.priority === 'urgent'}
              onChange={(e) =>
                onChange({
                  priority: e.target.checked ? 'urgent' : 'normal',
                })
              }
            />
            Urgent booking
          </label>

          <label className="text-sm">
            <span className="text-ink-soft">Managing depot</span>
            <select
              value={draft.dispatch.depotId ?? ''}
              onChange={(e) =>
                onChange({
                  dispatch: { ...draft.dispatch, depotId: e.target.value || null },
                })
              }
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            >
              <option value="">Select depot</option>
              {depots.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm sm:col-span-2">
            <span className="text-ink-soft">Service purpose</span>
            <select
              value={draft.journeyPurpose || ''}
              onChange={(e) => onChange({ journeyPurpose: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            >
              <option value="">Select purpose</option>
              {SERVICE_PURPOSE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Recurrence" description="School term patterns belong in School Routes">
        <div className="flex flex-wrap gap-2">
          {RECURRENCE_PATTERN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setRecurrencePattern(opt.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                recurrencePattern === opt.id
                  ? 'bg-command-600 text-white'
                  : 'bg-surface-muted text-ink-soft'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isRecurring && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-ink-soft">Start date</span>
                <input
                  type="date"
                  value={draft.recurrence.startDate}
                  onChange={(e) =>
                    onChange({ recurrence: { ...draft.recurrence, enabled: true, startDate: e.target.value } })
                  }
                  className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                />
              </label>
              <label className="text-sm">
                <span className="text-ink-soft">End date</span>
                <input
                  type="date"
                  value={draft.recurrence.endDate}
                  onChange={(e) =>
                    onChange({ recurrence: { ...draft.recurrence, enabled: true, endDate: e.target.value } })
                  }
                  className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
                />
              </label>
            </div>
            <div>
              <p className="text-sm text-ink-soft">Days of week</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {RECURRENCE_DAYS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      const days = draft.recurrence.daysOfWeek.includes(d.id)
                        ? draft.recurrence.daysOfWeek.filter((day) => day !== d.id)
                        : [...draft.recurrence.daysOfWeek, d.id]
                      onChange({ recurrence: { ...draft.recurrence, enabled: true, daysOfWeek: days } })
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      draft.recurrence.daysOfWeek.includes(d.id)
                        ? 'bg-command-600 text-white'
                        : 'bg-surface-muted text-ink-soft'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted">Jobs will be generated up to 8 weeks ahead when confirmed.</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
