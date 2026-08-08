import { isMockApi } from './config'
import { ApiClient } from './real-client'

export { isMockApi }
export type { ApiClient }

const realClient = new ApiClient()

/**
 * Unified API — live Command by default.
 * Mock client is dynamically imported only when VITE_MOCK_API=true so production
 * bundles can drop the mock graph (F-03 / TD-020).
 */
const mockModule =
  import.meta.env.VITE_MOCK_API === 'true' ? await import('./mock-client') : null

export const api = mockModule ? mockModule.mockApi : realClient

if (typeof window !== 'undefined') {
  const TOKEN_KEY = 'access_token'
  const token = localStorage.getItem(TOKEN_KEY)

  if (mockModule && isMockApi) {
    const MOCK_TOKEN = mockModule.MOCK_TOKEN
    if (token && token !== MOCK_TOKEN) {
      localStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem('has_tenant')
    } else if (token === MOCK_TOKEN) {
      mockModule.mockApi.setToken(token, sessionStorage.getItem('has_tenant') === '1')
    }
  } else if (token) {
    realClient.setToken(token, sessionStorage.getItem('has_tenant') === '1')
  }
}
