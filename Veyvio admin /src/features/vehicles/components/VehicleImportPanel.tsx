import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import {
  downloadVehicleImportTemplate,
  parseVehicleImportCsv,
  type VehicleImportParsedRow,
  type VehicleImportParseResult,
} from '@/lib/vehicles/vehicle-csv-import'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'
import { useAuth } from '@/lib/auth-context'

export function VehicleImportPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const queryClient = useQueryClient()
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<VehicleImportParseResult | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)

  const { data: depots = [] } = useQuery({
    queryKey: tKey(['depots']),
    queryFn: () => api.getDepots(),
  })

  const depotHint = useMemo(() => {
    if (!depots.length) return 'No depots loaded — home_depot_name will be ignored until depots exist.'
    return `Known depots: ${depots.map((d) => d.name).join(', ')}`
  }, [depots])

  async function onFileSelected(file: File | null) {
    setResultMessage(null)
    if (!file) {
      setFileName(null)
      setParsed(null)
      return
    }
    setFileName(file.name)
    const text = await file.text()
    setParsed(parseVehicleImportCsv(text))
  }

  const importMutation = useMutation({
    mutationFn: (rows: VehicleImportParsedRow[]) => api.importVehicles(rows, actorName),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: tKey(['vehicle-profiles']) })
      queryClient.invalidateQueries({ queryKey: tKey(['vehicle-directory-summary']) })
      queryClient.invalidateQueries({ queryKey: tKey(['vehicles']) })
      const failed = result.failed.length
      setResultMessage(
        `Imported ${result.created} vehicle${result.created === 1 ? '' : 's'}` +
          (result.skippedDuplicates ? ` · ${result.skippedDuplicates} already on file` : '') +
          (failed ? ` · ${failed} failed` : ''),
      )
      if (result.created > 0 && failed === 0) {
        window.setTimeout(() => onClose(), 1200)
      }
    },
  })

  return (
    <SectionCard
      title="Import vehicles"
      description="Upload a CSV to create fleet records. Invalid rows are listed — only valid rows are imported."
      action={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
        >
          Close
        </button>
      }
    >
      <div className="space-y-4 text-sm">
        <ol className="list-decimal space-y-1 pl-5 text-ink-soft">
          <li>Download the template and fill one vehicle per row.</li>
          <li>Use UK dates as YYYY-MM-DD for MOT, insurance, tax, tacho and PMI.</li>
          <li>Match home_depot_name to an existing depot when possible.</li>
        </ol>

        <p className="text-xs text-muted">{depotHint}</p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadVehicleImportTemplate()}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted"
          >
            Download CSV template
          </button>
          <label className="cursor-pointer rounded-lg bg-command-600 px-3 py-2 text-sm font-medium text-white hover:bg-command-700">
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void onFileSelected(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {fileName && (
          <p className="text-xs text-muted">
            Selected: <span className="font-medium text-ink">{fileName}</span>
          </p>
        )}

        {parsed && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Rows read" value={String(parsed.rowsRead)} />
              <Stat label="Ready to import" value={String(parsed.valid.length)} tone="ok" />
              <Stat label="Row errors" value={String(parsed.errors.length)} tone={parsed.errors.length ? 'bad' : 'ok'} />
            </div>

            {parsed.errors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="font-medium text-amber-950">Fix these rows before they can import</p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-amber-950">
                  {parsed.errors.map((err) => (
                    <li key={`${err.rowNumber}-${err.reason}`}>
                      Row {err.rowNumber}
                      {err.registrationNumber !== '—' ? ` · ${err.registrationNumber}` : ''}: {err.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.valid.length > 0 && (
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full min-w-[40rem] text-left text-xs">
                  <thead className="border-b border-border bg-surface-muted text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Reg</th>
                      <th className="px-3 py-2 font-medium">Fleet</th>
                      <th className="px-3 py-2 font-medium">Make / model</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Depot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.valid.slice(0, 20).map((row) => (
                      <tr key={row.registrationNumber} className="border-b border-border/60">
                        <td className="px-3 py-2 font-medium">{row.registrationNumber}</td>
                        <td className="px-3 py-2">{row.fleetNumber ?? '—'}</td>
                        <td className="px-3 py-2">
                          {row.make} {row.model}
                          {row.modelYear ? ` (${row.modelYear})` : ''}
                        </td>
                        <td className="px-3 py-2">{row.vehicleCategory}</td>
                        <td className="px-3 py-2">{row.homeDepotName ?? row.homeDepotId ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.valid.length > 20 && (
                  <p className="px-3 py-2 text-xs text-muted">Showing first 20 of {parsed.valid.length} valid rows.</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!parsed.valid.length || importMutation.isPending}
                onClick={() => importMutation.mutate(parsed.valid)}
                className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
              >
                {importMutation.isPending
                  ? 'Importing…'
                  : `Import ${parsed.valid.length} vehicle${parsed.valid.length === 1 ? '' : 's'}`}
              </button>
              {importMutation.isError && (
                <p className="text-sm text-red-700">
                  {importMutation.error instanceof Error ? importMutation.error.message : 'Import failed'}
                </p>
              )}
              {resultMessage && <p className="text-sm text-emerald-800">{resultMessage}</p>}
            </div>

            {importMutation.data && importMutation.data.failed.length > 0 && (
              <ul className="max-h-32 space-y-1 overflow-auto text-xs text-red-800">
                {importMutation.data.failed.map((f) => (
                  <li key={`${f.row}-${f.registrationNumber}`}>
                    Row {f.row} · {f.registrationNumber}: {f.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p
        className={`text-xl font-semibold tabular-nums ${
          tone === 'bad' ? 'text-red-700' : tone === 'ok' ? 'text-emerald-700' : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}
