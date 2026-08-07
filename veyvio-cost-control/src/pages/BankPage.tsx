import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoneyText, StatusPill } from '../components/Money'
import { useCostStore } from '../data/CostStore'
import {
  buildBankFeedSnapshot,
  formatFeedAge,
} from '../domain/bank-account'
import { buildCashFlowSnapshot } from '../domain/cash-flow-view'
import { formatDate } from '../lib/labels'

/**
 * Cash & bank — four questions first:
 * 1. How much cash is available for CEC costs?
 * 2. What payments are due soon?
 * 3. Will sufficient cash remain available (13-week outlook)?
 * 4. Are the bank and cost ledger fully reconciled?
 *
 * Blueprint §11 — read-only Open Banking AIS. Does not initiate payments.
 * Demo feed until an authorised Open Banking partner is connected.
 */
export function BankPage() {
  const {
    bankAccounts,
    bankTransactions,
    refreshBankFeed,
    organisation,
    costs,
    bankConnection,
    bankRestrictedMinor,
  } = useCostStore()

  const accounts = bankAccounts ?? []
  const [selectedId, setSelectedId] = useState(accounts[0]?.id ?? '')
  const account = accounts.find((a) => a.id === selectedId) ?? accounts[0]
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [matchingTxnId, setMatchingTxnId] = useState<string | null>(null)

  // Derive pending costs from the ledger — costs with a future paymentDate.
  const pendingCosts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return costs
      .filter(
        (c) =>
          c.organisationId === organisation.id &&
          c.validationState !== 'quarantined' &&
          c.paymentDate &&
          c.paymentDate >= today,
      )
      .map((c) => ({
        id: c.id,
        description: c.description,
        counterparty: c.supplierName,
        paymentDate: c.paymentDate as string,
        amountMinor: c.gross.amountMinor,
        status: (c.status === 'actual'
          ? 'approved'
          : c.status === 'committed'
            ? 'committed'
            : 'expected') as 'approved' | 'committed' | 'expected',
      }))
  }, [costs, organisation.id])

  const snapshot = useMemo(() => {
    if (!account) return null
    return buildBankFeedSnapshot({
      organisationId: organisation.id,
      account,
      transactions: bankTransactions ?? [],
      pendingCosts,
      restrictedMinor: bankRestrictedMinor ?? 0,
    })
  }, [account, bankTransactions, organisation.id, pendingCosts, bankRestrictedMinor])

  const cashFlow = useMemo(() => {
    if (!account) return null
    return buildCashFlowSnapshot({
      organisationId: organisation.id,
      costs,
      accounts: [account],
      transactions: bankTransactions ?? [],
      fromDate: new Date().toISOString().slice(0, 10),
      weeks: 13,
    })
  }, [account, costs, bankTransactions, organisation.id])

  if (!account || !snapshot) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <h1>Cash &amp; bank</h1>
            <p className="muted">
              Read-only bank feed for cost reconciliation. Veyvio never initiates payments or stores
              banking credentials.
            </p>
          </div>
          <div className="page-header-actions">
            <Link to="/settings/integrations" className="btn-secondary">
              Connect bank
            </Link>
            <Link to="/settings" className="btn-ghost">
              Connection settings
            </Link>
          </div>
        </header>

        <p className="callout info">
          No business bank account connected for <strong>{organisation.tradingName}</strong> yet.
          The cash layout below stays available with zero balances until you connect Open Banking
          or import a statement CSV.
        </p>

        <section className="cost-hero attention">
          <div className="cost-hero-primary">
            <div className="cost-hero-eyebrow">No feed connected</div>
            <div className="cost-hero-label">Free cash for costs</div>
            <div className="cost-hero-value">
              <MoneyText amountMinor={0} />
            </div>
            <div className="cost-hero-sub">Connect a read-only AIS feed to populate cleared cash</div>
          </div>
          <div className="cost-hero-side">
            <h2 className="cost-hero-side-title">Cash breakdown</h2>
            <dl className="kv-list compact">
              <dt>Cleared balance</dt>
              <dd>
                <MoneyText amountMinor={0} />
              </dd>
              <dt>Available (incl. pending)</dt>
              <dd>
                <MoneyText amountMinor={0} />
              </dd>
              <dt>Ring-fenced / restricted</dt>
              <dd>
                <MoneyText amountMinor={0} />
              </dd>
              <dt>
                <strong>Free cost cash</strong>
              </dt>
              <dd>
                <strong>
                  <MoneyText amountMinor={0} />
                </strong>
              </dd>
            </dl>
          </div>
        </section>

        <section className="panel">
          <h2>Payments due in the next 30 days</h2>
          <p className="muted">No bank feed — payment headroom cannot be calculated yet.</p>
        </section>

        <section className="panel">
          <h2>Open Banking connection</h2>
          <p className="muted">
            Status: disconnected. Use Settings to start sandbox or live AIS consent.
          </p>
        </section>
      </div>
    )
  }

  const connectionOk = bankConnection?.status === 'connected'
  const isDemo = account.feedMode === 'demo_live'
  const isSandboxAis =
    !isDemo &&
    (account.feedMode === 'open_banking' || connectionOk) &&
    (Boolean(bankConnection?.providerId?.includes('sandbox')) ||
      Boolean(bankConnection?.externalConnectionId?.startsWith('sandbox_conn_')) ||
      Boolean(bankConnection?.secretStorage === 'demo_memory'))
  const hasUnmatched = snapshot.unmatchedCount > 0
  const cashShortfall =
    snapshot.freeCostCashMinor <
    snapshot.approvedDue30Minor + snapshot.committedDue30Minor

  function statusBadge(s: 'approved' | 'committed' | 'expected') {
    if (s === 'approved') return <StatusPill tone="healthy">Approved</StatusPill>
    if (s === 'committed') return <StatusPill tone="attention">Committed</StatusPill>
    return <StatusPill tone="neutral">Expected</StatusPill>
  }

  function formatWeekLabel(iso: string) {
    const d = new Date(`${iso}T12:00:00`)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="page">
      {/* ── Page header ── */}
      <header className="page-header">
        <div>
          <h1>Cash &amp; bank</h1>
          <p className="muted">
            Read-only bank feed for CEC cost reconciliation. Veyvio never initiates payments or
            stores banking credentials.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              void (async () => {
                await refreshBankFeed(account.id)
                setRefreshMessage(`Feed refreshed at ${new Date().toLocaleTimeString('en-GB')}.`)
              })()
            }}
          >
            Refresh now
          </button>
          <Link to="/settings" className="btn-ghost">
            Connection settings
          </Link>
        </div>
      </header>

      {/* ── Data currency banner — always shown ── */}
      <div className={`callout ${isSandboxAis || snapshot.isStale ? 'attention' : 'info'}`}>
        <strong>Bank data current as at:</strong> {snapshot.dataCurrent} ·{' '}
        <strong>Last successful sync:</strong> {snapshot.lastSyncLabel} ·{' '}
        <strong>Connection:</strong>{' '}
        {isDemo ? (
          <span>Demo feed — Open Banking partner not connected</span>
        ) : isSandboxAis ? (
          <span>
            Sandbox AIS fixture — not live NatWest balances. TrueLayer live credentials are not
            configured yet.
          </span>
        ) : connectionOk ? (
          <span>Healthy · {bankConnection?.institutionName ?? 'Unknown provider'}</span>
        ) : (
          <span>
            {bankConnection?.status ?? 'Unknown'} —{' '}
            <Link to="/settings">reconnect in Settings</Link>
          </span>
        )}
        {snapshot.isStale ? ' · Feed is stale — refresh or reconnect.' : ''}
      </div>

      {isSandboxAis ? (
        <p className="callout attention">
          These amounts are a read-only sandbox fixture used to test Connect and reconciliation UI.
          Disconnect in Settings to clear them, or connect a real AIS partner when credentials are
          ready.
        </p>
      ) : null}

      {refreshMessage ? <p className="callout healthy">{refreshMessage}</p> : null}

      {/* ── Account tabs ── */}
      {accounts.length > 1 ? (
        <div className="page-subnav" role="tablist" aria-label="Bank accounts">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              className={a.id === account.id ? 'page-chip active' : 'page-chip'}
              onClick={() => setSelectedId(a.id)}
            >
              {a.displayName}
            </button>
          ))}
        </div>
      ) : null}

      {/* ━━━ Q1: How much cash is available for CEC costs? ━━━ */}
      <section className={`cost-hero ${cashShortfall ? 'attention' : 'healthy'}`}>
        <div className="cost-hero-primary">
          <div className="cost-hero-eyebrow">
            {account.institutionName} · {account.sortCodeMasked} · {account.accountNumberMasked}
          </div>
          <div className="cost-hero-label">Free cash for costs</div>
          <div className="cost-hero-value">
            <MoneyText amountMinor={snapshot.freeCostCashMinor} />
          </div>
          <div className="cost-hero-sub">
            Cleared balance minus ring-fenced reserves — not the approved budget
          </div>
        </div>
        <div className="cost-hero-side">
          <h2 className="cost-hero-side-title">Cash breakdown</h2>
          <dl className="kv-list compact">
            <dt>Cleared balance</dt>
            <dd>
              <MoneyText amountMinor={snapshot.clearedBalanceMinor} />
            </dd>
            <dt>Available (incl. pending)</dt>
            <dd>
              <MoneyText amountMinor={snapshot.availableMinor} />
            </dd>
            <dt>Ring-fenced / restricted</dt>
            <dd>
              <MoneyText amountMinor={snapshot.restrictedMinor} />
            </dd>
            <dt>
              <strong>Free cost cash</strong>
            </dt>
            <dd>
              <strong>
                <MoneyText amountMinor={snapshot.freeCostCashMinor} />
              </strong>
            </dd>
          </dl>
          <p className="muted small">
            Budget and bank balance are separate figures. Surplus budget does not mean surplus
            cash.
          </p>
        </div>
      </section>

      {/* ━━━ Q2: What payments are due soon? ━━━ */}
      <section className="panel">
        <h2>Payments due in the next 30 days</h2>
        <div className="kpi-grid dense" style={{ marginBottom: '1rem' }}>
          <div className="kpi">
            <div className="kpi-label">Approved due</div>
            <div className="kpi-value">
              <MoneyText amountMinor={snapshot.approvedDue30Minor} />
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Committed due</div>
            <div className="kpi-value">
              <MoneyText amountMinor={snapshot.committedDue30Minor} status="committed" />
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Expected due</div>
            <div className="kpi-value">
              <MoneyText amountMinor={snapshot.expectedDue30Minor} />
            </div>
          </div>
          <div className={`kpi${cashShortfall ? ' tone-critical' : ''}`}>
            <div className="kpi-label">Cash headroom after all approved + committed</div>
            <div className="kpi-value">
              <MoneyText
                amountMinor={
                  snapshot.freeCostCashMinor -
                  snapshot.approvedDue30Minor -
                  snapshot.committedDue30Minor
                }
              />
            </div>
          </div>
        </div>
        {snapshot.dueSoonPayments.length === 0 ? (
          <p className="muted">No approved, committed or expected payments fall due in the next 30 days.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Due date</th>
                  <th>Description</th>
                  <th>Payee</th>
                  <th>Status</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.dueSoonPayments.map((p) => (
                  <tr key={p.costId}>
                    <td>{formatDate(p.dueDate)}</td>
                    <td>{p.description}</td>
                    <td>{p.counterparty}</td>
                    <td>{statusBadge(p.status)}</td>
                    <td className="num">
                      <MoneyText amountMinor={p.amountMinor} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cashShortfall ? (
          <p className="callout attention" style={{ marginTop: '0.75rem' }}>
            Free cost cash is lower than approved + committed payments due in 30 days. Review
            timing or confirm incoming funding before these payment dates.
          </p>
        ) : null}
      </section>

      {/* ━━━ Q3: Will cash remain sufficient? 13-week outlook ━━━ */}
      <section className="panel">
        <h2>13-week cost cash outlook</h2>
        {cashFlow?.warning ? (
          <p className="callout attention">{cashFlow.warning}</p>
        ) : (
          <p className="callout healthy">
            Projected cash remains positive throughout the 13-week horizon based on current
            committed payments.
          </p>
        )}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Week starting</th>
                <th className="num">Outflow</th>
                <th className="num">Inflow</th>
                <th className="num">Net</th>
                <th className="num">Running balance</th>
              </tr>
            </thead>
            <tbody>
              {cashFlow?.buckets.map((b) => {
                const low = b.runningBalanceMinor < (cashFlow.openingBalanceMinor ?? 0) * 0.15
                const negative = b.runningBalanceMinor < 0
                return (
                  <tr
                    key={b.weekStart}
                    className={negative ? 'row-critical' : low ? 'row-attention' : ''}
                  >
                    <td>{formatWeekLabel(b.weekStart)}</td>
                    <td className="num bank-debit">
                      {b.outflowMinor > 0 ? (
                        <>
                          −<MoneyText amountMinor={b.outflowMinor} />
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="num bank-credit">
                      {b.inflowMinor > 0 ? (
                        <>
                          +<MoneyText amountMinor={b.inflowMinor} />
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`num ${b.netMinor < 0 ? 'bank-debit' : 'bank-credit'}`}>
                      {b.netMinor < 0 ? '−' : '+'}
                      <MoneyText amountMinor={Math.abs(b.netMinor)} />
                    </td>
                    <td className={`num${negative ? ' tone-critical' : low ? ' tone-attention' : ''}`}>
                      <MoneyText amountMinor={b.runningBalanceMinor} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Outflows are approved, committed and expected costs with payment dates within each
          week. Inflows are imported funding entries only — not sales or income. This is a
          cash-position view, not a budget view.
        </p>
      </section>

      {/* ━━━ Q4: Are bank and ledger fully reconciled? ━━━ */}
      <section className={`panel${hasUnmatched ? ' panel-attention' : ''}`}>
        <h2>
          Bank–ledger reconciliation
          {hasUnmatched ? (
            <span className="badge-attention" style={{ marginLeft: '0.5rem' }}>
              {snapshot.unmatchedCount} unmatched
            </span>
          ) : (
            <span className="badge-healthy" style={{ marginLeft: '0.5rem' }}>
              Fully matched
            </span>
          )}
        </h2>

        {hasUnmatched ? (
          <>
            <p className="callout attention">
              {snapshot.unmatchedCount} bank debit
              {snapshot.unmatchedCount === 1 ? '' : 's'} cannot be linked to a ledger cost.
              Unresolved reconciliation exceptions will block the period close. Matches here are
              proposed until Sage confirms official bank reconciliation.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bank description</th>
                    <th>Counterparty</th>
                    <th>Status</th>
                    <th className="num">Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.unmatchedDebits.map((u) => (
                    <tr key={u.txnId}>
                      <td>{formatDate(u.bookedAt.slice(0, 10))}</td>
                      <td>
                        <div className="person-name">{u.description}</div>
                      </td>
                      <td>{u.counterparty}</td>
                      <td>
                        <StatusPill tone={u.status === 'pending' ? 'attention' : 'neutral'}>
                          {u.status}
                        </StatusPill>
                      </td>
                      <td className="num bank-debit">
                        −<MoneyText amountMinor={u.amountMinor} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setMatchingTxnId(u.txnId)}
                        >
                          Propose match
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="muted">All recent debits are matched to a ledger cost and approved.</p>
        )}

        {matchingTxnId ? (
          <div className="callout info" style={{ marginTop: '0.75rem' }}>
            Manual match initiated for transaction{' '}
            <code>{matchingTxnId}</code>. Full match workflow is linked to the cost ledger
            (Open Banking reconciliation engine — Phase 3).{' '}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setMatchingTxnId(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </section>

      {/* ── Full transaction list ── */}
      <section className="panel">
        <h2>All bank transactions</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Counterparty</th>
                <th>Status</th>
                <th>Ledger match</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.transactions.map((t) => {
                const matched = t.matchedCostId
                  ? costs.find((c) => c.id === t.matchedCostId)
                  : null
                const signed =
                  t.direction === 'credit' ? t.amountMinor : -t.amountMinor
                return (
                  <tr key={t.id}>
                    <td>{formatDate(t.bookedAt.slice(0, 10))}</td>
                    <td>
                      <div className="person-name">{t.description}</div>
                      <div className="muted small">
                        <code>{t.providerTxnId}</code>
                      </div>
                    </td>
                    <td>{t.counterparty}</td>
                    <td>
                      <StatusPill tone={t.status === 'pending' ? 'attention' : 'healthy'}>
                        {t.status}
                      </StatusPill>
                    </td>
                    <td>
                      {matched ? (
                        <StatusPill tone="healthy">Matched</StatusPill>
                      ) : t.direction === 'credit' ? (
                        <StatusPill tone="neutral">Funding receipt</StatusPill>
                      ) : (
                        <StatusPill tone="attention">Unmatched</StatusPill>
                      )}
                    </td>
                    <td className="num">
                      <span className={t.direction === 'credit' ? 'bank-credit' : 'bank-debit'}>
                        {t.direction === 'credit' ? '+' : '−'}
                        <MoneyText amountMinor={Math.abs(signed)} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Funding receipts appear for reconciliation context only. Veyvio is a cost-control
          system — income is not tracked as a budget category.
        </p>
      </section>

      {/* ── Open Banking integration status ── */}
      <section className="panel">
        <h2>Open Banking connection</h2>
        {isDemo ? (
          <div className="callout info">
            <strong>Demo feed active.</strong> To connect a live bank account, an authorised Open
            Banking provider (TrueLayer, Yapily or Plaid) must be configured. Veyvio will never
            receive banking passwords or security codes — the company authenticates directly with
            their bank, and the authorised provider returns a read-only access token to Veyvio.
            See <Link to="/settings">Settings → Bank connection</Link>.
          </div>
        ) : (
          <div>
            <dl className="kv-list">
              <dt>Provider</dt>
              <dd>{bankConnection?.institutionName ?? bankConnection?.providerId ?? '—'}</dd>
              <dt>Status</dt>
              <dd>{bankConnection?.status ?? '—'}</dd>
              <dt>Connected</dt>
              <dd>{bankConnection?.connectedAt ? formatDate(bankConnection.connectedAt.slice(0, 10)) : '—'}</dd>
              <dt>Scopes</dt>
              <dd>{bankConnection?.scopes?.join(', ') || '—'}</dd>
            </dl>
            <p className="muted small">
              Last sync {formatFeedAge(snapshot.feedAgeSeconds)}. Only read-only Account Information
              Service scopes are active. Payment initiation is not enabled.
            </p>
            <div style={{ marginTop: '0.75rem' }}>
              <Link to="/settings" className="btn">
                Manage connection
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
