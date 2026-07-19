import { Link } from 'react-router-dom'
import { DriverOnboardingLayout } from './DriverOnboardingLayout'
import { DriverOnboardingProvider, useDriverOnboarding } from './DriverOnboardingProvider'
import { DriverOnboardingStep } from './DriverOnboardingStep'

function DriverOnboardingWizardInner() {
  const wizard = useDriverOnboarding()

  if (wizard.driverLoading) return <p className="text-sm text-muted">Loading driver…</p>

  return (
    <DriverOnboardingLayout
      title={wizard.isNew ? 'Add driver' : `Onboard ${wizard.driver?.firstName ?? 'driver'}`}
      subtitle="Creating the driver record, proving eligibility, and granting Driver app access are three separate decisions."
      statusLine={wizard.statusLine}
      currentStep={wizard.step}
      error={wizard.error}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={wizard.back}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-page"
          >
            {wizard.stepIdx === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-2">
            {wizard.step === 'personal' && wizard.isNew ? (
              <button
                type="button"
                disabled={wizard.pending}
                onClick={wizard.saveDraft}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
              >
                Save as draft
              </button>
            ) : null}
            {wizard.step === 'review' && wizard.id ? (
              <Link
                to={`/drivers/${wizard.id}`}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
              >
                Open profile
              </Link>
            ) : null}
            <button
              type="button"
              disabled={
                wizard.pending ||
                (wizard.step === 'review' && wizard.eligibility && !wizard.eligibility.canAssign)
              }
              onClick={wizard.continue}
              className="rounded-lg bg-midnight px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-50"
            >
              {wizard.pending
                ? 'Working…'
                : wizard.step === 'personal' && wizard.isNew
                  ? 'Continue'
                  : wizard.step === 'account'
                    ? 'Create app account'
                    : wizard.step === 'review'
                      ? 'Activate driver'
                      : 'Continue'}
            </button>
          </div>
        </div>
      }
    >
      <DriverOnboardingStep
        step={wizard.step}
        form={wizard.form}
        depots={wizard.depots}
        driver={wizard.driver}
        driverId={wizard.id}
        actorName={wizard.actorName}
        canManage={wizard.canManage}
        uploadPending={wizard.uploadPending}
        activating={wizard.activatePending}
        onChange={wizard.patchForm}
        onUpload={wizard.upload}
        onActivate={wizard.activate}
      />
    </DriverOnboardingLayout>
  )
}

export function DriverOnboardingWizard() {
  return (
    <DriverOnboardingProvider>
      <DriverOnboardingWizardInner />
    </DriverOnboardingProvider>
  )
}
