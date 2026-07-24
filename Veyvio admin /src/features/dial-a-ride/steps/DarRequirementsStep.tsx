import { SectionCard } from '@/components/ui'
import type { DialARideRequest } from '@/lib/dial-a-ride/types'

const REQ_FIELDS = [
  { key: 'companion', label: 'Companion' },
  { key: 'carer', label: 'Carer' },
  { key: 'wheelchair', label: 'Wheelchair' },
  { key: 'mobilityAid', label: 'Mobility aid' },
  { key: 'passengerLift', label: 'Passenger lift' },
  { key: 'assistance', label: 'Boarding assistance' },
  { key: 'bags', label: 'Shopping or luggage' },
  { key: 'serviceAnimal', label: 'Service animal' },
] as const

export function DarRequirementsStep({
  request,
  onChange,
}: {
  request: DialARideRequest
  onChange: (patch: Partial<DialARideRequest>) => void
}) {
  function toggle(key: keyof DialARideRequest['requirements']) {
    onChange({
      requirements: { ...request.requirements, [key]: !request.requirements[key] },
    })
  }

  return (
    <SectionCard title="Companions and requirements" description="Step 4 — defaults from member profile, editable per journey">
      <div className="grid gap-2 sm:grid-cols-2">
        {REQ_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={request.requirements[f.key]}
              onChange={() => toggle(f.key)}
            />
            {f.label}
          </label>
        ))}
      </div>
      <label className="mt-4 block text-sm">
        <span className="text-ink-soft">Communication needs</span>
        <input
          value={request.requirements.communicationNeeds}
          onChange={(e) =>
            onChange({ requirements: { ...request.requirements, communicationNeeds: e.target.value } })
          }
          className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
        />
      </label>
    </SectionCard>
  )
}
