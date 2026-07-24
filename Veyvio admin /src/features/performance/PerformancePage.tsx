import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


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

  const { data: metrics, isLoading, isError, error } = useQuery({
    queryKey: tKey(['performance', from, to]),
    queryFn: () => api.getPerformanceMetrics({ from, to }),
  })

  const onTimePct = metrics?.onTimePct ?? 0
  const completedRuns = metrics?.completedRuns ?? 0
  const avgDelayMinutes = metrics?.avgDelayMinutes ?? 0
  const defectRate = metrics?.defectRate ?? 0
  const periodFrom = metrics?.period?.from ?? from
  const periodTo = metrics?.period?.to ?? to

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Performance</h1>
          <p className="text-sm text-ink-soft">Operational KPIs — on-time performance and reliability</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border px-3 py-1.5 text-sm" />
          <span className="text-sm text-muted">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border px-3 py-1.5 text-sm" />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : isError ? (
        <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load performance'}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="On-time %" value={`${onTimePct}%`} highlight />
            <KpiCard label="Completed runs" value={String(completedRuns)} />
            <KpiCard label="Avg delay" value={`${avgDelayMinutes} min`} />
            <KpiCard label="Defect rate" value={`${defectRate}%`} />
          </div>

          <SectionCard title="Period">
            <p className="text-sm text-ink-soft">
              {periodFrom} to {periodTo}
            </p>
          </SectionCard>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${highlight ? 'text-command-600' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  )
}
