import { SectionCard } from '@/components/ui'
import type { BookingDraft } from '@/lib/bookings/types'

export function RequirementsStep({
  draft,
  onChange,
}: {
  draft: BookingDraft
  onChange: (patch: Partial<BookingDraft>) => void
}) {
  const req = draft.requirements

  function setReq(patch: Partial<typeof req>) {
    onChange({ requirements: { ...req, ...patch } })
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Vehicle requirements" description="Compared against actual fleet records at validation">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-ink-soft">Vehicle type</span>
            <select
              value={req.vehicleType}
              onChange={(e) => setReq({ vehicleType: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            >
              <option value="car">Standard car</option>
              <option value="mpv">MPV</option>
              <option value="minibus">Minibus</option>
              <option value="accessible">Wheelchair-accessible minibus</option>
              <option value="coach">Coach</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={req.wheelchairAccessible}
              onChange={(e) => setReq({ wheelchairAccessible: e.target.checked, vehicleType: e.target.checked ? 'accessible' : req.vehicleType })}
            />
            Wheelchair-accessible vehicle
          </label>
          {req.wheelchairAccessible && (
            <label className="text-sm">
              <span className="text-ink-soft">Wheelchair positions</span>
              <input
                type="number"
                min={1}
                max={4}
                value={req.wheelchairPositions}
                onChange={(e) => setReq({ wheelchairPositions: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
              />
            </label>
          )}
          <Toggle label="Low-floor vehicle" checked={req.lowFloor} onChange={(v) => setReq({ lowFloor: v })} />
          <Toggle label="Child seat" checked={req.childSeat} onChange={(v) => setReq({ childSeat: v })} />
          <Toggle label="Booster seat" checked={req.boosterSeat} onChange={(v) => setReq({ boosterSeat: v })} />
        </div>
      </SectionCard>

      <SectionCard title="Staffing requirements">
        <div className="space-y-3">
          <Toggle label="Passenger assistant required" checked={req.passengerAssistant} onChange={(v) => setReq({ passengerAssistant: v })} />
          <label className="block text-sm">
            <span className="text-ink-soft">Additional staffing notes</span>
            <textarea
              value={req.staffingNotes}
              onChange={(e) => setReq({ staffingNotes: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
            />
          </label>
        </div>
      </SectionCard>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
