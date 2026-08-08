import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveInspectionsHub } from './resolve-hub'

describe('resolveInspectionsHub', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses live hub when fetch succeeds', async () => {
    const resolved = await resolveInspectionsHub({
      fetchLiveHub: async () => ({
        summary: {
          dueToday: 1,
          dueWithin7Days: 0,
          overdue: 0,
          inProgress: 0,
          awaitingRectification: 0,
          awaitingSignOff: 0,
          failedVor: 0,
          complianceRate90d: 100,
        },
        register: [],
        calendar: [],
        providers: [],
      }),
      fetchProfiles: async () => {
        throw new Error('should not call')
      },
    })
    expect(resolved.source).toBe('live')
    expect(resolved.hub.summary.dueToday).toBe(1)
  })

  it('fails closed to empty when live and profiles fail and mock is off (F-03)', async () => {
    vi.stubEnv('VITE_MOCK_API', 'false')
    const resolved = await resolveInspectionsHub({
      fetchLiveHub: async () => {
        throw new Error('hub missing')
      },
      fetchProfiles: async () => {
        throw new Error('profiles missing')
      },
    })
    expect(resolved.source).toBe('empty')
    expect(resolved.hub.register).toEqual([])
    expect(resolved.hub.providers).toEqual([])
  })

  it('uses demo seed only when VITE_MOCK_API is true', async () => {
    vi.stubEnv('VITE_MOCK_API', 'true')
    const resolved = await resolveInspectionsHub({
      fetchLiveHub: async () => {
        throw new Error('hub missing')
      },
      fetchProfiles: async () => {
        throw new Error('profiles missing')
      },
    })
    expect(resolved.source).toBe('demo')
    expect(resolved.hub.register.length).toBeGreaterThan(0)
  })
})
