import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { buildEvidenceQueue } from '@/lib/maintenance/evidence-queue'
import { COMPANY_DEFAULT_PMI_WEEKS, OLD_VEHICLE_MAX_PMI_WEEKS } from '@/lib/maintenance/pmi'
import type { MaintenanceHubData } from '@/lib/maintenance/types'
import type { VehicleProfile } from '@/lib/vehicles/types'

export function MaintenanceComplianceTab({
  hub,
  vehicles = [],
}: {
  hub: MaintenanceHubData
  vehicles?: VehicleProfile[]
}) {
  const risk = hub.summary.maintenanceRisk
  const evidenceQueue = useMemo(
    () => buildEvidenceQueue(vehicles, hub.workOrders, hub.schedule),
    [vehicles, hub.workOrders, hub.schedule],
  )

  return (
    <div className="space-y-4">
      <SectionCard title="Interval policy" description="Defined here for operators; Compliance Rules will own formal config later">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Company default PMI</dt>
            <dd className="font-medium text-ink">Every {COMPANY_DEFAULT_PMI_WEEKS} weeks</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Vehicles 12+ years</dt>
            <dd className="font-medium text-ink">Maximum {OLD_VEHICLE_MAX_PMI_WEEKS} weeks (DVSA guidance)</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Record retention</dt>
            <dd className="font-medium text-ink">At least 15 months (company may retain longer)</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Release rule</dt>
            <dd className="font-medium text-ink">
              Available only when PMI not overdue, no safety-critical defects, no VOR, maintenance release approved, yard
              return complete
            </dd>
          </div>
        </dl>
        <Link to="/compliance-rules" className="mt-3 inline-block text-sm font-medium text-command-600 hover:underline">
          Open Compliance Rules →
        </Link>
      </SectionCard>

      <SectionCard title="Compliance pressure" description="Missing evidence and overdue controls">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Meta label="Overdue services / PMI" value={String(risk.overdueServices)} />
          <Meta label="Safety-critical defects" value={String(risk.safetyCriticalDefects)} />
          <Meta label="MOT approaching" value={String(risk.motApproaching)} />
          <Meta label="Tacho approaching" value={String(risk.tachoApproaching)} />
          <Meta label="Repeat defect vehicles" value={String(risk.repeatDefectVehicles)} />
          <Meta label="Missing PMI evidence" value={String(risk.missingEvidence)} />
        </dl>
      </SectionCard>

      <SectionCard title="Missing evidence queue" description="Items that block a complete maintenance record">
        {evidenceQueue.length === 0 ? (
          <p className="text-sm text-muted">No open evidence gaps on the current fleet snapshot.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {evidenceQueue.map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm">
                <div>
                  <Link to={item.href} className="font-medium text-command-600 hover:underline">
                    {item.registrationNumber}
                  </Link>
                  <p className="text-ink">{item.title}</p>
                  <p className="text-xs text-muted">{item.detail}</p>
                  {item.kind === 'missing_brake_evidence' && (
                    <p className="mt-0.5 text-xs font-medium text-red-800">Brake evidence required</p>
                  )}
                </div>
                <Link to={item.href} className="text-xs font-medium text-command-600 hover:underline">
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Brake evidence gaps"
        description="Safety Inspection / PMI items that need brake performance print or document"
      >
        {evidenceQueue.filter((i) => i.kind === 'missing_brake_evidence').length === 0 ? (
          <p className="text-sm text-muted">No open brake evidence gaps.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {evidenceQueue
              .filter((i) => i.kind === 'missing_brake_evidence')
              .map((item) => (
                <li key={`brake-${item.id}`} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <Link to={item.href} className="font-medium text-command-600 hover:underline">
                    {item.registrationNumber}
                  </Link>
                  <p className="text-red-950">{item.detail}</p>
                </li>
              ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Yard presentation / return" description="Physical loop — Yard owns location; Maintenance owns technical release">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
          <li>Maintenance books workshop window</li>
          <li>Yard prepares vehicle, captures mileage, hands over keys</li>
          <li>Workshop completes inspection / repair with evidence</li>
          <li>Maintenance authorises return-to-service</li>
          <li>Yard receives vehicle and completes receiving check</li>
          <li>Dispatch sees updated readiness</li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/yard?task=prepare_for_service&tab=tasks"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Prepare for workshop →
          </Link>
          <Link
            to="/yard?task=return_inspection&tab=tasks"
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Return from workshop →
          </Link>
          <Link to="/yard" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-command-600 hover:bg-surface-muted">
            Open Yard Operations →
          </Link>
        </div>
      </SectionCard>

      {hub.downtime && (
        <SectionCard title="Downtime snapshot">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Meta label="Avg downtime (h)" value={String(hub.downtime.averageDowntimeHours)} />
            <Meta label="On downtime" value={String(hub.downtime.vehiclesOnDowntime)} />
            <Meta label="Repeat VOR" value={String(hub.downtime.repeatVorEvents)} />
            <Meta label="Parts wait (h)" value={String(hub.downtime.averagePartsWaitHours)} />
          </dl>
        </SectionCard>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  )
}
