import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import type { YardBodyworkReport, YardHubData } from '@/lib/yard/types'

const ZONE_LABELS: Record<string, string> = {
  front: 'Front',
  nearside: 'Nearside',
  offside: 'Offside',
  rear: 'Rear',
  roof: 'Roof',
  doors: 'Doors / panels',
}

const DAMAGE_LABELS: Record<string, string> = {
  dent: 'Dent',
  scratch: 'Scratch / scrape',
  crack: 'Crack',
  sharp_edge: 'Sharp edge',
  loose_panel: 'Loose panel',
  other: 'Other',
  bodywork: 'Bodywork',
}

export function YardBodyworkTab({ hub }: { hub: YardHubData }) {
  const reports = hub.bodyworkReports ?? []

  return (
    <SectionCard title="Driver bodywork reports">
      <p className="mb-3 text-sm text-ink-soft">
        Damage photographed during the Driver vehicle check. Open the defect to triage; photos stay on the record for
        Yard condition review.
      </p>
      {reports.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-6 text-center text-sm text-ink-soft">
          No open bodywork reports from drivers. When a driver marks bodywork damage and uploads a photo, it appears
          here and on Defects.
        </p>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => (
            <BodyworkReportCard key={report.id} report={report} />
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function BodyworkReportCard({ report }: { report: YardBodyworkReport }) {
  const zone = report.zone ? ZONE_LABELS[report.zone] ?? report.zone : null
  const damage = report.damageType ? DAMAGE_LABELS[report.damageType] ?? report.damageType : null

  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold tabular-nums text-ink">{report.registrationNumber}</p>
          <p className="text-xs text-muted">
            {report.defectRef}
            {report.fleetNumber ? ` · Fleet ${report.fleetNumber}` : ''}
            {report.reportedAt
              ? ` · ${new Date(report.reportedAt).toLocaleString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''}
          </p>
          <p className="mt-2 text-sm text-ink">{report.description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {zone ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-ink-soft">Zone: {zone}</span>
            ) : null}
            {damage ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900">
                {damage}
              </span>
            ) : null}
            <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium capitalize text-red-800">
              {report.severity}
            </span>
          </div>
        </div>
        <Link
          to={report.href || `/defects/${report.id}`}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-command-700 hover:bg-surface-muted"
        >
          Open defect
        </Link>
      </div>
      {report.photoDataUrl ? (
        <img
          src={report.photoDataUrl}
          alt={`Bodywork evidence for ${report.registrationNumber}`}
          className="mt-3 max-h-56 w-full rounded-lg object-cover"
        />
      ) : (
        <p className="mt-3 text-xs text-muted">Photo attached on the defect record.</p>
      )}
    </li>
  )
}
