import { cn } from '@/lib/cn'

const STATUS_STYLES: Record<string, string> = {
  on_duty: 'bg-ready/15 text-ready',
  available: 'bg-command-50 text-command-700',
  unavailable: 'bg-page text-muted',
  in_service: 'bg-ready/15 text-ready',
  off_road: 'bg-vor/15 text-vor',
  in_progress: 'bg-ready/15 text-ready',
  assigned: 'bg-command-50 text-command-700',
  unassigned: 'bg-attention/15 text-attention',
  completed: 'bg-page text-muted',
  open: 'bg-attention/15 text-attention',
  investigating: 'bg-command-50 text-command-700',
  resolved: 'bg-page text-muted',
  closed: 'bg-page text-muted',
  pass: 'bg-ready/15 text-ready',
  fail: 'bg-critical/15 text-critical',
  advisory: 'bg-attention/15 text-attention',
  expired: 'bg-critical/15 text-critical',
  expiring_soon: 'bg-attention/15 text-attention',
  action_required: 'bg-critical/15 text-critical',
  valid: 'bg-ready/15 text-ready',
  low: 'bg-page text-muted',
  normal: 'bg-page text-muted',
  high: 'bg-critical/15 text-critical',
  critical: 'bg-critical/15 text-critical',
  medium: 'bg-attention/15 text-attention',
  active: 'bg-ready/15 text-ready',
  invited: 'bg-command-50 text-command-700',
  inactive: 'bg-page text-muted',
  invite_pending: 'bg-command-50 text-command-700',
  invitation_pending: 'bg-command-50 text-command-700',
  not_created: 'bg-page text-muted',
  draft: 'bg-page text-muted',
  registration_started: 'bg-command-50 text-command-700',
  setup_incomplete: 'bg-command-50 text-command-700',
  pending_approval: 'bg-attention/15 text-attention',
  locked: 'bg-critical/15 text-critical',
  password_reset_required: 'bg-attention/15 text-attention',
  suspended: 'bg-critical/15 text-critical',
  temporarily_suspended: 'bg-critical/15 text-critical',
  compliance_restricted: 'bg-attention/15 text-attention',
  disabled: 'bg-page text-muted',
  offboarded: 'bg-page text-muted',
  archived: 'bg-page text-muted',
  compliant: 'bg-ready/15 text-ready',
  compliant_with_warnings: 'bg-attention/15 text-attention',
  documents_expiring_soon: 'bg-attention/15 text-attention',
  missing_information: 'bg-attention/15 text-attention',
  under_review: 'bg-command-50 text-command-700',
  non_compliant: 'bg-critical/15 text-critical',
  verification_failed: 'bg-critical/15 text-critical',
  eligible: 'bg-ready/15 text-ready',
  eligible_with_warning: 'bg-attention/15 text-attention',
  not_eligible: 'bg-critical/15 text-critical',
  restricted: 'bg-attention/15 text-attention',
  onboarding: 'bg-command-50 text-command-700',
  pending_compliance: 'bg-attention/15 text-attention',
  invitation_sent: 'bg-command-50 text-command-700',
  invitation_expired: 'bg-attention/15 text-attention',
  left_company: 'bg-page text-muted',
  awaiting_approval: 'bg-command-50 text-command-700',
  emergency_override_active: 'bg-[#7A5AF8]/15 text-[#7A5AF8]',
  off_duty: 'bg-page text-muted',
  on_trip: 'bg-ready/15 text-ready',
  checking_in: 'bg-command-50 text-command-700',
  on_break: 'bg-page text-muted',
  finishing_duty: 'bg-command-50 text-command-700',
  signed_out: 'bg-page text-muted',
  verified: 'bg-ready/15 text-ready',
  awaiting_review: 'bg-attention/15 text-attention',
  not_supplied: 'bg-page text-muted',
  uploaded: 'bg-command-50 text-command-700',
  rejected: 'bg-critical/15 text-critical',
  revoked: 'bg-critical/15 text-critical',
  replaced: 'bg-page text-muted',
  complete: 'bg-ready/15 text-ready',
  missing: 'bg-critical/15 text-critical',
  due_soon: 'bg-attention/15 text-attention',
  failed: 'bg-critical/15 text-critical',
  connected: 'bg-ready/15 text-ready',
  disconnected: 'bg-page text-muted',
  scheduled: 'bg-command-50 text-command-700',
  overdue: 'bg-critical/15 text-critical',
  awaiting_onboarding: 'bg-attention/15 text-attention',
  temporarily_inactive: 'bg-page text-muted',
  no_known_issues: 'bg-ready/15 text-ready',
  repair_required: 'bg-attention/15 text-attention',
  safety_critical: 'bg-critical/15 text-critical',
  awaiting_assessment: 'bg-command-50 text-command-700',
  blocked: 'bg-critical/15 text-critical',
  released: 'bg-ready/15 text-ready',
  released_with_warning: 'bg-attention/15 text-attention',
  restricted_use: 'bg-attention/15 text-attention',
  manual_authorisation_required: 'bg-attention/15 text-attention',
  vor: 'bg-vor/15 text-vor',
  operational: 'bg-ready/15 text-ready',
  planned: 'bg-command-50 text-command-700',
  maintenance_warning: 'bg-attention/15 text-attention',
  ready: 'bg-ready/15 text-ready',
  attention: 'bg-attention/15 text-attention',
  on_file: 'bg-ready/15 text-ready',
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase().replace(/\s+/g, '_')
  return (
    <span
      className={cn(
        'inline-flex rounded px-2 py-0.5 text-xs font-medium capitalize',
        STATUS_STYLES[key] ?? 'bg-page text-muted',
        className,
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function expiryTone(date: string | null | undefined): 'ok' | 'warning' | 'expired' {
  if (!date) return 'ok'
  const t = new Date(date).getTime()
  const now = Date.now()
  if (t < now) return 'expired'
  if (t < now + 30 * 24 * 60 * 60 * 1000) return 'warning'
  return 'ok'
}

export function formatDate(date: string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
