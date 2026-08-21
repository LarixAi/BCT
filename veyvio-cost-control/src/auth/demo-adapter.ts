import type { AuthAdapter, AuthIdentity } from './types'

const DEMO_EMAIL = 'finance@veyvio.test'

function demoIdentity(displayName = 'Demo Finance Manager'): AuthIdentity {
  return {
    userSubject: 'demo-finance-user',
    email: DEMO_EMAIL,
    displayName,
    accessToken: 'demo-memory-token',
    memberships: [
      {
        organisationId: 'org_demo_cec',
        organisationName: 'Demo CEC Operator',
        role: 'finance_manager',
      },
    ],
  }
}

function requirePassword(password: string): void {
  if (password.length < 8) throw new Error('Password must contain at least 8 characters')
}

/** Demonstration identity only. No password or token is persisted. */
export function createDemoAuthAdapter(): AuthAdapter {
  let identity: AuthIdentity | null = null
  return {
    async getIdentity() {
      return identity
    },
    async completeMfa() {
      throw new Error('MFA is not used by the demonstration adapter')
    },
    async selectOrganisation() {
      if (!identity) throw new Error('Session expired — sign in again')
      return identity
    },
    async signIn(input) {
      requirePassword(input.password)
      if (input.email.trim().toLowerCase() !== DEMO_EMAIL) {
        throw new Error('Email or password is incorrect')
      }
      identity = demoIdentity()
      return { kind: 'signed_in', identity }
    },
    async signOut() {
      identity = null
    },
    async requestPasswordReset(_email) {
      // Always succeeds to avoid revealing whether an account exists.
    },
    async updatePassword(input) {
      if (!input.resetToken.trim()) throw new Error('Reset link is invalid or expired')
      requirePassword(input.password)
    },
    async acceptInvitation(input) {
      if (!input.invitationToken.trim()) throw new Error('Invitation is invalid or expired')
      if (!input.displayName.trim()) throw new Error('Your name is required')
      requirePassword(input.password)
      identity = demoIdentity(input.displayName.trim())
      return identity
    },
  }
}

export const DEMO_AUTH_EMAIL = DEMO_EMAIL
