import { useOperationalContext } from '@/lib/context'

export function ReportFiltersBar({
  from,
  to,
  onFromChange,
  onToChange,
  showDepot = true,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  showDepot?: boolean
}) {
  const { depotId, setDepotId, depots } = useOperationalContext()

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <label className="text-xs font-medium text-slate-600">
        From
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
        />
      </label>
      <label className="text-xs font-medium text-slate-600">
        To
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
        />
      </label>
      {showDepot ? (
        <label className="text-xs font-medium text-slate-600">
          Depot
          <select
            value={depotId}
            onChange={(e) => setDepotId(e.target.value)}
            className="mt-1 block min-w-[10rem] rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
          >
            {depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}
