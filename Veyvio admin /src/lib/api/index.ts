import { isMockApi } from './config'
import { ApiClient } from './real-client'
import { mockApi, MOCK_TOKEN } from './mock-client'

export { isMockApi }
export type { ApiClient }

/** Unified API — uses mock data in frontend-only mode (default). */
export const api = isMockApi ? mockApi : new ApiClient()

if (typeof window !== 'undefined') {
  const TOKEN_KEY = 'access_token'
  const token = localStorage.getItem(TOKEN_KEY)

  if (isMockApi) {
    // Clear stale tokens from a previous real-API session
    if (token && token !== MOCK_TOKEN) {
      localStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem('has_tenant')
    } else if (token === MOCK_TOKEN) {
      mockApi.setToken(token, sessionStorage.getItem('has_tenant') === '1')
    }
  } else if (token && api instanceof ApiClient) {
    api.setToken(token, sessionStorage.getItem('has_tenant') === '1')
  }
}
