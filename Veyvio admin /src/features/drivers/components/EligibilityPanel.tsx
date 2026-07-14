import type { DriverEligibilityResult, OperationalEligibility } from '@/lib/drivers/types'
import { ELIGIBILITY_LABELS } from '@/lib/drivers/constants'

const ELIGIBILITY_STYLES: Record<OperationalEligibility, string> = {
  eligible: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  eligible_with_warning: 'border-amber-200 bg-amber-50 text-amber-900',
  not_eligible: 'border-red-200 bg-red-50 text-red-900',
  restricted: 'border-orange-200 bg-orange-50 text-orange-900',
  awaiting_approval: 'border-blue-200 bg-blue-50 text-blue-900',
  emergency_override_active: 'border-purple-200 bg-purple-50 text-purple-900',
}

export function EligibilityPanel({ eligibility }: { eligibility: DriverEligibilityResult }) {
  const style = ELIGIBILITY_STYLES[eligibility.operationalEligibility]

  return (
    <div className={`rounded-xl border p-4 ${style}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Eligible for work</p>
      <p className="mt-1 text-lg font-semibold">{ELIGIBILITY_LABELS[eligibility.operationalEligibility]}</p>
      <p className="mt-1 text-sm opacity-90">{eligibility.summary}</p>

      {eligibility.failures.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide">Blocking reasons</p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {eligibility.failures.map((f) => (
              <li key={f.code}>{f.message}</li>
            ))}
          </ul>
        </div>
      )}

      {eligibility.warnings.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide">Warnings</p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {eligibility.warnings.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
