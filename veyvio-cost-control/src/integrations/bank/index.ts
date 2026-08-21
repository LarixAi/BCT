import { createDemoBankAdapter } from './demo-adapter'
import { createOpenBankingAdapter } from './open-banking-adapter'
import {
  emptyBankConnection,
  readBankIntegrationConfig,
  type BankConnection,
  type BankFeedAdapter,
  type BankIntegrationConfig,
} from './types'

export function resolveBankAdapter(
  connection: BankConnection,
  config: BankIntegrationConfig = readBankIntegrationConfig(),
): BankFeedAdapter {
  if (connection.status === 'connected' && connection.providerId !== 'demo') {
    return createOpenBankingAdapter(config, connection.providerId)
  }
  if (config.mode === 'open_banking') {
    return createOpenBankingAdapter(config, config.providerId)
  }
  return createDemoBankAdapter()
}

export function getBankIntegrationConfig(): BankIntegrationConfig {
  return readBankIntegrationConfig()
}

export { createDemoBankAdapter, createOpenBankingAdapter, emptyBankConnection }
export type { BankConnection, BankFeedAdapter, BankIntegrationConfig }
