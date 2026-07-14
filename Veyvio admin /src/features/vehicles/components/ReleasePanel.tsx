import type { ReleaseDecision, VehicleReleaseResult } from '@/lib/vehicles/types'
import { RELEASE_DECISION_LABELS } from '@/lib/vehicles/constants'

const RELEASE_STYLES: Record<ReleaseDecision, string> = {
  released: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  released_with_warning: 'border-amber-200 bg-amber-50 text-amber-900',
  restricted_use: 'border-orange-200 bg-orange-50 text-orange-900',
  blocked: 'border-red-200 bg-red-50 text-red-900',
  manual_authorisation_required: 'border-purple-200 bg-purple-50 text-purple-900',
}

export function ReleasePanel({ release }: { release: VehicleReleaseResult }) {
  const style = RELEASE_STYLES[release.releaseDecision]

  return (
    <div className={`rounded-xl border p-4 ${style}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Vehicle release</p>
      <p className="mt-1 text-lg font-semibold">{RELEASE_DECISION_LABELS[release.releaseDecision]}</p>
      <p className="mt-1 text-sm opacity-90">{release.summary}</p>

      {release.failures.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide">Blocking reasons</p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {release.failures.map((f) => (
              <li key={f.code}>{f.message}</li>
            ))}
          </ul>
        </div>
      )}

      {release.warnings.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide">Warnings</p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {release.warnings.map((w) => (
              <li key={w.code}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
