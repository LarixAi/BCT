/**
 * Pure membership/support access decision used by authenticate().
 * Wave 3A — forged/stale/removed membership must deny without client fallbacks.
 */

export type MembershipAccessDecision =
  | { allow: true; via: 'membership' }
  | { allow: true; via: 'support' }
  | { allow: false; reason: 'membership_inactive' | 'membership_missing' | 'no_support_grant' }

export function decideTenantMembershipAccess(input: {
  membership: { id?: string | null; status?: string | null } | null | undefined
  hasSupportGrant: boolean
}): MembershipAccessDecision {
  const status = String(input.membership?.status ?? '').trim().toLowerCase()
  if (input.membership && status === 'active') {
    return { allow: true, via: 'membership' }
  }
  if (input.hasSupportGrant) {
    return { allow: true, via: 'support' }
  }
  if (input.membership && status && status !== 'active') {
    return { allow: false, reason: 'membership_inactive' }
  }
  if (!input.membership) {
    return { allow: false, reason: 'membership_missing' }
  }
  return { allow: false, reason: 'no_support_grant' }
}
