import { refreshDemoBankFeed } from '../../domain/bank-account'
import type { OrganisationId } from '../../domain/types'
import type {
  BankConnection,
  BankFeedAdapter,
  BankFeedSyncResult,
} from './types'

/** Local demo adapter — no partner network calls. */
export function createDemoBankAdapter(): BankFeedAdapter {
  return {
    providerId: 'demo',
    displayName: 'Demo live feed',
    supportsPaymentInitiation: false,

    async startConsent(input) {
      const connection: BankConnection = {
        id: crypto.randomUUID(),
        organisationId: input.organisationId,
        providerId: 'demo',
        status: 'awaiting_consent',
        externalConnectionId: `demo_${input.organisationId}`,
        institutionName: 'Demo Bank',
        scopes: ['accounts', 'balance', 'transactions'],
        connectedAt: null,
        lastError: null,
        secretStorage: 'demo_memory',
      }
      return {
        connection,
        consentUrl: `${input.redirectUri}${input.redirectUri.includes('?') ? '&' : '?'}bank_sandbox=1&state=demo`,
        state: 'demo',
      }
    },

    async completeConsent(input) {
      return {
        ...input.connection,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        lastError: null,
        institutionName: input.connection.institutionName ?? 'Demo Bank',
      }
    },

    async sync(input): Promise<BankFeedSyncResult> {
      const now = new Date().toISOString()
      const accounts = input.existingAccounts.map((account) => {
        const refreshed = refreshDemoBankFeed({
          account: {
            ...account,
            feedMode: 'demo_live',
            connectionLabel: 'Demo live feed (no Open Banking partner)',
          },
          transactions: [],
          nowIso: now,
        })
        return refreshed.account
      })
      return {
        accounts,
        transactions: [],
        syncedAt: now,
        providerRequestId: `demo_sync_${now}`,
      }
    },

    async disconnect(input) {
      return {
        ...input.connection,
        status: 'revoked',
        externalConnectionId: null,
        connectedAt: null,
        lastError: null,
        secretStorage: 'none',
      }
    },
  }
}

export function assertOrg(organisationId: OrganisationId, connection: BankConnection) {
  if (connection.organisationId !== organisationId) {
    throw new Error('Bank connection organisation mismatch')
  }
}
