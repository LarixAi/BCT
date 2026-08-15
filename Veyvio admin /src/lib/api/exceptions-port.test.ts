import { describe, expect, it } from 'vitest'
import { ApiClient } from './real-client'
import { MockApiClient } from './mock-client'
import type { ExceptionsPort } from './types'

function assertImplementsExceptionsPort(client: ExceptionsPort): ExceptionsPort {
  return client
}

describe('ExceptionsPort contract', () => {
  it('is implemented by the real Command client', () => {
    expect(assertImplementsExceptionsPort(new ApiClient())).toBeInstanceOf(ApiClient)
  })

  it('is implemented by the mock client and serves exception mutations', async () => {
    const mock = assertImplementsExceptionsPort(new MockApiClient())
    const raised = await mock.raiseException({ title: 'Late sign-on', actorName: 'Dispatch' })
    expect(raised.durableCase).toBe(true)
    expect(raised.status).toBe('new')
    const listed = await mock.getExceptions()
    expect(listed.some((row) => row.id === raised.id)).toBe(true)
    const acknowledged = await mock.acknowledgeException(raised.id, { actorName: 'Dispatch' })
    expect(acknowledged.status).toBe('acknowledged')
  })
})
