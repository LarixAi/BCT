import { Link } from 'react-router-dom'
import { ArrowLeft, Info } from 'lucide-react'
import type { ReportSummaryView } from '@/lib/reports/types'
import { ReportFiltersBar } from './ReportFiltersBar'

export function ReportPageShell({
  title,
  subtitle,
  from,
  to,
  onFromChange,
  onToChange,
  summary,
  loading,
  operationalDate,
  relatedLinks = [],
}: {
  title: string
  subtitle: string
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  summary: ReportSummaryView | null
  loading: boolean
  operationalDate: string
  relatedLinks?: { label: string; href: string }[]
}) {
  return (
    <div className="space-y-6">
      <header>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Reports
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {subtitle}
          {summary ? ` · ${summary.depotLabel}` : ''} · {operationalDate}
        </p>
        {summary ? (
          <p className="mt-1 text-xs text-muted">
            Generated {new Date(summary.generatedAt).toLocaleString('en-GB')}
          </p>
        ) : null}
      </header>

      <ReportFiltersBar from={from} to={to} onFromChange={onFromChange} onToChange={onToChange} />

      {loading && !summary ? <p className="text-sm text-muted">Building report…</p> : null}

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
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-surface px-3 py-2.5 text-sm hover:bg-amber-50"
                    >
                      <span className="font-medium text-ink">{item.label}</span>
                      <span
                        className={`tabular-nums text-sm font-bold ${
                          item.severity === 'critical'
                            ? 'text-red-700'
                            : item.severity === 'warning'
                              ? 'text-amber-800'
                              : 'text-ink-soft'
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
            <h2 className="text-sm font-semibold text-ink">Totals</h2>
            <p className="mt-1 text-xs text-muted">Select a number to open the underlying records.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {summary.metrics.map((metric) => (
                <Link
                  key={metric.key}
                  to={metric.href}
                  className="rounded-xl border border-border bg-surface p-4 shadow-sm hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      {metric.label}
                    </p>
                    {metric.gap ? (
                      <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
                        Gap
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
                    {Number.isInteger(metric.value) ? metric.value : metric.value.toFixed(1)}
                  </p>
                  {metric.note ? (
                    <p className="mt-2 text-xs text-muted">{metric.note}</p>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-muted">Open records →</p>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-ink-soft" />
                <h2 className="text-sm font-semibold text-ink">Data quality</h2>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                {summary.dataQuality.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold text-ink">How this report is built</h2>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                {summary.sourceNotes.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {relatedLinks.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {relatedLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-muted"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
