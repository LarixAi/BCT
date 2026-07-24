import { SectionCard } from '@/components/ui'
import type { DialARideRequest } from '@/lib/dial-a-ride/types'

export function DarScheduleStep({
  request,
  onChange,
}: {
  request: DialARideRequest
  onChange: (patch: Partial<DialARideRequest>) => void
}) {
  return (
    <SectionCard title="Date and time" description="Step 3 — Dial-a-Ride uses a pickup window, not a fixed promise">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-ink-soft">Travel date</span>
          <input type="date" value={request.travelDate} onChange={(e) => onChange({ travelDate: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Preferred pickup</span>
          <input type="time" value={request.preferredPickupTime} onChange={(e) => onChange({ preferredPickupTime: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Window start</span>
          <input type="time" value={request.pickupWindowStart} onChange={(e) => onChange({ pickupWindowStart: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Window end</span>
          <input type="time" value={request.pickupWindowEnd} onChange={(e) => onChange({ pickupWindowEnd: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
        </label>
        <label className="text-sm">
          <span className="text-ink-soft">Required arrival (if any)</span>
          <input type="time" value={request.requiredArrivalTime} onChange={(e) => onChange({ requiredArrivalTime: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
        </label>
        {request.returnRequired && (
          <label className="text-sm">
            <span className="text-ink-soft">Return pickup time</span>
            <input type="time" value={request.returnTime} onChange={(e) => onChange({ returnTime: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={request.callWhenReady} onChange={(e) => onChange({ callWhenReady: e.target.checked })} />
          Call when ready
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={request.flexibleShared} onChange={(e) => onChange({ flexibleShared: e.target.checked })} />
          Flexible shared journey
        </label>
      </div>
    </SectionCard>
  )
}
