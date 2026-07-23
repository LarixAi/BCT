import { Link } from 'react-router-dom'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import { TRAINING_STATUS_LABELS } from '@/lib/staff/constants'
import type { StaffHubData } from '@/lib/staff/types'

export function StaffTrainingTab({ hub }: { hub: StaffHubData }) {
  const { trainingCompliance, trainingGaps, requirementCatalog } = hub

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Staff with gaps" value={trainingCompliance.staffWithGaps} />
        <SummaryCard label="Expiring soon" value={trainingCompliance.expiringSoon} />
        <SummaryCard label="Access blocked" value={trainingCompliance.accessBlocked} />
        <SummaryCard label="Awaiting verification" value={trainingCompliance.awaitingVerification} />
      </div>

      <SectionCard title="Compliance gaps" description="Missing, expired, or unverified training by person">
        {trainingGaps.length === 0 ? (
          <p className="text-sm text-muted">No training actions required.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-3 font-medium">Staff member</th>
                <th className="pb-2 pr-3 font-medium">Requirement</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Expires</th>
                <th className="pb-2 font-medium">Access</th>
              </tr>
            </thead>
            <tbody>
              {trainingGaps.map((gap) => (
                <tr key={`${gap.staffId}-${gap.requirementKey}`} className="border-b border-border/60">
                  <td className="py-2.5 pr-3">
                    <Link to={`/staff/${gap.staffId}?tab=training`} className="font-medium text-command-600 hover:underline">
                      {gap.staffName}
                    </Link>
                    <p className="text-xs text-muted">{gap.roleLabel}</p>
                  </td>
                  <td className="py-2.5 pr-3">{gap.requirementLabel}</td>
                  <td className="py-2.5 pr-3">
                    <StatusPill status={gap.status} />
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">{formatDate(gap.expiryDate)}</td>
                  <td className="py-2.5 text-xs text-ink-soft">
                    {gap.blocksAccess ? <span className="text-red-700">Restricted</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Requirement catalogue" description="Training rules by role, department and application access">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="pb-2 pr-3 font-medium">Training</th>
              <th className="pb-2 pr-3 font-medium">Category</th>
              <th className="pb-2 pr-3 font-medium">Required for</th>
              <th className="pb-2 font-medium">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {requirementCatalog.map((req) => (
              <tr key={req.key} className="border-b border-border/60">
                <td className="py-2.5 pr-3 font-medium">{req.label}</td>
                <td className="py-2.5 pr-3 capitalize text-ink-soft">{req.category}</td>
                <td className="py-2.5 pr-3 text-ink-soft">{req.requiredFor}</td>
                <td className="py-2.5 text-ink-soft">{req.renewalMonths ? `${req.renewalMonths} months` : 'One-off'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="Staff by training status" description="Directory filtered to training issues">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted">
              <th className="pb-2 pr-3 font-medium">Staff member</th>
              <th className="pb-2 pr-3 font-medium">Role</th>
              <th className="pb-2 font-medium">Training status</th>
            </tr>
          </thead>
          <tbody>
            {hub.rows
              .filter((r) => r.trainingStatus !== 'valid' && r.trainingStatus !== 'not_required')
              .map((row) => (
                <tr key={row.staffId} className="border-b border-border/60">
                  <td className="py-2.5 pr-3">
                    <Link to={`/staff/${row.staffId}?tab=training`} className="font-medium text-command-600 hover:underline">
                      {row.firstName} {row.lastName}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">{row.roleLabel}</td>
                  <td className="py-2.5">{TRAINING_STATUS_LABELS[row.trainingStatus]}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold text-ink">{value}</p>
    </div>
  )
}
