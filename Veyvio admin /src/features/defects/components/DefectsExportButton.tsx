import { defectsToCsv, downloadDefectsCsv } from '@/lib/defects/export'
import { canExportDefects } from '@/lib/defects/permissions'
import type { DefectRegisterRow } from '@/lib/defects/types'
import { useAuth } from '@/lib/auth-context'

export function DefectsExportButton({ rows, label = 'Export' }: { rows: DefectRegisterRow[]; label?: string }) {
  const { user } = useAuth()
  const canExport = canExportDefects(user?.permissions ?? [])

  if (!canExport) return null

  function handleExport() {
    const open = rows.filter((r) => r.defectStatus !== 'closed')
    const csv = defectsToCsv(open.length > 0 ? open : rows)
    const date = new Date().toISOString().slice(0, 10)
    downloadDefectsCsv(`defects-export-${date}.csv`, csv)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
      data-testid="defects-export-button"
    >
      {label}
    </button>
  )
}
