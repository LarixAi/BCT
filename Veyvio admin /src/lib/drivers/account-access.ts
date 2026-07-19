import type { AccountStatus, SuspendReasonCategory } from './types'

/** Normalize live DB / legacy statuses onto the Access & Security lifecycle. */
export function normalizeAccountStatus(status: string | null | undefined): AccountStatus {
  switch (status) {
    case 'not_created':
      return 'draft'
    case 'invite_pending':
    case 'invitation_sent':
      return 'invitation_pending'
    case 'registration_started':
      return 'setup_incomplete'
    case 'suspended':
      return 'temporarily_suspended'
    case 'disabled':
      return 'archived'
    default:
      return (status as AccountStatus) || 'draft'
  }
}

/** Account states where an invitation can be created or resent. */
export const INVITABLE_ACCOUNT_STATUSES: AccountStatus[] = [
  'draft',
  'invitation_pending',
  'invitation_expired',
]

/** Account states where the driver may open the app (including limited/read-only). */
export const SIGN_IN_ALLOWED_ACCOUNT_STATUSES: AccountStatus[] = [
  'setup_incomplete',
  'pending_approval',
  'active',
  'compliance_restricted',
  'password_reset_required',
]

/** Account states that block duty start regardless of eligibility. */
export const DUTY_BLOCKED_ACCOUNT_STATUSES: AccountStatus[] = [
  'draft',
  'invitation_pending',
  'setup_incomplete',
  'pending_approval',
  'temporarily_suspended',
  'compliance_restricted',
  'locked',
  'offboarded',
  'archived',
  'invitation_expired',
  'password_reset_required',
]

export const SUSPEND_REASON_OPTIONS: { value: SuspendReasonCategory; label: string }[] = [
  { value: 'employment_issue', label: 'Employment issue' },
  { value: 'safeguarding_concern', label: 'Safeguarding concern' },
  { value: 'security_concern', label: 'Security concern' },
  { value: 'compliance_failure', label: 'Compliance failure' },
  { value: 'driver_requested', label: 'Driver requested' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'other', label: 'Other' },
]

export function canInviteAccountStatus(status: string): boolean {
  return INVITABLE_ACCOUNT_STATUSES.includes(normalizeAccountStatus(status))
}

export function canSignInWithAccountStatus(status: string): boolean {
  return SIGN_IN_ALLOWED_ACCOUNT_STATUSES.includes(normalizeAccountStatus(status))
}

export function isAccountSuspended(status: string): boolean {
  return normalizeAccountStatus(status) === 'temporarily_suspended'
}

export function isAccountOffboarded(status: string): boolean {
  const normalized = normalizeAccountStatus(status)
  return normalized === 'offboarded' || normalized === 'archived'
}

export function authenticationMethodLabel(
  method: import('./types').DriverAuthMethod,
  passkeyEnabled: boolean,
  mfaEnabled: boolean,
): string {
  if (method === 'passkey_and_biometric') return 'Passkey + biometric'
  if (method === 'passkey') return 'Passkey'
  if (method === 'password_and_mfa' || (method === 'password' && mfaEnabled)) return 'Password + MFA'
  if (method === 'password') return passkeyEnabled ? 'Password (passkey available)' : 'Password'
  if (passkeyEnabled) return 'Passkey'
  if (mfaEnabled) return 'Password + MFA'
  return 'Not configured'
}
