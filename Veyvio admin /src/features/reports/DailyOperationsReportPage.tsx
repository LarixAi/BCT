import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { ArrowLeft, Info } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useOperationalContext } from '@/lib/context'
import { buildDailyOperationsSummary } from '@/lib/reports/build-daily-operations'
import { ReportFiltersBar } from './ReportFiltersBar'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function DailyOperationsReportPage() {
  const { depotId, depots, operationalDate } = useOperationalContext()
  const [from, setFrom] = useState(todayIso)
  const [to, setTo] = useState(todayIso)

  const yardDepot = depotId && depotId !== 'all' ? depotId : undefined

  const results = useQueries({
    queries: [
      { queryKey: ['dashboard'], queryFn: () => api.getDashboard() },
      {
        queryKey: ['duties', 'report', from, to],
        queryFn: () => api.getDuties({ from, to }),
      },
      {
        queryKey: ['live-dispatch', 'active'],
        queryFn: () => api.getLiveDispatch(undefined, 'active'),
      },
      { queryKey: ['checks-hub'], queryFn: () => api.getChecksHub() },
      { queryKey: ['defects-hub'], queryFn: () => api.getDefectsHub() },
      {
        queryKey: ['driver-directory-summary'],
        queryFn: () => api.getDriverDirectorySummary(),
      },
      {
        queryKey: ['vehicle-directory-summary'],
        queryFn: () => api.getVehicleDirectorySummary(),
      },
      {
        queryKey: ['yard-hub', yardDepot ?? 'default'],
        queryFn: () => api.getYardHub(yardDepot),
      },
    ],
  })

  const [
    dashboardQ,
    dutiesQ,
    liveQ,
    checksQ,
    defectsQ,
    driversQ,
    vehiclesQ,
    yardQ,
  ] = results

  const isLoading = results.some((r) => r.isLoading)
  const depotLabel = depots.find((d) => d.id === depotId)?.name ?? 'All depots'

  const summary = useMemo(() => {
    if (isLoading && !dutiesQ.data && !dashboardQ.data) return null
    return buildDailyOperationsSummary({
      from,
      to,
      depotLabel,
      dashboard: dashboardQ.data,
      duties: dutiesQ.data,
      live: liveQ.data,
      checks: checksQ.data,
      defects: defectsQ.data,
      drivers: driversQ.data,
      vehicles: vehiclesQ.data,
      yard: yardQ.data,
    })
  }, [
    isLoading,
    from,
    to,
    depotLabel,
    dashboardQ.data,
    dutiesQ.data,
    liveQ.data,
    checksQ.data,
    defectsQ.data,
    driversQ.data,
    vehiclesQ.data,
    yardQ.data,
  ])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/reports"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Reports
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Daily operations summary</h1>
          <p className="mt-1 text-sm text-slate-600">
            Management view of planned work, safety blockers and fleet position · {depotLabel} ·{' '}
            {operationalDate}
          </p>
          {summary ? (
            <p className="mt-1 text-xs text-slate-500">
              Generated {new Date(summary.generatedAt).toLocaleString('en-GB')}
            </p>
          ) : null}
        </div>
      </header>

      <ReportFiltersBar from={from} to={to} onFromChange={setFrom} onToChange={setTo} />

      {isLoading && !summary ? (
        <p className="text-sm text-slate-500">Building daily operations summary…</p>
      ) : null}

      {summary ? (
        <>
          {summary.attention.length > 0 ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <h2 className="text-sm font-semibold text-amber-950">Requires attention</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {summary.attention.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-white px-3 py-2.5 text-sm hover:bg-amber-50"
                    >
                      <span className="font-medium text-slate-900">{item.label}</span>
                      <span
                        className={`tabular-nums text-sm font-bold ${
                          item.severity === 'critical'
                            ? 'text-red-700'
                            : item.severity === 'warning'
                              ? 'text-amber-800'
                              : 'text-slate-600'
                        }`}
                      >
                        {item.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-sm font-semibold text-slate-900">Operational totals</h2>
            <p className="mt-1 text-xs text-slate-500">
              Select any number to open the underlying records in Command.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {summary.metrics.map((metric) => (
                <Link
                  key={metric.key}
                  to={metric.href}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {metric.label}
                    </p>
                    {metric.gap ? (
                      <span className="rounded-full border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                        Gap
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{metric.value}</p>
                  {metric.note ? (
                    <p className="mt-2 text-xs text-slate-500">{metric.note}</p>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-slate-500">Open records →</p>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Data quality</h2>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {summary.dataQuality.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-slate-900">How this report is built</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {summary.sourceNotes.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/overview"
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Control centre
                </Link>
                <Link
                  to="/exceptions"
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Exceptions
                </Link>
                <Link
                  to="/live-operations"
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Live operations
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
