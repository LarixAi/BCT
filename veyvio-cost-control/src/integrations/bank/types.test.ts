import { describe, expect, it } from 'vitest'
import { readBankIntegrationConfig } from './types'
import { isViteProduction } from '../../lib/vite-env'

describe('bank integration env', () => {
  it('treats Vite boolean PROD as production without string/boolean comparison errors', () => {
    expect(isViteProduction({ PROD: true, MODE: 'production' })).toBe(true)
    expect(isViteProduction({ PROD: 'true', MODE: 'production' })).toBe(true)
    expect(isViteProduction({ PROD: false, MODE: 'development' })).toBe(false)
  })

  it('requires an explicit mode in production and stays disconnected', () => {
    expect(() =>
      readBankIntegrationConfig({ PROD: true, MODE: 'production' }),
    ).toThrow(/VITE_BANK_FEED_MODE/)
    expect(
      readBankIntegrationConfig({
        PROD: true,
        MODE: 'production',
        VITE_BANK_FEED_MODE: 'disconnected',
      }).mode,
    ).toBe('disconnected')
  })

  it('keeps sandbox/open banking explicit and isolates demo_live to non-production', () => {
    expect(
      readBankIntegrationConfig({
        PROD: false,
        MODE: 'development',
        VITE_BANK_FEED_MODE: 'open_banking',
        VITE_BANK_PROVIDER: 'truelayer_sandbox',
      }).mode,
    ).toBe('open_banking')
    expect(
      readBankIntegrationConfig({
        PROD: false,
        MODE: 'development',
        VITE_BANK_FEED_MODE: 'demo_live',
      }).mode,
    ).toBe('demo_live')
  })
})
