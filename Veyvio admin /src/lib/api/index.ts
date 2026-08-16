import { isMockApi } from './config'
import { ApiClient } from './real-client'

export { isMockApi }
export type { ApiClient }

const realClient = new ApiClient()

/**
 * Unified API — live Command by default.
 * Mock client is dynamically imported only when VITE_MOCK_API=true so production
 * bundles can drop the mock graph (F-03 / TD-020).
 *
 * Wave 3E-1: live client never hydrates credentials from localStorage.
 */
const mockModule =
  import.meta.env.VITE_MOCK_API === 'true' ? await import('./mock-client') : null

export const api = mockModule ? mockModule.mockApi : realClient

if (typeof window !== 'undefined') {
  // Purge pre-3E-1 credential leftovers on every boot.
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')

  if (mockModule && isMockApi) {
    const MOCK_TOKEN = mockModule.MOCK_TOKEN
    const token = sessionStorage.getItem('mock_access_token')
    if (token === MOCK_TOKEN) {
      mockModule.mockApi.setToken(token, sessionStorage.getItem('has_tenant') === '1')
    }
  }
}

/** Production: pages.dev is not a session host — send users to the canonical Command origin. */
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  const host = window.location.hostname.toLowerCase()
  if (host.endsWith('.pages.dev')) {
    const target = `https://command.veyvio.co.uk${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.replace(target)
  }
}
