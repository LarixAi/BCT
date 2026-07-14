import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import type { DefectSourceRecord } from '@/lib/defects/types'

const SOURCE_TYPE_LABELS: Record<DefectSourceRecord['type'], string> = {
  vehicle_check: 'Vehicle check',
  yard_inspection: 'Yard inspection',
  maintenance_job: 'Maintenance job',
  incident: 'Incident',
  manual: 'Manual report',
  telematics: 'Telematics',
}

export function DefectSourcePanel({ source }: { source: DefectSourceRecord }) {
  return (
    <SectionCard title="Source record" description="Original report that created this defect">
      <dl className="space-y-2 text-sm" data-testid="defect-source-record">
        <Row label="Origin" value={SOURCE_TYPE_LABELS[source.type]} />
        <Row label="Reference" value={source.reference} />
        <Row label="Report" value={source.label} />
        <Row label="Reporter" value={source.reporterName} />
        <Row label="Reported at" value={new Date(source.reportedAt).toLocaleString('en-GB')} />
        {source.href && (
          <div className="pt-2">
            <Link to={source.href} className="text-sm font-medium text-command-600 hover:underline">
              View source record →
            </Link>
          </div>
        )}
      </dl>
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
