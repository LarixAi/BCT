import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileBarChart,
  Bookmark,
} from 'lucide-react'
import { api } from '@/lib/api/client'
import { useOperationalContext } from '@/lib/context'
import {
  INITIAL_KEY_REPORT_IDS,
  REPORT_CATEGORIES,
  REPORT_DEFINITIONS,
  SAVED_REPORT_STUBS,
  SCHEDULED_REPORT_STUBS,
  reportsInCategory,
} from '@/lib/reports/report-catalog'
import type { ReportAvailability, ReportCategoryId } from '@/lib/reports/types'
import { TransfersReportSection } from '@/features/transfers/TransfersReportSection'
import { ReportFiltersBar } from './ReportFiltersBar'

function monthStartIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function availabilityLabel(status: ReportAvailability) {
  if (status === 'live') return { text: 'Live', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
  if (status === 'partial') return { text: 'Partial', className: 'bg-amber-50 text-amber-900 border-amber-200' }
  return { text: 'Planned', className: 'bg-slate-100 text-slate-600 border-slate-200' }
}

export function ReportsPage() {
  const { operationalDate, depotId, depots } = useOperationalContext()
  const [from, setFrom] = useState(monthStartIso)
  const [to, setTo] = useState(todayIso)
  const [category, setCategory] = useState<ReportCategoryId | 'all'>('all')

  const { data: summary, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ['reports-summary', from, to],
    queryFn: () => api.getReportsSummary({ from, to }),
  })

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  })

  const depotLabel = depots.find((d) => d.id === depotId)?.name ?? 'All depots'
  const catalog = useMemo(() => reportsInCategory(category), [category])
  const keyReports = REPORT_DEFINITIONS.filter((r) =>
    (INITIAL_KEY_REPORT_IDS as readonly string[]).includes(r.id),
  )

  const attention = useMemo(() => {
    const items: { id: string; label: string; href: string; tone: 'critical' | 'warning' | 'info' }[] = []
    if ((summary?.safety.openDefects ?? 0) > 0) {
      items.push({
        id: 'defects',
        label: `${summary!.safety.openDefects} open defects`,
        href: '/defects',
        tone: 'warning',
      })
    }
    if ((summary?.safety.openIncidents ?? 0) > 0) {
      items.push({
        id: 'incidents',
        label: `${summary!.safety.openIncidents} open incidents`,
        href: '/incidents',
        tone: 'warning',
      })
    }
    if ((dashboard?.expiringDocuments ?? 0) > 0) {
      items.push({
        id: 'docs',
        label: `${dashboard!.expiringDocuments} documents expiring soon`,
        href: '/drivers',
        tone: 'info',
      })
    }
    if ((dashboard?.vehiclesOffRoad ?? 0) > 0) {
      items.push({
        id: 'vor',
        label: `${dashboard!.vehiclesOffRoad} vehicles off road`,
        href: '/vehicles/vor',
        tone: 'critical',
      })
    }
    for (const alert of dashboard?.alerts ?? []) {
      if (items.length >= 6) break
      items.push({
        id: `a-${alert.title}`,
        label: alert.title,
        href: alert.href || '/overview',
        tone: alert.severity === 'danger' ? 'critical' : 'warning',
      })
    }
    if (items.length === 0) {
      items.push({
        id: 'clear',
        label: 'No reporting attention items from current hubs',
        href: '/reports/daily-operations',
        tone: 'info',
      })
    }
    return items
  }, [summary, dashboard])

  const refreshLabel = dataUpdatedAt
    ? `Last refresh ${new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : 'Waiting for data'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reporting centre</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Shared Command reporting from Driver, Yard, Maintenance and Admin actions · {depotLabel} ·{' '}
            {operationalDate}
          </p>
          <p className="mt-1 text-xs text-slate-500">{refreshLabel}</p>
        </div>
        <Link
          to="/reports/daily-operations"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Open daily operations
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <ReportFiltersBar from={from} to={to} onFromChange={setFrom} onToChange={setTo} />

      {isError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load reports summary'}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Duties in period"
          value={isLoading ? '…' : summary?.operations.dutiesInPeriod ?? 0}
          href="/reports/daily-operations"
        />
        <Kpi
          label="Open defects"
          value={isLoading ? '…' : summary?.safety.openDefects ?? 0}
          href="/defects"
        />
        <Kpi
          label="Open incidents"
          value={isLoading ? '…' : summary?.safety.openIncidents ?? 0}
          href="/incidents"
        />
        <Kpi
          label="Fleet (vehicles / drivers)"
          value={
            isLoading
              ? '…'
              : `${summary?.fleet.vehicles ?? 0} / ${summary?.fleet.drivers ?? 0}`
          }
          href="/vehicles"
        />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900">Key reports</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {keyReports.map((report) => {
            const badge = availabilityLabel(report.availability)
            const clickable = report.availability !== 'planned'
            const body = (
              <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <FileBarChart className="h-5 w-5 text-slate-700" />
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                    {badge.text}
                  </span>
                </div>
                <p className="mt-3 font-semibold text-slate-900">{report.title}</p>
                <p className="mt-1 flex-1 text-sm text-slate-600">{report.description}</p>
                {report.id === 'daily-operations' && summary ? (
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {summary.operations.dutiesInPeriod} duties · {summary.safety.openDefects} open defects
                  </p>
                ) : null}
                {report.id === 'fleet-availability' && dashboard ? (
                  <p className="mt-3 text-xs font-medium text-slate-500">
                    {dashboard.vehiclesInService} in service · {dashboard.vehiclesOffRoad} off road
                  </p>
                ) : null}
              </div>
            )
            return clickable ? (
              <Link key={report.id} to={report.href}>
                {body}
              </Link>
            ) : (
              <div key={report.id} className="opacity-80">
                {body}
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Requires attention</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {attention.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <span className="text-slate-800">{item.label}</span>
                  <span
                    className={
                      item.tone === 'critical'
                        ? 'text-xs font-semibold text-red-700'
                        : item.tone === 'warning'
                          ? 'text-xs font-semibold text-amber-700'
                          : 'text-xs font-semibold text-slate-500'
                    }
                  >
                    Open
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">Data quality</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Passenger outcomes (boarded / no-show / handover) are not yet in shared reporting.</li>
            <li>On-time % and contract SLA are partial until stop events and contract joins land.</li>
            <li>Scheduled report delivery is stubbed — cadence shown for the later jobs layer.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">Saved reports</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {SAVED_REPORT_STUBS.map((item) => (
              <li key={item.id}>
                <Link to={item.href} className="block rounded-lg px-2 py-2 text-sm text-slate-800 hover:bg-slate-50">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">Scheduled reports</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {SCHEDULED_REPORT_STUBS.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg px-2 py-2">
                <div>
                  <Link to={item.href} className="text-sm font-medium text-slate-900 hover:underline">
                    {item.title}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 className="h-3 w-3" />
                    {item.cadence}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  Soon
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <TransfersReportSection from={from} to={to} />

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Report catalogue</h2>
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip label="All" active={category === 'all'} onClick={() => setCategory('all')} />
            {REPORT_CATEGORIES.map((c) => (
              <CategoryChip
                key={c.id}
                label={c.label}
                active={category === c.id}
                onClick={() => setCategory(c.id)}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Report</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {catalog.map((report) => {
                const badge = availabilityLabel(report.availability)
                const categoryLabel =
                  REPORT_CATEGORIES.find((c) => c.id === report.category)?.label ?? report.category
                return (
                  <tr key={report.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{report.title}</p>
                      <p className="text-xs text-slate-500">{report.description}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{categoryLabel}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {report.availability === 'planned' ? (
                        <span className="text-xs text-slate-400">Not built yet</span>
                      ) : (
                        <Link to={report.href} className="text-sm font-semibold text-slate-900 hover:underline">
                          Open
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  href,
}: {
  label: string
  value: string | number
  href: string
}) {
  return (
    <Link to={href} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">View records →</p>
    </Link>
  )
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  )
}
