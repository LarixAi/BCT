import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import type { ComplianceItemRecord } from '@/lib/api/types'
import { formatRoleList } from '@/lib/format'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function ComplianceRulesPage() {
  const [days, setDays] = useState(30)

  const { data: expiring, isLoading: expiringLoading } = useQuery({
    queryKey: tKey(['compliance-expiring', days]),
    queryFn: () => api.getComplianceExpiring(days),
  })

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: tKey(['compliance-settings']),
    queryFn: () => api.getComplianceAutomationSettings(),
  })

  const items = expiring?.items ?? []
  const expired = items.filter((i) => i.status === 'expired' || i.status === 'action_required').length
  const expiringSoon = items.filter((i) => i.status === 'expiring_soon').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Compliance Rules</h1>
        <p className="text-sm text-ink-soft">Document expiry monitoring and assignment enforcement settings</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Expiring / expired" value={items.length} />
        <StatCard label="Expired / action required" value={expired} />
        <StatCard label="Expiring soon" value={expiringSoon} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Automation settings" description="Enforcement rules applied at dispatch">
          {settingsLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : settings ? (
            <dl className="space-y-2 text-sm">
              <Row
                label="Warn before expiry"
                value={`${settings.warnDaysBeforeExpiry ?? 30} days`}
              />
              <Row
                label="Block assignment when expired"
                value={settings.blockAssignmentOnExpired ? 'Yes' : 'No'}
              />
              <Row
                label="Auto-unassign on expiry"
                value={settings.autoUnassignOnExpired ? 'Yes' : 'No'}
              />
              <Row label="Notify roles" value={formatRoleList(settings.notifyRoles)} />
            </dl>
          ) : (
            <p className="text-sm text-muted">Automation settings are not available for this company yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Filter window">
          <label className="text-sm text-ink-soft">
            Show documents expiring within
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="ml-2 rounded-lg border border-border px-2 py-1 text-sm"
            >
              {[14, 30, 60, 90].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>
        </SectionCard>
      </div>

      <SectionCard title="Expiring documents" description={`${items.length} items within ${days} days`}>
        {expiringLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">No documents expiring in this window.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-medium">Entity</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Document</th>
                <th className="pb-2 pr-4 font-medium">Expiry</th>
                <th className="pb-2 pr-4 font-medium">Days</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ComplianceRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}

function ComplianceRow({ item }: { item: ComplianceItemRecord }) {
  const href = item.entityType === 'vehicle' ? `/vehicles/${item.entityId}` : `/drivers/${item.entityId}`

  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
      <td className="py-2.5 pr-4">
        <Link to={href} className="font-medium text-command-600 hover:underline">
          {item.entityLabel}
        </Link>
      </td>
      <td className="py-2.5 pr-4 capitalize text-ink-soft">{item.entityType}</td>
      <td className="py-2.5 pr-4 text-ink-soft">{item.documentType}</td>
      <td className="py-2.5 pr-4 text-ink-soft">
        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : '—'}
      </td>
      <td className="py-2.5 pr-4 text-ink-soft">{item.daysUntilExpiry ?? '—'}</td>
      <td className="py-2.5">
        <StatusPill status={item.status} />
      </td>
    </tr>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium capitalize text-ink">{value}</dd>
    </div>
  )
}
