import { SectionCard } from '@/components/ui'
import { EMPLOYMENT_TYPE_LABELS } from '@/lib/drivers/constants'
import type { EmploymentType } from '@/lib/drivers/types'
import type { DriverOnboardingForm, OnboardingDepotOption } from '../driver-onboarding.types'
import { OnboardingField } from './OnboardingField'

export function EmploymentStep({
  form,
  depots,
  onChange,
}: {
  form: DriverOnboardingForm
  depots: OnboardingDepotOption[]
  onChange: (patch: Partial<DriverOnboardingForm>) => void
}) {
  return (
    <SectionCard title="Employment and depot" description="Operational setup — still no Driver app account.">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-ink-soft">Employment type</span>
          <select
            value={form.employmentType}
            onChange={(e) => onChange({ employmentType: e.target.value as EmploymentType })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
          >
            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <OnboardingField
          label="Start date"
          value={form.startDate}
          onChange={(v) => onChange({ startDate: v })}
          type="date"
        />
        <label className="block text-sm">
          <span className="text-ink-soft">Primary depot</span>
          <select
            value={form.depotId}
            onChange={(e) =>
              onChange({
                depotId: e.target.value,
                secondaryDepotIds: form.secondaryDepotIds.filter((d) => d !== e.target.value),
              })
            }
            className="mt-1 w-full rounded-lg border border-border px-3 py-1.5"
          >
            {depots.length === 0 && <option value="">No depots available</option>}
            {depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <OnboardingField
          label="Line manager"
          value={form.managerName}
          onChange={(v) => onChange({ managerName: v })}
        />
        <label className="block text-sm sm:col-span-2">
          <span className="text-ink-soft">Additional depots</span>
          <div className="mt-2 flex flex-wrap gap-3">
            {depots
              .filter((d) => d.id !== form.depotId)
              .map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.secondaryDepotIds.includes(d.id)}
                    onChange={() =>
                      onChange({
                        secondaryDepotIds: form.secondaryDepotIds.includes(d.id)
                          ? form.secondaryDepotIds.filter((x) => x !== d.id)
                          : [...form.secondaryDepotIds, d.id],
                      })
                    }
                  />
                  {d.name}
                </label>
              ))}
            {depots.filter((d) => d.id !== form.depotId).length === 0 && (
              <p className="text-sm text-muted">No additional depots configured.</p>
            )}
          </div>
        </label>
      </div>
    </SectionCard>
  )
}
