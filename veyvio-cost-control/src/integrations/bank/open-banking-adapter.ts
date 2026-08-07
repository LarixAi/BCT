import type { BankAccount, BankTransaction } from '../../domain/bank-account'
import type { OrganisationId } from '../../domain/types'
import { assertOrg } from './demo-adapter'
import type {
  BankConsentStartResult,
  BankConnection,
  BankFeedAdapter,
  BankFeedSyncResult,
  BankIntegrationConfig,
  BankProviderId,
} from './types'

/**
 * Open Banking AIS adapter (read-only).
 * - Sandbox: simulates partner consent + maps AIS-shaped payload → domain.
 * - Live: calls token proxy (server holds secrets). Never embeds client_secret in the SPA.
 */

type PartnerAccountDto = {
  account_id: string
  display_name: string
  currency: string
  account_number: { iban?: string; number?: string; sort_code?: string }
  provider: { display_name: string }
  balances?: Array<{ available?: number; current?: number; currency?: string }>
}

type PartnerTransactionDto = {
  transaction_id: string
  timestamp: string
  description: string
  merchant_name?: string
  amount: number
  currency: string
  transaction_type: 'DEBIT' | 'CREDIT'
  status: 'BOOKED' | 'PENDING'
}

type PartnerAccountsResponse = {
  results: PartnerAccountDto[]
  request_id?: string
}

type PartnerTransactionsResponse = {
  results: PartnerTransactionDto[]
  request_id?: string
}

function proxyHeaders(config: BankIntegrationConfig): HeadersInit {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (config.accessToken?.trim()) {
    headers.Authorization = `Bearer ${config.accessToken.trim()}`
  }
  return headers
}

export function createOpenBankingAdapter(
  config: BankIntegrationConfig,
  providerId: BankProviderId = config.providerId,
): BankFeedAdapter {
  const displayName =
    providerId.startsWith('yapily')
      ? 'Yapily (Open Banking AIS)'
      : providerId.startsWith('truelayer')
        ? 'TrueLayer (Open Banking AIS)'
        : 'Open Banking AIS partner'

  return {
    providerId,
    displayName,
    supportsPaymentInitiation: false,

    async startConsent(input): Promise<BankConsentStartResult> {
      const state = crypto.randomUUID()
      const connection: BankConnection = {
        id: crypto.randomUUID(),
        organisationId: input.organisationId,
        providerId,
        status: 'awaiting_consent',
        externalConnectionId: null,
        institutionName: input.institutionHint ?? 'NatWest Business',
        scopes: ['accounts', 'balance', 'transactions'],
        connectedAt: null,
        lastError: null,
        secretStorage: config.tokenProxyBaseUrl ? 'server_vault' : 'demo_memory',
      }

      if (config.tokenProxyBaseUrl) {
        const url = new URL('/bank/consent/start', config.tokenProxyBaseUrl)
        url.searchParams.set('organisation_id', input.organisationId)
        url.searchParams.set('redirect_uri', input.redirectUri)
        url.searchParams.set('state', state)
        if (config.clientIdPublic) url.searchParams.set('client_id', config.clientIdPublic)
        if (input.institutionHint) url.searchParams.set('institution', input.institutionHint)
        return { connection, consentUrl: url.toString(), state }
      }

      const sandboxUrl = new URL(input.redirectUri)
      sandboxUrl.searchParams.set('bank_callback', '1')
      sandboxUrl.searchParams.set('bank_sandbox', '1')
      sandboxUrl.searchParams.set('state', state)
      sandboxUrl.searchParams.set('provider', providerId)
      return { connection, consentUrl: sandboxUrl.toString(), state }
    },

    async completeConsent(input) {
      assertOrg(input.organisationId, input.connection)

      if (config.tokenProxyBaseUrl) {
        const res = await fetch(new URL('/bank/consent/complete', config.tokenProxyBaseUrl), {
          method: 'POST',
          headers: proxyHeaders(config),
          body: JSON.stringify({
            organisation_id: input.organisationId,
            connection_id: input.connection.id,
            code: input.authorizationCode,
            state: input.callbackState,
          }),
        })
        if (!res.ok) {
          const text = await res.text()
          return {
            ...input.connection,
            status: 'error',
            lastError: `Consent exchange failed (${res.status}): ${text.slice(0, 200)}`,
          }
        }
        const body = (await res.json()) as {
          external_connection_id: string
          institution_name?: string
          connection_id?: string
        }
        return {
          ...input.connection,
          id: body.connection_id ?? input.connection.id,
          status: 'connected',
          externalConnectionId: body.external_connection_id,
          institutionName: body.institution_name ?? input.connection.institutionName,
          connectedAt: new Date().toISOString(),
          lastError: null,
          secretStorage: 'server_vault',
        }
      }

      return {
        ...input.connection,
        status: 'connected',
        externalConnectionId: `sandbox_conn_${input.organisationId}`,
        connectedAt: new Date().toISOString(),
        lastError: null,
        institutionName: input.connection.institutionName ?? 'NatWest Business',
        secretStorage: 'demo_memory',
      }
    },

    async sync(input): Promise<BankFeedSyncResult> {
      assertOrg(input.organisationId, input.connection)
      const now = new Date().toISOString()

      if (config.tokenProxyBaseUrl && input.connection.secretStorage === 'server_vault') {
        const accountsRes = await fetch(
          new URL(
            `/bank/accounts?organisation_id=${encodeURIComponent(input.organisationId)}&connection_id=${encodeURIComponent(input.connection.externalConnectionId ?? '')}`,
            config.tokenProxyBaseUrl,
          ),
          { headers: proxyHeaders(config) },
        )
        if (!accountsRes.ok) {
          throw new Error(`Bank sync failed (${accountsRes.status})`)
        }
        const accountsBody = (await accountsRes.json()) as PartnerAccountsResponse
        const accounts = accountsBody.results.map((row) =>
          mapPartnerAccount(row, input.organisationId, now, providerId),
        )

        const txns: BankTransaction[] = []
        for (const account of accounts) {
          const txnRes = await fetch(
            new URL(
              `/bank/accounts/${encodeURIComponent(account.id)}/transactions?organisation_id=${encodeURIComponent(input.organisationId)}`,
              config.tokenProxyBaseUrl,
            ),
            { headers: proxyHeaders(config) },
          )
          if (!txnRes.ok) continue
          const txnBody = (await txnRes.json()) as PartnerTransactionsResponse
          txns.push(
            ...txnBody.results.map((row) =>
              mapPartnerTransaction(row, input.organisationId, account.id),
            ),
          )
        }

        return {
          accounts,
          transactions: txns,
          syncedAt: now,
          providerRequestId: accountsBody.request_id ?? `ob_${now}`,
        }
      }

      const fixture = sandboxPartnerPayload(input.organisationId, input.connection)
      const accounts = fixture.accounts.map((row) =>
        mapPartnerAccount(row, input.organisationId, now, providerId),
      )
      const transactions = fixture.transactions.map((row) =>
        mapPartnerTransaction(row.txn, input.organisationId, row.accountId),
      )
      return {
        accounts,
        transactions,
        syncedAt: now,
        providerRequestId: `sandbox_ais_${now}`,
      }
    },

    async disconnect(input) {
      assertOrg(input.organisationId, input.connection)
      if (config.tokenProxyBaseUrl && input.connection.externalConnectionId) {
        await fetch(new URL('/bank/consent/revoke', config.tokenProxyBaseUrl), {
          method: 'POST',
          headers: proxyHeaders(config),
          body: JSON.stringify({
            organisation_id: input.organisationId,
            connection_id: input.connection.externalConnectionId,
          }),
        }).catch(() => undefined)
      }
      return {
        ...input.connection,
        status: 'revoked',
        externalConnectionId: null,
        connectedAt: null,
        lastError: null,
      }
    },
  }
}

function mapPartnerAccount(
  row: PartnerAccountDto,
  organisationId: OrganisationId,
  now: string,
  providerId: BankProviderId,
): BankAccount {
  const available = row.balances?.[0]?.available ?? row.balances?.[0]?.current ?? 0
  const current = row.balances?.[0]?.current ?? available
  const last4 = (row.account_number.number ?? '0000').replace(/\D/g, '').slice(-4) || '0000'
  const sort = (row.account_number.sort_code ?? '000000').replace(/\D/g, '')
  const sortMasked =
    sort.length >= 6 ? `**-**-${sort.slice(-2)}` : '**-**-**'

  return {
    id: row.account_id,
    organisationId,
    displayName: row.display_name,
    institutionName: row.provider.display_name,
    sortCodeMasked: sortMasked,
    accountNumberMasked: `****${last4}`,
    currency: 'GBP',
    balanceMinor: Math.round(available * 100),
    ledgerBalanceMinor: Math.round(current * 100),
    asOf: now,
    feedMode: 'open_banking',
    connectionLabel: `Open Banking AIS via ${providerId.replaceAll('_', ' ')}`,
    lastSyncedAt: now,
    staleAfterSeconds: 900,
  }
}

function mapPartnerTransaction(
  row: PartnerTransactionDto,
  organisationId: OrganisationId,
  accountId: string,
): BankTransaction {
  const amountMinor = Math.round(Math.abs(row.amount) * 100)
  return {
    id: crypto.randomUUID(),
    organisationId,
    accountId,
    bookedAt: row.timestamp,
    description: row.description,
    counterparty: row.merchant_name ?? row.description,
    direction: row.transaction_type === 'CREDIT' ? 'credit' : 'debit',
    amountMinor,
    balanceAfterMinor: null,
    providerTxnId: row.transaction_id,
    matchedCostId: null,
    status: row.status === 'PENDING' ? 'pending' : 'booked',
  }
}

function sandboxPartnerPayload(organisationId: OrganisationId, connection: BankConnection) {
  const accountId = `ob_${organisationId}_current`
  const accounts: PartnerAccountDto[] = [
    {
      account_id: accountId,
      display_name: 'Operating current account',
      currency: 'GBP',
      account_number: { number: '12347821', sort_code: '601544' },
      provider: { display_name: connection.institutionName ?? 'NatWest Business' },
      balances: [{ available: 84620.45, current: 84620.45, currency: 'GBP' }],
    },
  ]
  const transactions: Array<{ accountId: string; txn: PartnerTransactionDto }> = [
    {
      accountId,
      txn: {
        transaction_id: 'obtxn_fuel_1',
        timestamp: '2026-07-28T09:12:00.000Z',
        description: 'ALLSTAR FUEL CARD',
        merchant_name: 'Allstar Business Solutions',
        amount: 5820,
        currency: 'GBP',
        transaction_type: 'DEBIT',
        status: 'BOOKED',
      },
    },
    {
      accountId,
      txn: {
        transaction_id: 'obtxn_rent_1',
        timestamp: '2026-07-28T08:40:00.000Z',
        description: 'WEMBLEY DEPOT ESTATES RENT',
        merchant_name: 'Wembley Depot Estates',
        amount: 5100,
        currency: 'GBP',
        transaction_type: 'DEBIT',
        status: 'BOOKED',
      },
    },
    {
      accountId,
      txn: {
        transaction_id: 'obtxn_grant_1',
        timestamp: '2026-07-27T16:22:00.000Z',
        description: 'GRANT DRAWDOWN JUL',
        merchant_name: 'Local Authority',
        amount: 42000,
        currency: 'GBP',
        transaction_type: 'CREDIT',
        status: 'BOOKED',
      },
    },
    {
      accountId,
      txn: {
        transaction_id: 'obtxn_pending_lease',
        timestamp: '2026-07-29T07:05:00.000Z',
        description: 'PENDING LEX AUTOLEASE',
        merchant_name: 'Lex Autolease',
        amount: 6720,
        currency: 'GBP',
        transaction_type: 'DEBIT',
        status: 'PENDING',
      },
    },
  ]
  return { accounts, transactions }
}
