/**
 * Wave 3C — support workspace identity (pure helpers).
 * Support enters a tenant only via an active attributable grant; never via
 * empty/placeholder membership or ordinary membership impersonation.
 */

export type WorkspaceAuthority = 'membership' | 'support' | 'none'

export type SupportGrantSnapshot = {
  id: string
  companyId: string
  accessLevel?: string | null
  expiresAt?: string | null
  revokedAt?: string | null
  startsAt?: string | null
}

export type SupportWorkspaceDecision =
  | {
      ok: true
      workspaceAuthority: 'support'
      companyId: string
      membershipId: null
      supportGrantId: string
      roleKeys: ['support']
      roleKey: 'support'
      permissions: []
    }
  | {
      ok: false
      code:
        | 'support_grant_missing'
        | 'support_grant_inactive'
        | 'support_company_mismatch'
        | 'support_fake_membership'
        | 'support_platform_required'
      message: string
    }

export function isSupportGrantActive(
  grant: {
    expiresAt?: string | null
    revokedAt?: string | null
    startsAt?: string | null
  } | null,
  nowMs: number = Date.now(),
): boolean {
  if (!grant) return false
  if (grant.revokedAt) return false
  if (!grant.expiresAt) return false
  if (grant.startsAt && new Date(grant.startsAt).getTime() > nowMs) return false
  return new Date(grant.expiresAt).getTime() > nowMs
}

/**
 * Build a support workspace identity from an active grant.
 * membershipId is always null; company comes only from the grant.
 * Client-supplied membership IDs are rejected.
 */
export function decideSupportWorkspaceIdentity(input: {
  platformRole: string | null | undefined
  jwtCompanyId: string | null | undefined
  grant: SupportGrantSnapshot | null | undefined
  /** Any client-supplied membership claim — must be absent for support. */
  clientMembershipId?: string | null
  nowMs?: number
}): SupportWorkspaceDecision {
  if (!input.platformRole) {
    return {
      ok: false,
      code: 'support_platform_required',
      message: 'Support workspace access requires a platform role.',
    }
  }

  const clientMembership = String(input.clientMembershipId ?? '').trim()
  if (clientMembership) {
    return {
      ok: false,
      code: 'support_fake_membership',
      message: 'Support sessions cannot supply or impersonate a company membership.',
    }
  }

  if (!input.grant?.id) {
    return {
      ok: false,
      code: 'support_grant_missing',
      message: 'An active support grant is required for this company.',
    }
  }

  if (!isSupportGrantActive(input.grant, input.nowMs)) {
    return {
      ok: false,
      code: 'support_grant_inactive',
      message: 'The support grant is expired, revoked, or not yet active.',
    }
  }

  const grantCompanyId = String(input.grant.companyId ?? '').trim()
  const jwtCompanyId = String(input.jwtCompanyId ?? '').trim()
  if (!grantCompanyId) {
    return {
      ok: false,
      code: 'support_grant_missing',
      message: 'Support grant is missing a target company.',
    }
  }
  if (jwtCompanyId && jwtCompanyId !== grantCompanyId) {
    return {
      ok: false,
      code: 'support_company_mismatch',
      message: 'JWT company context does not match the active support grant company.',
    }
  }

  return {
    ok: true,
    workspaceAuthority: 'support',
    companyId: grantCompanyId,
    membershipId: null,
    supportGrantId: String(input.grant.id),
    roleKeys: ['support'],
    roleKey: 'support',
    permissions: [],
  }
}

/** Membership workspace identity — never conflate with support. */
export function decideMembershipWorkspaceIdentity(input: {
  companyId: string
  membershipId: string
  roleKeys: string[]
  permissions: string[]
}): {
  ok: true
  workspaceAuthority: 'membership'
  companyId: string
  membershipId: string
  supportGrantId: null
  roleKeys: string[]
  roleKey: string
  permissions: string[]
} {
  const roleKeys = input.roleKeys.filter(Boolean)
  return {
    ok: true,
    workspaceAuthority: 'membership',
    companyId: input.companyId,
    membershipId: input.membershipId,
    supportGrantId: null,
    roleKeys,
    roleKey: roleKeys[0] ?? 'member',
    permissions: input.permissions,
  }
}
