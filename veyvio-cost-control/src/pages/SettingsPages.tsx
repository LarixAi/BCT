import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { financeRoleCanAccessPage, type FinancePage } from '../auth/page-access'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import { getBankIntegrationConfig } from '../integrations/bank'
import {
  readAccountingProviderSelection,
  writeAccountingProviderSelection,
  type AccountingMode,
} from '../integrations/accounting'
import { formatDate } from '../lib/labels'

const SETTINGS_AREAS = [
  {
    to: '/settings/general',
    icon: 'CO',
    title: 'General & company',
    description: 'Company identity, legal context, currency and workspace details.',
    page: 'settings_general',
  },
  {
    to: '/settings/financial-controls',
    icon: '£',
    title: 'Financial controls',
    description: 'Financial year, active budget, approval bands and period controls.',
    page: 'settings_financial',
  },
  {
    to: '/settings/people',
    icon: 'US',
    title: 'People & access',
    description: 'Company membership, finance roles and production security requirements.',
    page: 'settings_people',
  },
  {
    to: '/settings/integrations',
    icon: 'IN',
    title: 'Integrations',
    description: 'Accountant export, optional accounting software and read-only Open Banking.',
    page: 'settings_integrations',
  },
  {
    to: '/settings/notifications',
    icon: 'AL',
    title: 'Notifications',
    description: 'Choose which cost-control events need attention.',
    page: 'settings_notifications',
  },
  {
    to: '/settings/audit-security',
    icon: 'AU',
    title: 'Audit, security & data',
    description: 'Audit history, locked periods, retention and platform assurance.',
    page: 'settings_audit',
  },
] as const

export function SettingsHubPage() {
  const { organisation, budget, approvalBands, bankConnection, sageIntegration, quarantine } =
    useCostStore()
  const { identity, activeMembership } = useAuth()
  const sageReady =
    sageIntegration.connection.status === 'connected' && sageIntegration.unmappedCount === 0
  const bankReady = bankConnection.status === 'connected'
  const accountingSelection = readAccountingProviderSelection()
  const accountingReady =
    accountingSelection.mode === 'accountant_export' ||
    (accountingSelection.mode === 'sage' && sageReady) ||
    accountingSelection.mode === 'other_software'
  const setupReady = [
    Boolean(organisation.name && organisation.currency),
    Boolean(budget.lines.length && approvalBands.length),
    Boolean(identity && activeMembership),
    accountingReady,
    true,
    quarantine.length === 0,
  ].filter(Boolean).length
  const role = activeMembership!.role
  const canManageIntegrations = financeRoleCanAccessPage(role, 'settings_integrations')
  const visibleAreas = SETTINGS_AREAS.filter((area) =>
    financeRoleCanAccessPage(role, area.page as FinancePage),
  )

  return (
    <div className="page settings-hub-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Settings</h1>
          <p className="muted">
            Manage how {organisation.tradingName} controls access, costs, integrations and audit
            assurance.
          </p>
        </div>
        <StatusPill tone={setupReady === 6 ? 'healthy' : 'attention'}>
          {setupReady} of 6 controls ready
        </StatusPill>
      </header>

      <section className="settings-identity-banner">
        <div>
          <span>Active company</span>
          <h2>{organisation.tradingName}</h2>
          <p>{budget.code} · FY {budget.financialYear} · {organisation.currency}</p>
        </div>
        <div>
          <span>Signed in as</span>
          <strong>{identity?.displayName ?? 'Unknown user'}</strong>
          <p>{activeMembership?.role.replaceAll('_', ' ') ?? 'No active role'}</p>
        </div>
      </section>

      <section className="settings-area-grid" aria-label="Settings areas">
        {visibleAreas.map((area) => (
          <Link key={area.to} className="settings-area-card" to={area.to}>
            <span className="settings-area-icon" aria-hidden="true">{area.icon}</span>
            <span>
              <strong>{area.title}</strong>
              <small>{area.description}</small>
            </span>
            <span className="settings-area-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Needs attention</h2>
            <p className="muted">Configuration issues that can affect trusted finance reporting.</p>
          </div>
        </div>
        <div className="settings-action-list">
          {canManageIntegrations && accountingSelection.mode === 'sage' && !sageReady ? (
            <SettingsAction
              tone="attention"
              title="Complete Sage accounting setup"
              detail={`${sageIntegration.unmappedCount} unmapped code(s) · ${sageIntegration.failedExports.length} export exception(s)`}
              to="/settings/integrations"
            />
          ) : null}
          {canManageIntegrations && !bankReady ? (
            <SettingsAction
              tone="attention"
              title="Connect the business bank"
              detail="Read-only Open Banking feed is not connected."
              to="/settings/integrations"
            />
          ) : null}
          {!canManageIntegrations && (!accountingReady || !bankReady) ? (
            <p className="callout info">
              An integration configuration needs attention. Your role can view finance results but
              only a finance administrator can change accounting or bank connections.
            </p>
          ) : null}
          {quarantine.length ? (
            <SettingsAction
              tone="critical"
              title="Resolve quarantined import rows"
              detail={`${quarantine.length} row(s) are excluded from trusted calculations.`}
              to="/imports"
            />
          ) : null}
          {accountingReady && bankReady && quarantine.length === 0 ? (
            <p className="callout healthy">No configuration issues require attention.</p>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export function GeneralSettingsPage() {
  const { organisation, budget, clgProfile } = useCostStore()
  return (
    <SettingsDetailPage
      title="General & company"
      subtitle="Company identity and the operating context attached to every finance record."
      status={<StatusPill tone="healthy">Configured</StatusPill>}
    >
      <section className="panel">
        <h2>Company identity</h2>
        <dl className="detail-grid">
          <dt>Registered name</dt><dd>{organisation.name}</dd>
          <dt>Trading name</dt><dd>{organisation.tradingName}</dd>
          <dt>Legal form</dt><dd>{clgProfile.legalForm.replaceAll('_', ' ').toUpperCase()}</dd>
          <dt>Company number</dt><dd>{clgProfile.companyNumber}</dd>
          <dt>Charity status</dt><dd>{clgProfile.charityStatus.replaceAll('_', ' ')}</dd>
        </dl>
      </section>
      <section className="panel">
        <h2>Finance workspace</h2>
        <dl className="detail-grid">
          <dt>Currency</dt><dd>{organisation.currency}</dd>
          <dt>Timezone</dt><dd>{organisation.timezone}</dd>
          <dt>Active budget</dt><dd>{budget.name} ({budget.code})</dd>
          <dt>Financial year</dt><dd>{budget.financialYear}</dd>
        </dl>
        <p className="callout info">
          Company identity changes require administrator authority and an immutable audit event.
          Operational, booking and dispatch settings are intentionally outside Veyvio Finance.
        </p>
      </section>
    </SettingsDetailPage>
  )
}

export function FinancialControlsSettingsPage() {
  const { budget, approvalBands, quarterlyReview } = useCostStore()
  return (
    <SettingsDetailPage
      title="Financial controls"
      subtitle="The prospective rules used to classify, authorise and lock company costs."
      action={<Link className="btn-primary" to="/budgets">Open active budget</Link>}
    >
      <div className="settings-control-grid">
        <SettingMetric label="Financial year" value={budget.financialYear} detail={budget.code} />
        <SettingMetric label="Budget version" value={`Version ${budget.version}`} detail={`${budget.lines.length} lines`} />
        <SettingMetric label="Currency" value={budget.currency} detail="Integer minor units" />
        <SettingMetric
          label="Quarter control"
          value={quarterlyReview.status.replaceAll('_', ' ')}
          detail={`${quarterlyReview.quarter} · version ${quarterlyReview.version}`}
        />
      </div>
      <section className="panel">
        <h2>Approval bands</h2>
        <p className="muted">The applicable band is selected from gross cost value and control context.</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>From</th><th>Up to</th><th>Required approvers</th><th>Additional control</th></tr>
            </thead>
            <tbody>
              {approvalBands.map((band) => (
                <tr key={band.id}>
                  <td><MoneyText amountMinor={band.minInclusiveMinor} /></td>
                  <td>{band.maxInclusiveMinor === null ? 'No upper limit' : <MoneyText amountMinor={band.maxInclusiveMinor} />}</td>
                  <td>{band.requiredApprovers}</td>
                  <td>{band.relatedPartyOverride ? 'Related-party override' : band.unbudgetedRequiresBoard ? 'Unbudgeted cost requires board' : 'Standard approval'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="callout info">
          Rule changes must create a new version and apply prospectively. They must never rewrite
          historical approval decisions.
        </p>
      </section>
    </SettingsDetailPage>
  )
}

export function PeopleSettingsPage() {
  const { identity, activeMembership } = useAuth()
  return (
    <SettingsDetailPage
      title="People & access"
      subtitle="Company-scoped finance access and least-privilege role assignment."
      status={<StatusPill tone={identity && activeMembership ? 'healthy' : 'critical'}>{identity && activeMembership ? 'Session verified' : 'Access issue'}</StatusPill>}
    >
      <section className="panel">
        <div className="section-heading">
          <div><h2>Authorised users</h2><p className="muted">Users with access to the selected company workspace.</p></div>
          <button type="button" className="btn-secondary" disabled title="Requires production identity provider">Invite user</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>User</th><th>Company</th><th>Role</th><th>Access</th></tr></thead>
            <tbody>
              {(identity?.memberships ?? []).map((membership) => (
                <tr key={membership.organisationId}>
                  <td><strong>{identity?.displayName}</strong><small>{identity?.email}</small></td>
                  <td>{membership.organisationName}</td>
                  <td>{membership.role.replaceAll('_', ' ')}</td>
                  <td><StatusPill tone="healthy">Active</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>Production access policy</h2>
        <ul className="stack-list">
          <li>Managed identity or single sign-on with multi-factor authentication.</li>
          <li>Individual accounts only; shared finance credentials are prohibited.</li>
          <li>Company membership and finance role checked on every protected request.</li>
          <li>Read-only, time-limited access for an accountant, examiner or auditor.</li>
          <li>Role and access changes recorded in the immutable audit history.</li>
        </ul>
      </section>
    </SettingsDetailPage>
  )
}

export function IntegrationsSettingsPage() {
  const {
    bankConnection,
    startBankConnect,
    completeBankConnect,
    disconnectBank,
    refreshBankFeed,
    sageIntegration,
  } = useCostStore()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accountingSelection, setAccountingSelection] = useState(
    readAccountingProviderSelection,
  )
  const config = getBankIntegrationConfig()
  const bankConnected = bankConnection.status === 'connected'
  const sageConnected = sageIntegration.connection.status === 'connected'

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('bank_callback') !== '1') return
    let cancelled = false
    void (async () => {
      setBusy(true)
      try {
        await completeBankConnect({
          state: params.get('state') ?? '',
          authorizationCode: params.get('code') ?? undefined,
          sandbox: params.get('bank_sandbox') === '1',
        })
        if (!cancelled) {
          setMessage('Open Banking consent completed — read-only feed connected.')
          window.history.replaceState({}, '', '/settings/integrations')
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Bank connect failed')
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => { cancelled = true }
  }, [completeBankConnect])

  return (
    <SettingsDetailPage
      title="Integrations"
      subtitle="Connections and exports that support cost control while the selected accounting system holds the official ledger."
    >
      {message ? <p className="callout healthy">{message}</p> : null}
      {error ? <p className="callout critical">{error}</p> : null}
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Accounting mode</h2>
            <p className="muted">
              Sage is optional. Choose how approved Veyvio costs reach the official accounting
              records.
            </p>
          </div>
          <StatusPill tone={accountingSelection.mode === 'veyvio_ledger' ? 'attention' : 'healthy'}>
            {accountingSelection.providerName}
          </StatusPill>
        </div>
        <div className="accounting-mode-grid">
          {([
            ['accountant_export', 'Accountant export', 'Recommended now', 'Versioned CSV and manifest; the accountant posts and files in recognised software.'],
            ['sage', 'Sage', 'Optional connector', 'Use Sage mappings, exports and reconciliation confirmations.'],
            ['other_software', 'Other software', 'Provider-neutral', 'Prepare exports for the accountant’s selected accounting package.'],
            ['veyvio_ledger', 'Veyvio Ledger', 'Future phase', 'Double-entry ledger is not yet production-ready.'],
          ] as Array<[AccountingMode, string, string, string]>).map(([mode, name, badge, detail]) => (
            <button
              key={mode}
              type="button"
              className={accountingSelection.mode === mode ? 'selected' : ''}
              disabled={mode === 'veyvio_ledger'}
              onClick={() => {
                const next = {
                  mode,
                  providerName: name,
                  selectedAt: new Date().toISOString(),
                  productionPersisted: false,
                }
                writeAccountingProviderSelection(next)
                setAccountingSelection(next)
                setMessage(`${name} selected for this demo workspace.`)
              }}
            >
              <span><strong>{name}</strong><small>{badge}</small></span>
              <p>{detail}</p>
            </button>
          ))}
        </div>
        <p className="muted small">
          Demo selection is stored in this browser. Production will require administrator approval,
          API persistence and an audit event.
        </p>
        <Link className="btn-primary" to="/accounting-exports">
          Open Accountant Export Centre
        </Link>
      </section>

      {accountingSelection.mode === 'sage' ? <section className="integration-setting-card">
        <div className="integration-setting-head">
          <div className="settings-brand-mark sage">S</div>
          <div><h2>Sage accounting</h2><p>General ledger, VAT, accounts payable and statutory records.</p></div>
          <StatusPill tone={sageConnected ? 'healthy' : 'attention'}>{sageIntegration.connection.status}</StatusPill>
        </div>
        <dl className="detail-grid">
          <dt>Product</dt><dd>{sageIntegration.connection.productId.replaceAll('_', ' ')}</dd>
          <dt>Sage organisation</dt><dd>{sageIntegration.connection.sageOrganisationName ?? 'Not connected'}</dd>
          <dt>Last successful sync</dt><dd>{sageIntegration.connection.lastSuccessfulSyncAt ? formatDate(sageIntegration.connection.lastSuccessfulSyncAt) : 'Never'}</dd>
          <dt>Code mappings</dt><dd>{sageIntegration.mappings.filter((mapping) => mapping.mapped).length} of {sageIntegration.mappings.length} mapped</dd>
          <dt>Export exceptions</dt><dd>{sageIntegration.failedExports.length}</dd>
        </dl>
        <div className="row-actions">
          <button type="button" className="btn-primary" disabled title="Sage product confirmation required">Connect Sage</button>
          <Link className="btn-secondary" to="/reviews">View exceptions</Link>
        </div>
      </section> : null}
      <section className="integration-setting-card">
        <div className="integration-setting-head">
          <div className="settings-brand-mark bank">B</div>
          <div><h2>Business bank</h2><p>Read-only Open Banking transaction feed for proposed matching.</p></div>
          <StatusPill tone={bankConnected ? 'healthy' : 'attention'}>{bankConnection.status}</StatusPill>
        </div>
        <dl className="detail-grid">
          <dt>Provider</dt><dd>{bankConnection.providerId ?? config.providerId}</dd>
          <dt>Institution</dt><dd>{bankConnection.institutionName ?? 'Not connected'}</dd>
          <dt>Access</dt><dd>Read only · no payment initiation</dd>
          <dt>Official reconciliation</dt><dd>Accounting-confirmed only</dd>
        </dl>
        <div className="row-actions">
          {!bankConnected ? (
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void startBankConnect('NatWest Business').then(({ consentUrl }) => window.location.assign(consentUrl)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not start bank connect'))}>Connect bank</button>
          ) : (
            <>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => void refreshBankFeed().then(() => setMessage('Bank feed synced.')).catch((cause) => setError(cause instanceof Error ? cause.message : 'Sync failed'))}>Sync now</button>
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => void disconnectBank().then(() => setMessage('Bank disconnected.')).catch((cause) => setError(cause instanceof Error ? cause.message : 'Disconnect failed'))}>Disconnect</button>
              <Link className="btn-secondary" to="/bank">Open bank view</Link>
            </>
          )}
        </div>
      </section>
      <p className="callout info">
        Veyvio never stores bank or Sage passwords. Open Banking matches are supporting evidence;
        reconciliation is final only after confirmation in the official accounting records.
      </p>
    </SettingsDetailPage>
  )
}

export function NotificationsSettingsPage() {
  const [saved, setSaved] = useState(false)
  const [preferences, setPreferences] = useState({
    overspend: true,
    evidence: true,
    review: true,
    integration: true,
    consent: true,
    quarter: true,
  })
  const labels: Array<[keyof typeof preferences, string, string]> = [
    ['overspend', 'Budget and forecast warnings', 'Projected overspend or material adverse variance.'],
    ['evidence', 'Missing evidence', 'Actual cost does not have the required source document.'],
    ['review', 'Review deadlines', 'Open finance review needs a decision or is approaching its due date.'],
    ['integration', 'Integration failures', 'Sage export or bank-feed refresh has failed.'],
    ['consent', 'Bank consent expiry', 'Open Banking consent needs renewal.'],
    ['quarter', 'Quarter-end controls', 'Review, lock or board-pack milestone is due.'],
  ]
  return (
    <SettingsDetailPage title="Notifications" subtitle="Choose which cost-control events should demand attention.">
      {saved ? <p className="callout healthy">Notification preferences saved for this demo workspace.</p> : null}
      <section className="panel">
        <h2>In-app alerts</h2>
        <div className="notification-setting-list">
          {labels.map(([key, title, detail]) => (
            <label key={key}>
              <span><strong>{title}</strong><small>{detail}</small></span>
              <input type="checkbox" checked={preferences[key]} onChange={(event) => { setSaved(false); setPreferences((current) => ({ ...current, [key]: event.target.checked })) }} />
            </label>
          ))}
        </div>
        <div className="row-actions">
          <button type="button" className="btn-primary" onClick={() => setSaved(true)}>Save preferences</button>
        </div>
        <p className="muted small">Email delivery requires a production notification provider. It is not enabled in the demo.</p>
      </section>
    </SettingsDetailPage>
  )
}

export function AuditSecuritySettingsPage() {
  const { imports, quarantine, auditEvents, quarterlyReview, sageIntegration } = useCostStore()
  return (
    <SettingsDetailPage
      title="Audit, security & data"
      subtitle="Assurance controls supporting reliable records, external review and lawful retention."
      action={<Link className="btn-primary" to="/audit-evidence">Open audit workspace</Link>}
    >
      <div className="settings-control-grid">
        <SettingMetric label="Import runs" value={String(imports.length)} detail="Source runs retained" />
        <SettingMetric label="Quarantined rows" value={String(quarantine.length)} detail="Excluded from calculations" />
        <SettingMetric label="Audit events" value={String(auditEvents.length)} detail="Immutable decisions" />
        <SettingMetric label="Quarter snapshot" value={quarterlyReview.status === 'locked' ? 'Locked' : 'Not locked'} detail={`${quarterlyReview.quarter} · v${quarterlyReview.version}`} />
      </div>
      <section className="panel">
        <h2>Assurance controls</h2>
        <div className="settings-assurance-list">
          <AssuranceRow title="Organisation data isolation" detail="Organisation ID required on finance records and API requests." ready />
          <AssuranceRow title="Immutable review history" detail="Decisions keep actor, reason, time and before/after state." ready />
          <AssuranceRow title="Sage exception visibility" detail={`${sageIntegration.failedExports.length} export exception(s) currently visible.`} ready={sageIntegration.failedExports.length === 0} />
          <AssuranceRow title="Quarterly snapshot lock" detail="Locked versions never change; later corrections create a new version." ready={quarterlyReview.status === 'locked'} />
          <AssuranceRow title="Production backup and restore test" detail="Must be configured and evidenced by the production platform." ready={false} />
          <AssuranceRow title="Data-retention schedule" detail="Requires documented accounting, legal and subject-access rules." ready={false} />
        </div>
      </section>
      <section className="panel">
        <h2>Controlled actions</h2>
        <p className="muted">
          Archiving, destructive deletion, retention changes and security-policy changes require
          explicit administrator authority, confirmation and an audit event.
        </p>
        <button type="button" className="btn-ghost" disabled title="Production administrator workflow required">Archive workspace</button>
      </section>
    </SettingsDetailPage>
  )
}

function SettingsDetailPage({
  title,
  subtitle,
  status,
  action,
  children,
}: {
  title: string
  subtitle: string
  status?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  const { activeMembership } = useAuth()
  const allowedAreas = SETTINGS_AREAS.filter((area) =>
    financeRoleCanAccessPage(activeMembership!.role, area.page as FinancePage),
  )
  return (
    <div className="page settings-detail-page">
      <Link className="settings-back-link" to="/settings">← All settings</Link>
      <header className="page-header">
        <div><p className="eyebrow">Settings</p><h1>{title}</h1><p className="muted">{subtitle}</p></div>
        <div className="page-header-actions">{status}{action}</div>
      </header>
      <nav className="page-subnav" aria-label="Settings areas">
        {allowedAreas.map((area) => <Link key={area.to} className="page-chip" to={area.to}>{area.title}</Link>)}
      </nav>
      {children}
    </div>
  )
}

function SettingsAction({ tone, title, detail, to }: { tone: 'attention' | 'critical'; title: string; detail: string; to: string }) {
  return (
    <Link to={to}>
      <StatusPill tone={tone}>{tone === 'critical' ? 'Blocker' : 'Action'}</StatusPill>
      <span><strong>{title}</strong><small>{detail}</small></span>
      <span aria-hidden="true">→</span>
    </Link>
  )
}

function SettingMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function AssuranceRow({ title, detail, ready }: { title: string; detail: string; ready: boolean }) {
  return (
    <article>
      <StatusPill tone={ready ? 'healthy' : 'attention'}>{ready ? 'Ready' : 'Action'}</StatusPill>
      <span><strong>{title}</strong><small>{detail}</small></span>
    </article>
  )
}
