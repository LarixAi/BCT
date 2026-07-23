import { buildInsurerExportPack, buildRegulatorExportPack, downloadTextFile } from '@/lib/incidents/export-packs'
import { canExportIncidentPacks } from '@/lib/incidents/permissions'
import type { IncidentDetailRecord } from '@/lib/incidents/types'
import { useAuth } from '@/lib/auth-context'

export function IncidentExportPacksButton({ incident }: { incident: IncidentDetailRecord }) {
  const { user } = useAuth()
  const canExport = canExportIncidentPacks(user?.permissions ?? [])

  if (!canExport) return null

  const date = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-wrap gap-2" data-testid="incident-export-packs">
      <button
        type="button"
        onClick={() => downloadTextFile(`${incident.incidentRef}-regulator-${date}.txt`, buildRegulatorExportPack(incident))}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
      >
        Regulator pack
      </button>
      <button
        type="button"
        onClick={() => downloadTextFile(`${incident.incidentRef}-insurer-${date}.txt`, buildInsurerExportPack(incident))}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
      >
        Insurer pack
      </button>
    </div>
  )
}
