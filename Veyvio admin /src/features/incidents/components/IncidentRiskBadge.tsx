import type { IncidentRiskScore } from '@/lib/incidents/types'

const BAND_STYLES: Record<IncidentRiskScore['band'], string> = {
  critical: 'bg-red-100 text-red-900',
  high: 'bg-orange-100 text-orange-900',
  medium: 'bg-amber-100 text-amber-900',
  low: 'bg-slate-100 text-slate-700',
}

export function IncidentRiskBadge({ risk, compact = false }: { risk: IncidentRiskScore; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${BAND_STYLES[risk.band]}`}
      title={risk.factors.join(' · ')}
      data-testid="incident-risk-badge"
    >
      {compact ? risk.score : `${risk.score} · ${risk.band}`}
    </span>
  )
}
