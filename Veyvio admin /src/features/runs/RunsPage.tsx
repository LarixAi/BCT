import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { DutyRecord } from '@/lib/api/types'
import { useOperationalContext } from '@/lib/context'

export function RunsPage() {
  const { operationalDateIso } = useOperationalContext()
  const [date, setDate] = useState(operationalDateIso)

  const { data: duties = [], isLoading, error, isError } = useQuery({
    queryKey: ['duties', date],
    queryFn: () => api.getDuties({ date }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Runs</h1>
          <p className="text-sm text-slate-600">
            Scheduled duties — the operational run unit in veymo
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <Link
            to="/dispatch"
            className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700"
          >
            Dispatch
          </Link>
        </div>
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load runs'}
        </p>
      )}

      <SectionCard title="Runs for selected date" description={`${duties.length} runs`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : duties.length === 0 ? (
          <p className="text-sm text-slate-500">No runs scheduled for this date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Reference</th>
                  <th className="pb-2 pr-4 font-medium">Route</th>
                  <th className="pb-2 pr-4 font-medium">Start</th>
                  <th className="pb-2 pr-4 font-medium">Driver</th>
                  <th className="pb-2 pr-4 font-medium">Vehicle</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {duties.map((duty) => (
                  <RunRow key={duty.id} duty={duty} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function RunRow({ duty }: { duty: DutyRecord }) {
  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
      <td className="py-2.5 pr-4">
        <Link to={`/runs/${duty.id}`} className="font-medium text-command-600 hover:underline">
          {duty.reference}
        </Link>
      </td>
      <td className="py-2.5 pr-4 text-slate-700">{duty.route?.name ?? '—'}</td>
      <td className="py-2.5 pr-4 tabular-nums text-slate-600">{duty.startTime ?? '—'}</td>
      <td className="py-2.5 pr-4 text-slate-600">
        {duty.driver ? `${duty.driver.firstName} ${duty.driver.lastName}` : '—'}
      </td>
      <td className="py-2.5 pr-4 text-slate-600">{duty.vehicle?.registrationNumber ?? '—'}</td>
      <td className="py-2.5">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
          {duty.status.replace(/_/g, ' ')}
        </span>
      </td>
    </tr>
  )
}
