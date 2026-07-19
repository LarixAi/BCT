import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { DOCUMENT_REQUIREMENT_OPTIONS } from '@/lib/drivers/constants'
import type { DriverProfile } from '@/lib/drivers/types'
import type { DocumentRequirement, DriverOnboardingForm } from '../driver-onboarding.types'
import { OnboardingField } from './OnboardingField'

export function DocumentsStep({
  form,
  driverId,
  driver,
  uploadPending,
  onChange,
  onUpload,
}: {
  form: DriverOnboardingForm
  driverId?: string
  driver?: DriverProfile | null
  uploadPending: boolean
  onChange: (patch: Partial<DriverOnboardingForm>) => void
  onUpload: (req: DocumentRequirement) => void
}) {
  return (
    <SectionCard
      title="Licence and documents"
      description="Driving licence expiry is required for activation. Upload files after entering dates."
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <OnboardingField
          label="Driving licence number"
          value={form.licenceNumber}
          onChange={(v) => onChange({ licenceNumber: v })}
        />
        <OnboardingField
          label="Licence country"
          value={form.licenceCountry}
          onChange={(v) => onChange({ licenceCountry: v })}
        />
        <OnboardingField
          label="Licence expiry"
          value={form.licenceExpiry}
          onChange={(v) => onChange({ licenceExpiry: v })}
          type="date"
        />
        <OnboardingField
          label="Licence categories"
          value={form.licenceCategories}
          onChange={(v) => onChange({ licenceCategories: v })}
        />
        <OnboardingField
          label="DQC / CPC number"
          value={form.dqcNumber}
          onChange={(v) => onChange({ dqcNumber: v })}
        />
        <OnboardingField
          label="DQC / CPC expiry"
          value={form.cpcExpiry}
          onChange={(v) => onChange({ cpcExpiry: v })}
          type="date"
        />
        <OnboardingField
          label="Tachograph card number"
          value={form.tachoCardNumber}
          onChange={(v) => onChange({ tachoCardNumber: v })}
        />
        <OnboardingField
          label="Tachograph card expiry"
          value={form.tachoCardExpiry}
          onChange={(v) => onChange({ tachoCardExpiry: v })}
          type="date"
        />
        <OnboardingField
          label="DBS expiry / review"
          value={form.dbsExpiry}
          onChange={(v) => onChange({ dbsExpiry: v })}
          type="date"
        />
        <OnboardingField
          label="Medical expiry"
          value={form.medicalExpiry}
          onChange={(v) => onChange({ medicalExpiry: v })}
          type="date"
        />
        <OnboardingField
          label="Right-to-work status"
          value={form.rightToWorkStatus}
          onChange={(v) => onChange({ rightToWorkStatus: v })}
          className="sm:col-span-2"
        />
      </div>
      {!driverId ? (
        <p className="text-sm text-muted">Save personal details first to upload documents.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {DOCUMENT_REQUIREMENT_OPTIONS.map((req) => {
            const doc = driver?.documents.find(
              (d) => d.requirementType === req.type || (req.type === 'dqc' && d.requirementType === 'cpc'),
            )
            return (
              <li key={req.type} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="font-medium text-ink">{req.label}</p>
                  <p className="text-xs text-muted">{doc ? doc.fileName : 'No file yet'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={doc?.verificationStatus ?? 'not_supplied'} />
                  <button
                    type="button"
                    disabled={uploadPending}
                    onClick={() => onUpload(req)}
                    className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-command-700 hover:bg-command-50"
                  >
                    Upload
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
