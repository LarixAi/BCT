import { describe, expect, it, vi } from 'vitest'
import { resolveFleetResourcesHub } from './resolve-hub'
import { emptyFleetResourcesHub } from './empty-hub'

describe('resolveFleetResourcesHub F-03', () => {
  it('returns live hub as-is without inventing kit on sparse registers', async () => {
    const live = emptyFleetResourcesHub()
    const fetchProfiles = vi.fn(async () => {
      throw new Error('profiles must not be required for live sparse hubs')
    })
    const resolved = await resolveFleetResourcesHub({
      fetchLiveHub: async () => live,
      fetchProfiles,
    })
    expect(resolved.source).toBe('live')
    expect(resolved.hub.equipment).toEqual([])
    expect(resolved.hub.cards).toEqual([])
    expect(fetchProfiles).not.toHaveBeenCalled()
  })

  it('fails closed to empty when live fails and mock is off', async () => {
    const resolved = await resolveFleetResourcesHub({
      fetchLiveHub: async () => {
        throw new Error('network')
      },
    })
    expect(resolved.source).toBe('empty')
    expect(resolved.hub.equipment).toEqual([])
  })
})
