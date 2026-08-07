import { describe, expect, it } from 'vitest'
import { resolveInspectionsHub } from './resolve-hub'

describe('resolveInspectionsHub', () => {
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

  it('falls back to demo seed when live and profiles fail in development', async () => {
    const resolved = await resolveInspectionsHub({
      fetchLiveHub: async () => {
        throw new Error('hub missing')
      },
      fetchProfiles: async () => {
        throw new Error('profiles missing')
      },
    })
    // Vitest runs with import.meta.env.DEV=true, so demo seed remains available locally.
    expect(resolved.source).toBe('demo')
    expect(resolved.hub.register.length).toBeGreaterThan(0)
  })
})
