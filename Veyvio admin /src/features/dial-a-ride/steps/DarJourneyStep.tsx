import { SectionCard } from '@/components/ui'
import { JOURNEY_PURPOSE_OPTIONS } from '@/lib/dial-a-ride/constants'
import type { DialARideRequest } from '@/lib/dial-a-ride/types'

export function DarJourneyStep({
  request,
  onChange,
}: {
  request: DialARideRequest
  onChange: (patch: Partial<DialARideRequest>) => void
}) {
  return (
    <SectionCard title="Journey" description="Step 2 — pickup, destination and purpose">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Pickup address" value={request.pickupAddress} onChange={(v) => onChange({ pickupAddress: v })} />
        <Field label="Destination" value={request.destinationAddress} onChange={(v) => onChange({ destinationAddress: v })} />
        <label className="text-sm sm:col-span-2">
          <span className="text-ink-soft">Journey purpose</span>
          <select
            value={request.journeyPurpose}
            onChange={(e) => onChange({ journeyPurpose: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
          >
            <option value="">Select purpose</option>
            {JOURNEY_PURPOSE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={request.returnRequired} onChange={(e) => onChange({ returnRequired: e.target.checked })} />
          Return journey required
        </label>
        <Field label="Pickup instructions" value={request.pickupInstructions} onChange={(v) => onChange({ pickupInstructions: v })} multiline />
        <Field label="Destination instructions" value={request.destinationInstructions} onChange={(v) => onChange({ destinationInstructions: v })} multiline />
      </div>
    </SectionCard>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  return (
    <label className="text-sm">
      <span className="text-ink-soft">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border px-3 py-1.5" />
      )}
    </label>
  )
}
