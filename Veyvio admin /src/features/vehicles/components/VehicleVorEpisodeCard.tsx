import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { normalizeVorRecord, type VehicleVorRecord } from '@/lib/vehicles/types'

function money(value: number | null | undefined) {
  if (value == null) return '—'
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function VehicleVorEpisodeCard({ record }: { record: VehicleVorRecord }) {
  const vor = normalizeVorRecord(record)
  const open = !vor.resolvedAt

  return (
    <SectionCard
      title={open ? 'Active VOR episode' : 'VOR episode'}
      description={open ? 'Vehicle is off the road — work and cost must be recorded before return' : 'Closed episode retained on the vehicle history'}
    >
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={open ? 'vor' : 'compliant'} />
          <p className="font-medium text-slate-900">{vor.reason ?? 'VOR episode'}</p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Opened</dt>
            <dd>
              {new Date(vor.reportedAt).toLocaleString('en-GB')}
              <span className="block text-xs text-slate-500">{vor.reportedBy}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Category</dt>
            <dd>{(vor.category ?? '—').replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Location</dt>
            <dd>{vor.location ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Diagnosis</dt>
            <dd>{vor.diagnosis ?? '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Work performed</dt>
            <dd>{vor.workPerformed ?? (open ? 'Not recorded yet' : '—')}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Labour</dt>
            <dd className="tabular-nums">{money(vor.labourCost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Parts</dt>
            <dd className="tabular-nums">{money(vor.partsCost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">External</dt>
            <dd className="tabular-nums">{money(vor.externalCost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Total cost</dt>
            <dd className="font-semibold tabular-nums">{money(vor.totalCost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Downtime</dt>
            <dd className="tabular-nums">
              {vor.downtimeHours != null ? `${vor.downtimeHours} h` : open ? 'In progress' : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Returned to road</dt>
            <dd>
              {vor.returnedToRoadAt ? new Date(vor.returnedToRoadAt).toLocaleString('en-GB') : '—'}
              {vor.returnedToRoadBy ? (
                <span className="block text-xs text-slate-500">{vor.returnedToRoadBy}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Return mileage</dt>
            <dd className="tabular-nums">
              {vor.returnMileage != null ? `${vor.returnMileage.toLocaleString('en-GB')} mi` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Verification</dt>
            <dd>
              {vor.verificationResult ?? '—'}
              {vor.verifiedBy ? (
                <span className="block text-xs text-slate-500">
                  {vor.verifiedBy}
                  {vor.verificationMethod ? ` · ${vor.verificationMethod}` : ''}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
        {vor.workOrderIds && vor.workOrderIds.length > 0 && (
          <p className="text-xs text-slate-500">Linked work orders: {vor.workOrderIds.join(', ')}</p>
        )}
        {vor.preventiveAction && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            Preventive action: {vor.preventiveAction}
          </p>
        )}
      </div>
    </SectionCard>
  )
}
