import type { BankAccount, BankFeedMode, BankTransaction } from '../../domain/bank-account'
import type { OrganisationId } from '../../domain/types'
import { isViteProduction, type ViteLikeEnv } from '../../lib/vite-env'

/**
 * Integration adapter contract — Blueprint §12.9.
 * Domain never imports provider field names; only adapters do.
 */

export type BankProviderId =
  | 'demo'
  | 'truelayer_sandbox'
  | 'truelayer'
  | 'yapily_sandbox'
  | 'yapily'
  | 'generic_ais'

export type BankConnectionStatus =
  | 'disconnected'
  | 'awaiting_consent'
  | 'connected'
  | 'error'
  | 'revoked'

export type BankConnection = {
  id: string
  organisationId: OrganisationId
  providerId: BankProviderId
  status: BankConnectionStatus
  /** Partner connection / consent id — not a bank password. */
  externalConnectionId: string | null
  institutionName: string | null
  scopes: string[]
  connectedAt: string | null
  lastError: string | null
  /** Where tokens live — never in the browser for production. */
  secretStorage: 'none' | 'demo_memory' | 'server_vault'
}

export type BankFeedSyncResult = {
  accounts: BankAccount[]
  transactions: BankTransaction[]
  syncedAt: string
  providerRequestId: string
}

export type BankConsentStartResult = {
  connection: BankConnection
  /** Partner-hosted consent URL (or sandbox placeholder). */
  consentUrl: string
  state: string
}

/** Read-only AIS capabilities — payment initiation is excluded. */
export type BankFeedAdapter = {
  readonly providerId: BankProviderId
  readonly displayName: string
  readonly supportsPaymentInitiation: false

  startConsent(input: {
    organisationId: OrganisationId
    institutionHint?: string
    redirectUri: string
  }): Promise<BankConsentStartResult>

  completeConsent(input: {
    organisationId: OrganisationId
    connection: BankConnection
    /** OAuth state / sandbox token from redirect. */
    callbackState: string
    authorizationCode?: string
  }): Promise<BankConnection>

  sync(input: {
    organisationId: OrganisationId
    connection: BankConnection
    existingAccounts: BankAccount[]
  }): Promise<BankFeedSyncResult>

  disconnect(input: {
    organisationId: OrganisationId
    connection: BankConnection
  }): Promise<BankConnection>
}

export type BankIntegrationConfig = {
  mode: BankFeedMode
  providerId: BankProviderId
  /** Backend proxy that holds client secrets — required for real Open Banking. */
  tokenProxyBaseUrl: string | null
  redirectUri: string
  clientIdPublic: string | null
  /** Optional Command/Finance access token for authenticated proxy calls. */
  accessToken?: string | null
}

export function readBankIntegrationConfig(
  env: ViteLikeEnv = import.meta.env,
): BankIntegrationConfig {
  const isProduction = isViteProduction(env)
  const modeRaw = String(env.VITE_BANK_FEED_MODE ?? '').toLowerCase()
  const mode: BankFeedMode =
    modeRaw === 'open_banking' ||
    modeRaw === 'manual_csv' ||
    modeRaw === 'disconnected' ||
    modeRaw === 'demo_live'
      ? (modeRaw as BankFeedMode)
      : isProduction
        ? 'disconnected'
        : 'demo_live'

  if (isProduction && !modeRaw) {
    throw new Error(
      'VITE_BANK_FEED_MODE must be set explicitly in production (open_banking | manual_csv | disconnected).',
    )
  }

  const providerRaw = String(env.VITE_BANK_PROVIDER ?? 'truelayer_sandbox').toLowerCase()
  const providerId = (['truelayer_sandbox', 'truelayer', 'yapily_sandbox', 'yapily', 'generic_ais', 'demo'].includes(
    providerRaw,
  )
    ? providerRaw
    : 'truelayer_sandbox') as BankProviderId

  return {
    mode,
    providerId: mode === 'demo_live' ? 'demo' : providerId,
    tokenProxyBaseUrl: String(env.VITE_BANK_TOKEN_PROXY_URL ?? '').trim() || null,
    redirectUri:
      String(env.VITE_BANK_REDIRECT_URI ?? '').trim() ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/settings?bank_callback=1`
        : 'http://localhost:5176/settings?bank_callback=1'),
    clientIdPublic: String(env.VITE_BANK_CLIENT_ID ?? '').trim() || null,
  }
}

export function emptyBankConnection(organisationId: OrganisationId): BankConnection {
  return {
    id: 'bank_conn_none',
    organisationId,
    providerId: 'demo',
    status: 'disconnected',
    externalConnectionId: null,
    institutionName: null,
    scopes: [],
    connectedAt: null,
    lastError: null,
    secretStorage: 'none',
  }
}
