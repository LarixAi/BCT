import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/api/client'
import type { PlatformCompanyDetail, PlatformPlanRow } from '@/lib/api/types'
import { PLATFORM_MODULES } from '@/lib/platform/modules'
import { BillingPlaceholder } from './BillingPlaceholder'
import { PlatformShell } from './PlatformShell'

export function PlatformCompanyDetailPage() {
  const { companyId = '' } = useParams()
  const [detail, setDetail] = useState<PlatformCompanyDetail | null>(null)
  const [plans, setPlans] = useState<PlatformPlanRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [planCode, setPlanCode] = useState('professional')
  const [grantReason, setGrantReason] = useState('')
  const [grantTicket, setGrantTicket] = useState('')
  const [grantMinutes, setGrantMinutes] = useState(60)
  const [grantLevel, setGrantLevel] = useState('read_only')

  const overrideMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const row of detail?.moduleOverrides ?? []) map.set(row.moduleKey, row.enabled)
    return map
  }, [detail?.moduleOverrides])

  const load = async () => {
    if (!companyId) return
    setError(null)
    try {
      const [company, planRows] = await Promise.all([
        api.getPlatformCompany(companyId),
        api.listPlatformPlans(),
      ])
      setDetail(company)
      setPlans(planRows)
      setPlanCode(company.planCode ?? 'professional')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load company')
    }
  }

  useEffect(() => {
    void load()
  }, [companyId])

  const patch = async (body: Parameters<typeof api.patchPlatformCompany>[1]) => {
    if (!companyId) return
    setBusy(true)
    setError(null)
    try {
      await api.patchPlatformCompany(companyId, body)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const toggleModule = async (moduleKey: string, enabled: boolean) => {
    await patch({
      moduleOverrides: [{ moduleKey, enabled, reason: 'Platform Admin override' }],
    })
  }

  const createGrant = async (event: FormEvent) => {
    event.preventDefault()
    if (!companyId || !grantReason.trim()) return
    setBusy(true)
    setError(null)
    try {
      await api.createPlatformSupportGrant({
        companyId,
        reason: grantReason.trim(),
        ticketReference: grantTicket.trim() || undefined,
        durationMinutes: grantMinutes,
        accessLevel: grantLevel,
      })
      setGrantReason('')
      setGrantTicket('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Support grant failed')
    } finally {
      setBusy(false)
    }
  }

  if (!detail && !error) {
    return (
      <PlatformShell title="Company" description="Loading tenant licence details…">
        <p className="text-sm text-muted">Loading…</p>
      </PlatformShell>
    )
  }

  return (
    <PlatformShell
      title={detail?.tradingName ?? detail?.legalName ?? 'Company'}
      description="Suspend, change plan, override modules, and open support access. Billing is a placeholder for now."
    >
      <p className="mb-4 text-sm">
        <Link to="/platform/companies" className="text-command-700 hover:underline">
          ← All companies
        </Link>
      </p>

      {error ? (
        <p className="mb-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      ) : null}

      {detail ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Licence</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Tenant status</dt>
                <dd className="font-medium">{detail.tenantStatus ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Subscription</dt>
                <dd className="font-medium">{detail.subscriptionStatus ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Plan</dt>
                <dd className="font-medium">{detail.planCode ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Company id</dt>
                <dd className="font-mono text-xs">{detail.id}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
                onClick={() => void patch({ tenantStatus: 'SUSPENDED' })}
              >
                Suspend
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
                onClick={() => void patch({ tenantStatus: 'READ_ONLY' })}
              >
                Read-only
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
                onClick={() => void patch({ tenantStatus: 'ACTIVE', subscriptionStatus: 'active' })}
              >
                Restore
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted">Change plan</span>
                <select
                  className="rounded-md border border-border bg-surface px-3 py-2"
                  value={planCode}
                  disabled={busy}
                  onChange={(event) => setPlanCode(event.target.value)}
                >
                  {(plans.length ? plans.map((p) => p.code) : [planCode]).map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={busy}
                className="rounded-md bg-command-700 px-3 py-2 text-xs font-semibold text-white hover:bg-command-800"
                onClick={() => void patch({ planCode, subscriptionStatus: 'active' })}
              >
                Save plan
              </button>
              <BillingPlaceholder compact />
            </div>
            <div className="mt-4">
              <BillingPlaceholder />
            </div>

            {detail.entitlements?.usageLimits ? (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Usage limits
                </h3>
                <dl className="mt-2 flex flex-wrap gap-4 text-sm">
                  {Object.entries(detail.entitlements.usageLimits).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs text-muted">{key}</dt>
                      <dd className="font-medium">{value == null ? 'Unlimited' : value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Entitlements</h2>
            <p className="mt-1 text-xs text-muted">
              Effective modules after plan + overrides (
              {detail.entitlements?.enabledModules?.length ?? 0} enabled).
            </p>
            <p className="mt-3 text-xs text-muted">
              {(detail.entitlements?.enabledModules ?? []).join(', ') || '—'}
            </p>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Subscription events</h2>
            <ul className="mt-3 space-y-2">
              {(detail.subscriptionEvents ?? []).map((event) => (
                <li key={event.id} className="rounded-lg border border-border px-3 py-2 text-xs">
                  <div className="font-medium text-sm">{event.eventType}</div>
                  <div className="text-muted">
                    {event.source}
                    {event.toPlanCode ? ` · plan → ${event.toPlanCode}` : ''}
                    {event.toTenantStatus ? ` · tenant → ${event.toTenantStatus}` : ''}
                    {event.createdAt ? ` · ${new Date(event.createdAt).toLocaleString()}` : ''}
                  </div>
                </li>
              ))}
              {!detail.subscriptionEvents?.length ? (
                <li className="text-sm text-muted">No subscription events yet.</li>
              ) : null}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Module overrides</h2>
            <p className="mt-1 text-xs text-muted">
              Overrides sit on top of the plan. Toggle only when a tenant needs a temporary exception.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {PLATFORM_MODULES.map((moduleKey) => {
                const override = overrideMap.get(moduleKey)
                const label =
                  override === undefined ? 'Plan default' : override ? 'Forced on' : 'Forced off'
                return (
                  <li
                    key={moduleKey}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{moduleKey}</div>
                      <div className="text-xs text-muted">{label}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded border border-border px-2 py-1 text-xs"
                        onClick={() => void toggleModule(moduleKey, true)}
                      >
                        On
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded border border-border px-2 py-1 text-xs"
                        onClick={() => void toggleModule(moduleKey, false)}
                      >
                        Off
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Support access</h2>
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void createGrant(event)}>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block text-xs text-muted">Reason</span>
                <input
                  required
                  value={grantReason}
                  onChange={(event) => setGrantReason(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2"
                  placeholder="Ticket investigation / outage support"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted">Ticket reference</span>
                <input
                  value={grantTicket}
                  onChange={(event) => setGrantTicket(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2"
                  placeholder="SUP-1234"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted">Duration (minutes)</span>
                <input
                  type="number"
                  min={15}
                  max={480}
                  value={grantMinutes}
                  onChange={(event) => setGrantMinutes(Number(event.target.value) || 60)}
                  className="w-full rounded-md border border-border px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted">Access level</span>
                <select
                  value={grantLevel}
                  onChange={(event) => setGrantLevel(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2"
                >
                  <option value="read_only">Read only</option>
                  <option value="write">Write</option>
                </select>
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-command-700 px-3 py-2 text-xs font-semibold text-white hover:bg-command-800"
                >
                  Create support grant
                </button>
              </div>
            </form>

            <ul className="mt-4 space-y-2">
              {(detail.supportGrants ?? []).map((grant) => {
                const active = !grant.revokedAt && (!grant.expiresAt || new Date(grant.expiresAt) > new Date())
                return (
                  <li
                    key={grant.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{grant.reason}</div>
                      <div className="text-xs text-muted">
                        {grant.accessLevel} · expires{' '}
                        {grant.expiresAt ? new Date(grant.expiresAt).toLocaleString() : '—'}
                        {grant.revokedAt ? ' · revoked' : active ? ' · active' : ' · expired'}
                      </div>
                    </div>
                    {active ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded border border-border px-2 py-1 text-xs"
                        onClick={() =>
                          void api
                            .revokePlatformSupportGrant(grant.id)
                            .then(load)
                            .catch((err) =>
                              setError(err instanceof Error ? err.message : 'Revoke failed'),
                            )
                        }
                      >
                        Revoke
                      </button>
                    ) : null}
                  </li>
                )
              })}
              {!detail.supportGrants?.length ? (
                <li className="text-sm text-muted">No support grants yet.</li>
              ) : null}
            </ul>
          </section>
        </div>
      ) : null}
    </PlatformShell>
  )
}
