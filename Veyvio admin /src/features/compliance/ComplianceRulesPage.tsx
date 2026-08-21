import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import type { ComplianceAutomationSettings, ComplianceItemRecord } from '@/lib/api/types'
import { formatRoleList } from '@/lib/format'
import { tKey } from '@/lib/tenant/tenant-query-scope'

const DRIVER_RULES: Array<{
  key: keyof ComplianceAutomationSettings
  label: string
  detail: string
}> = [
  { key: 'blockExpiredLicence', label: 'Block expired driving licence', detail: 'Hard gate on dispatch and sign-on' },
  { key: 'blockExpiredCpc', label: 'Block expired CPC', detail: 'Driver CPC card must be in date' },
  { key: 'blockExpiredDbs', label: 'Block expired DBS', detail: 'Safeguarding clearance must be valid' },
  { key: 'blockExpiredMedical', label: 'Block expired medical', detail: 'Group 2 medical certificate' },
]

const VEHICLE_RULES: Array<{
  key: keyof ComplianceAutomationSettings
  label: string
  detail: string
}> = [
  { key: 'blockExpiredMot', label: 'Block expired MOT', detail: 'Vehicle must have valid MOT' },
  { key: 'blockExpiredInsurance', label: 'Block expired insurance', detail: 'Fleet insurance must be in date' },
  { key: 'blockExpiredTax', label: 'Block expired road tax', detail: 'Tax status must be valid' },
  { key: 'blockExpiredPmi', label: 'Block overdue PMI', detail: 'Preventive inspection interval' },
  { key: 'blockOverdueService', label: 'Block overdue service', detail: 'Scheduled maintenance due' },
  { key: 'blockOverdueTyreRetorque', label: 'Block overdue tyre retorque', detail: 'Wheel security interval' },
]

const SAFETY_RULES: Array<{
  key: keyof ComplianceAutomationSettings
  label: string
  detail: string
}> = [
  { key: 'blockCriticalDefects', label: 'Block critical open defects', detail: 'Safety-critical defects block release' },
  { key: 'blockVorVehicles', label: 'Block VOR vehicles', detail: 'Vehicles off road cannot be assigned' },
  {
    key: 'requireTodaysCheckOnSignOn',
    label: "Require today's vehicle check before sign-on",
    detail: 'Driver must complete walkaround for assigned vehicle',
  },
  {
    key: 'defectAutomationEnabled',
    label: 'Auto yard follow-up on driver defects',
    detail: 'Creates yard tasks and status updates from driver reports',
  },
]

export function ComplianceRulesPage() {
  const queryClient = useQueryClient()
  const [days, setDays] = useState(30)
  const [draft, setDraft] = useState<ComplianceAutomationSettings | null>(null)
  const [saveMessage, setSaveMessage] = useState('')

  const { data: expiring, isLoading: expiringLoading } = useQuery({
    queryKey: tKey(['compliance-expiring', days]),
    queryFn: () => api.getComplianceExpiring(days),
  })

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: tKey(['compliance-settings']),
    queryFn: () => api.getComplianceAutomationSettings(),
  })

  useEffect(() => {
    if (settings) setDraft(settings)
  }, [settings])

  const saveSettings = useMutation({
    mutationFn: (patch: ComplianceAutomationSettings) => api.updateComplianceAutomationSettings(patch),
    onSuccess: (next) => {
      setDraft(next as ComplianceAutomationSettings)
      setSaveMessage('Rules saved — new assignments use these gates immediately.')
      void queryClient.invalidateQueries({ queryKey: tKey(['compliance-settings']) })
    },
    onError: (error: Error) => {
      setSaveMessage(error.message || 'Could not save compliance rules.')
    },
  })

  const items = expiring?.items ?? []
  const expired = items.filter((i) => i.status === 'expired' || i.status === 'action_required').length
  const expiringSoon = items.filter((i) => i.status === 'expiring_soon').length
  const dirty = draft && settings ? JSON.stringify(draft) !== JSON.stringify(settings) : false

  function toggleRule(key: keyof ComplianceAutomationSettings) {
    if (!draft) return
    setDraft({ ...draft, [key]: !draft[key] })
    setSaveMessage('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Compliance rules</h1>
        <p className="text-sm text-ink-soft">
          Company-configurable hard gates for dispatch, sign-on, and document expiry (F-05)
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Expiring / expired" value={items.length} />
        <StatCard label="Expired / action required" value={expired} />
        <StatCard label="Expiring soon" value={expiringSoon} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Assignment enforcement"
          description="Hard gates applied when publishing duties or assigning vehicles"
        >
          {settingsLoading || !draft ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <div className="space-y-6">
              <RuleGroup title="Driver documents" rules={DRIVER_RULES} draft={draft} onToggle={toggleRule} />
              <RuleGroup title="Vehicle compliance" rules={VEHICLE_RULES} draft={draft} onToggle={toggleRule} />
              <RuleGroup title="Safety & sign-on" rules={SAFETY_RULES} draft={draft} onToggle={toggleRule} />

              <dl className="space-y-2 border-t border-border pt-4 text-sm">
                <Row label="Warn before expiry" value={`${draft.warnDaysBeforeExpiry ?? 30} days`} />
                <Row
                  label="Legacy block on expired"
                  value={draft.blockAssignmentOnExpired ? 'Yes' : 'No'}
                />
                <Row label="Notify roles" value={formatRoleList(draft.notifyRoles ?? [])} />
              </dl>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!dirty || saveSettings.isPending}
                  onClick={() => saveSettings.mutate(draft)}
                  className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saveSettings.isPending ? 'Saving…' : 'Save rules'}
                </button>
                {dirty ? (
                  <button
                    type="button"
                    className="text-sm text-muted hover:text-ink"
                    onClick={() => {
                      setDraft(settings ?? null)
                      setSaveMessage('')
                    }}
                  >
                    Reset changes
                  </button>
                ) : null}
                {saveMessage ? <p className="text-sm text-ink-soft">{saveMessage}</p> : null}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Expiry window">
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
          <p className="mt-3 text-xs text-muted">
            Use{' '}
            <Link to="/drivers" className="text-command-600 hover:underline">
              Drivers
            </Link>{' '}
            and{' '}
            <Link to="/vehicles" className="text-command-600 hover:underline">
              Vehicles
            </Link>{' '}
            to update document dates at source.
          </p>
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

function RuleGroup({
  title,
  rules,
  draft,
  onToggle,
}: {
  title: string
  rules: Array<{ key: keyof ComplianceAutomationSettings; label: string; detail: string }>
  draft: ComplianceAutomationSettings
  onToggle: (key: keyof ComplianceAutomationSettings) => void
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <ul className="space-y-2">
        {rules.map((rule) => (
          <li key={String(rule.key)} className="flex items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-ink">{rule.label}</p>
              <p className="text-xs text-muted">{rule.detail}</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={Boolean(draft[rule.key])}
                onChange={() => onToggle(rule.key)}
                className="h-4 w-4 rounded border-border"
              />
              {draft[rule.key] ? 'On' : 'Off'}
            </label>
          </li>
        ))}
      </ul>
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
