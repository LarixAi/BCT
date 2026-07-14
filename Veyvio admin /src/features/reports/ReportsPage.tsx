import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { TransfersReportSection } from '@/features/transfers/TransfersReportSection'
import { api } from '@/lib/api/client'

function monthStartIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function ReportsPage() {
  const [from, setFrom] = useState(monthStartIso())
  const [to, setTo] = useState(todayIso())

  const { data: summary, isLoading, error, isError } = useQuery({
    queryKey: ['reports-summary', from, to],
    queryFn: () => api.getReportsSummary({ from, to }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-600">Operational summary for the selected period</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <span className="text-sm text-slate-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load reports'}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : summary ? (
        <>
          <p className="text-xs text-slate-500">
            Generated {new Date(summary.generatedAt).toLocaleString('en-GB')}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Vehicles" value={summary.fleet.vehicles} />
            <KpiCard label="Drivers" value={summary.fleet.drivers} />
            <KpiCard label="Customers" value={summary.customers} />
            <KpiCard label="Duties in period" value={summary.operations.dutiesInPeriod} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Safety">
              <dl className="space-y-3 text-sm">
                <MetricRow label="Open defects" value={summary.safety.openDefects} />
                <MetricRow label="Open incidents" value={summary.safety.openIncidents} />
              </dl>
            </SectionCard>

            <SectionCard title="Period">
              <dl className="space-y-3 text-sm">
                <MetricRow label="From" value={summary.period.from} />
                <MetricRow label="To" value={summary.period.to} />
              </dl>
            </SectionCard>
          </div>

          <TransfersReportSection from={from} to={to} />
        </>
      ) : null}
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900">{value}</dd>
    </div>
  )
}
