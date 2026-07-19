import { SectionCard } from '@/components/ui'
import type { DriverOnboardingForm } from '../driver-onboarding.types'
import { OnboardingField } from './OnboardingField'

export function PersonalDetailsStep({
  form,
  onChange,
}: {
  form: DriverOnboardingForm
  onChange: (patch: Partial<DriverOnboardingForm>) => void
}) {
  return (
    <SectionCard title="Personal details" description="No app login is created at this stage.">
      <div className="grid gap-3 sm:grid-cols-2">
        <OnboardingField
          label="First name"
          value={form.firstName}
          onChange={(v) => onChange({ firstName: v })}
          required
        />
        <OnboardingField
          label="Last name"
          value={form.lastName}
          onChange={(v) => onChange({ lastName: v })}
          required
        />
        <OnboardingField
          label="Preferred name"
          value={form.preferredName}
          onChange={(v) => onChange({ preferredName: v })}
          className="sm:col-span-2"
        />
        <OnboardingField
          label="Date of birth"
          value={form.dateOfBirth}
          onChange={(v) => onChange({ dateOfBirth: v })}
          type="date"
        />
        <OnboardingField
          label="Employee or driver number"
          value={form.employeeNumber}
          onChange={(v) => onChange({ employeeNumber: v })}
        />
        <OnboardingField
          label="Work or personal email"
          value={form.email}
          onChange={(v) => onChange({ email: v })}
          type="email"
          required
        />
        <OnboardingField
          label="Mobile number"
          value={form.phone}
          onChange={(v) => onChange({ phone: v })}
          type="tel"
          required
        />
        <OnboardingField
          label="Home address"
          value={form.homeAddress}
          onChange={(v) => onChange({ homeAddress: v })}
          className="sm:col-span-2"
        />
        <OnboardingField
          label="Emergency contact"
          value={form.emergencyContact}
          onChange={(v) => onChange({ emergencyContact: v })}
          className="sm:col-span-2"
        />
      </div>
    </SectionCard>
  )
}
