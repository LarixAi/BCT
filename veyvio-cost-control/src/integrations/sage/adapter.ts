import { requireOrganisationId } from '../../domain/tenancy'
import type { OrganisationId } from '../../domain/types'
import type { FinanceSession } from '../../repositories/cost-control-repository'
import type {
  SageCodeMapping,
  SageConnection,
  SageExportException,
  SagePostingResult,
  SageProductId,
  SageSupplierCostExport,
  SageWageJournalExport,
} from './types'

export type SageIntegrationConfig = {
  mode: 'disconnected' | 'sandbox' | 'connected'
  productId: SageProductId
  tokenProxyBaseUrl: string | null
  redirectUri: string
  clientIdPublic: string | null
}

export type SageConsentStart = {
  consentUrl: string
  state: string
}

export type SageExportReceipt = {
  exportId: string
  idempotencyKey: string
  status: 'queued' | 'accepted'
  sageTransactionId: string | null
}

export type SageAdapter = {
  getConnection(session: FinanceSession): Promise<SageConnection>
  getMappings(session: FinanceSession): Promise<SageCodeMapping[]>
  getExceptions(session: FinanceSession): Promise<SageExportException[]>
  getPosting(session: FinanceSession, veyvioCostId: string): Promise<SagePostingResult | null>
  startConsent(session: FinanceSession): Promise<SageConsentStart>
  completeConsent(
    session: FinanceSession,
    input: { state: string; authorizationCode: string },
  ): Promise<SageConnection>
  exportSupplierCost(
    session: FinanceSession,
    payload: SageSupplierCostExport,
  ): Promise<SageExportReceipt>
  exportWageJournal(
    session: FinanceSession,
    payload: SageWageJournalExport,
  ): Promise<SageExportReceipt>
  revokeConsent(session: FinanceSession): Promise<void>
}

function required(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} is required`)
  return trimmed
}

function assertSession(session: FinanceSession): void {
  requireOrganisationId(session.activeOrganisationId)
  required(session.userSubject, 'Authenticated user subject')
  required(session.accessToken, 'Finance API access token')
}

export function readSageIntegrationConfig(
  env: Record<string, string | undefined> = import.meta.env as Record<
    string,
    string | undefined
  >,
): SageIntegrationConfig {
  const rawMode = env.VITE_SAGE_MODE?.trim().toLowerCase()
  const mode: SageIntegrationConfig['mode'] =
    rawMode === 'sandbox' || rawMode === 'connected' ? rawMode : 'disconnected'
  const allowedProducts: SageProductId[] = [
    'undecided',
    'sage_accounting',
    'sage_50',
    'sage_payroll',
    'sage_50_payroll',
    'sage_intacct',
  ]
  const rawProduct = env.VITE_SAGE_PRODUCT?.trim().toLowerCase() as SageProductId
  const productId = allowedProducts.includes(rawProduct) ? rawProduct : 'undecided'
  return {
    mode,
    productId,
    tokenProxyBaseUrl: env.VITE_SAGE_TOKEN_PROXY_URL?.trim() || null,
    redirectUri:
      env.VITE_SAGE_REDIRECT_URI?.trim() ||
      `${globalThis.location?.origin ?? 'http://localhost:5176'}/settings?sage_callback=1`,
    clientIdPublic: env.VITE_SAGE_CLIENT_ID?.trim() || null,
  }
}

export function createSageAdapter(input: {
  config: SageIntegrationConfig
  fetchImpl?: typeof fetch
}): SageAdapter {
  const { config } = input
  if (config.mode === 'disconnected') {
    throw new Error('Sage integration is disconnected')
  }
  if (config.productId === 'undecided') {
    throw new Error('Select the accountant-approved Sage product before connecting')
  }
  const baseUrl = required(config.tokenProxyBaseUrl ?? '', 'Sage token proxy URL').replace(
    /\/+$/,
    '',
  )
  const fetchImpl = input.fetchImpl ?? fetch

  async function request<T>(
    session: FinanceSession,
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    assertSession(session)
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'X-Veyvio-Organisation-ID': session.activeOrganisationId,
        'X-Veyvio-Sage-Product': config.productId,
        ...init.headers,
      },
    })
    if (!response.ok) {
      throw new Error(`Sage proxy request failed (${response.status})`)
    }
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  return {
    getConnection: (session) => request(session, '/sage/connection'),
    getMappings: (session) => request(session, '/sage/mappings'),
    getExceptions: (session) => request(session, '/sage/exceptions'),
    getPosting: (session, veyvioCostId) =>
      request(session, `/sage/postings/${encodeURIComponent(required(veyvioCostId, 'Veyvio cost ID'))}`),
    startConsent: (session) =>
      request(session, '/sage/consent/start', {
        method: 'POST',
        body: JSON.stringify({ redirectUri: config.redirectUri }),
      }),
    completeConsent: (session, consent) =>
      request(session, '/sage/consent/complete', {
        method: 'POST',
        body: JSON.stringify({
          state: required(consent.state, 'OAuth state'),
          authorizationCode: required(consent.authorizationCode, 'Authorization code'),
          redirectUri: config.redirectUri,
        }),
      }),
    exportSupplierCost: (session, payload) =>
      request(session, '/sage/exports/supplier-cost', {
        method: 'POST',
        headers: { 'Idempotency-Key': required(payload.idempotencyKey, 'Idempotency key') },
        body: JSON.stringify(payload),
      }),
    exportWageJournal: (session, payload) =>
      request(session, '/sage/exports/wage-journal', {
        method: 'POST',
        headers: { 'Idempotency-Key': required(payload.idempotencyKey, 'Idempotency key') },
        body: JSON.stringify(payload),
      }),
    revokeConsent: (session) =>
      request(session, '/sage/consent/revoke', { method: 'POST', body: '{}' }),
  }
}

export function sageConnectionOrganisationId(
  session: FinanceSession,
): OrganisationId {
  assertSession(session)
  return session.activeOrganisationId
}

