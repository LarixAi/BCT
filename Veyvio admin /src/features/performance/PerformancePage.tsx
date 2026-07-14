import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'

function monthStartIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function PerformancePage() {
  const [from, setFrom] = useState(monthStartIso())
  const [to, setTo] = useState(todayIso())

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['performance', from, to],
    queryFn: () => api.getPerformanceMetrics({ from, to }),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Performance</h1>
          <p className="text-sm text-slate-600">Operational KPIs — on-time performance and reliability</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
          <span className="text-sm text-slate-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : metrics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="On-time %" value={`${metrics.onTimePct}%`} highlight />
            <KpiCard label="Completed runs" value={String(metrics.completedRuns)} />
            <KpiCard label="Avg delay" value={`${metrics.avgDelayMinutes} min`} />
            <KpiCard label="Defect rate" value={`${metrics.defectRate}%`} />
          </div>

          <SectionCard title="Period">
            <p className="text-sm text-slate-600">
              {metrics.period.from} to {metrics.period.to}
            </p>
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${highlight ? 'text-command-600' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  )
}
