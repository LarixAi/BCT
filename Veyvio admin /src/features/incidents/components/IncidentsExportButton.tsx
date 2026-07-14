import { downloadIncidentsCsv, incidentsToCsv } from '@/lib/incidents/export'
import { canExportIncidents } from '@/lib/incidents/permissions'
import type { IncidentRegisterRow } from '@/lib/incidents/types'
import { useAuth } from '@/lib/auth-context'

export function IncidentsExportButton({ rows, label = 'Export' }: { rows: IncidentRegisterRow[]; label?: string }) {
  const { user } = useAuth()
  const canExport = canExportIncidents(user?.permissions ?? [])

  if (!canExport) return null

  function handleExport() {
    const active = rows.filter((r) => r.status !== 'closed' && r.status !== 'cancelled_duplicate')
    const csv = incidentsToCsv(active.length > 0 ? active : rows)
    const date = new Date().toISOString().slice(0, 10)
    downloadIncidentsCsv(`incidents-export-${date}.csv`, csv)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
      data-testid="incidents-export-button"
    >
      {label}
    </button>
  )
}
