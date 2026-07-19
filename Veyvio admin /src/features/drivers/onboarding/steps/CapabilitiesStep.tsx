import { SectionCard } from '@/components/ui'
import { RESTRICTION_OPTIONS, WORK_PERMISSION_OPTIONS } from '@/lib/drivers/constants'
import type { DriverOnboardingForm } from '../driver-onboarding.types'

export function CapabilitiesStep({
  form,
  onChange,
}: {
  form: DriverOnboardingForm
  onChange: (patch: Partial<DriverOnboardingForm>) => void
}) {
  return (
    <>
      <SectionCard title="Capabilities" description="What work this driver may be assigned.">
        <div className="grid gap-2 sm:grid-cols-2">
          {WORK_PERMISSION_OPTIONS.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.workPermissionKeys.includes(opt.key)}
                onChange={() =>
                  onChange({
                    workPermissionKeys: form.workPermissionKeys.includes(opt.key)
                      ? form.workPermissionKeys.filter((k) => k !== opt.key)
                      : [...form.workPermissionKeys, opt.key],
                  })
                }
              />
              {opt.label}
            </label>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Restrictions" description="Feeds Dispatch eligibility rules.">
        <div className="grid gap-2 sm:grid-cols-2">
          {RESTRICTION_OPTIONS.map((opt) => (
            <label key={opt.type} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.restrictionTypes.includes(opt.type)}
                onChange={() =>
                  onChange({
                    restrictionTypes: form.restrictionTypes.includes(opt.type)
                      ? form.restrictionTypes.filter((t) => t !== opt.type)
                      : [...form.restrictionTypes, opt.type],
                  })
                }
              />
              {opt.label}
            </label>
          ))}
        </div>
      </SectionCard>
    </>
  )
}
