import { describe, expect, it } from 'vitest'
import { createDemoAuthAdapter, DEMO_AUTH_EMAIL } from './demo-adapter'

describe('demo authentication adapter', () => {
  it('keeps the session in memory and returns finance membership', async () => {
    const adapter = createDemoAuthAdapter()
    expect(await adapter.getIdentity()).toBeNull()
    const result = await adapter.signIn({
      email: DEMO_AUTH_EMAIL,
      password: 'demo-access',
    })
    expect(result.kind).toBe('signed_in')
    if (result.kind !== 'signed_in') throw new Error('Expected signed-in identity')
    const identity = result.identity
    expect(identity.memberships[0]).toMatchObject({
      organisationId: 'org_demo_cec',
      role: 'finance_manager',
    })
    expect(await adapter.getIdentity()).toEqual(identity)
    await adapter.signOut()
    expect(await adapter.getIdentity()).toBeNull()
  })

  it('uses one safe error for invalid sign-in credentials', async () => {
    const adapter = createDemoAuthAdapter()
    await expect(
      adapter.signIn({ email: 'unknown@example.test', password: 'long-enough' }),
    ).rejects.toThrow('Email or password is incorrect')
  })

  it('does not reveal whether a reset email exists', async () => {
    const adapter = createDemoAuthAdapter()
    await expect(
      adapter.requestPasswordReset('unknown@example.test'),
    ).resolves.toBeUndefined()
  })

  it('rejects invalid reset and invitation tokens', async () => {
    const adapter = createDemoAuthAdapter()
    await expect(
      adapter.updatePassword({ resetToken: '', password: 'new-password' }),
    ).rejects.toThrow(/invalid or expired/i)
    await expect(
      adapter.acceptInvitation({
        invitationToken: '',
        displayName: 'New User',
        password: 'new-password',
      }),
    ).rejects.toThrow(/invalid or expired/i)
  })
})
