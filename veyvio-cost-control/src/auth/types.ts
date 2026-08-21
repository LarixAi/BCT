import type { FinanceRole } from '../server/finance-api'

export type AuthMembership = {
  organisationId: string
  organisationName: string
  role: FinanceRole
}

export type AuthIdentity = {
  userSubject: string
  email: string
  displayName: string
  accessToken: string
  memberships: AuthMembership[]
}

export type AuthSignInResult =
  | { kind: 'signed_in'; identity: AuthIdentity }
  | {
      kind: 'mfa_required'
      challengeId: string
      pendingCompanyId: string | null
    }

export type AuthAdapter = {
  getIdentity(): Promise<AuthIdentity | null>
  signIn(input: { email: string; password: string }): Promise<AuthSignInResult>
  completeMfa(input: {
    challengeId: string
    code: string
    pendingCompanyId: string | null
  }): Promise<AuthIdentity>
  selectOrganisation(organisationId: string): Promise<AuthIdentity>
  signOut(): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(input: { resetToken: string; password: string }): Promise<void>
  acceptInvitation(input: {
    invitationToken: string
    displayName: string
    password: string
  }): Promise<AuthIdentity | null>
}
