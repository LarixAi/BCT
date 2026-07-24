import { isMockApi } from './config'
import { ApiClient } from './real-client'
import { mockApi, MOCK_TOKEN } from './mock-client'

export { isMockApi }
export type { ApiClient }

const realClient = new ApiClient()

/** Unified API — live Command API by default; mock only when VITE_MOCK_API=true. */
export const api = isMockApi ? mockApi : realClient

if (typeof window !== 'undefined') {
  const TOKEN_KEY = 'access_token'
  const token = localStorage.getItem(TOKEN_KEY)

  if (isMockApi) {
    if (token && token !== MOCK_TOKEN) {
      localStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem('has_tenant')
    } else if (token === MOCK_TOKEN) {
      mockApi.setToken(token, sessionStorage.getItem('has_tenant') === '1')
    }
  } else if (token) {
    realClient.setToken(token, sessionStorage.getItem('has_tenant') === '1')
  }
}
