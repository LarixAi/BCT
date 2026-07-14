import { cn } from '@/lib/cn'

const STATUS_STYLES: Record<string, string> = {
  on_duty: 'bg-emerald-100 text-emerald-800',
  available: 'bg-blue-100 text-blue-800',
  unavailable: 'bg-slate-100 text-slate-700',
  in_service: 'bg-emerald-100 text-emerald-800',
  off_road: 'bg-red-100 text-red-800',
  in_progress: 'bg-emerald-100 text-emerald-800',
  assigned: 'bg-blue-100 text-blue-800',
  unassigned: 'bg-amber-100 text-amber-900',
  completed: 'bg-slate-100 text-slate-700',
  open: 'bg-amber-100 text-amber-900',
  investigating: 'bg-blue-100 text-blue-800',
  resolved: 'bg-slate-100 text-slate-700',
  closed: 'bg-slate-100 text-slate-600',
  pass: 'bg-emerald-100 text-emerald-800',
  fail: 'bg-red-100 text-red-800',
  advisory: 'bg-amber-100 text-amber-900',
  expired: 'bg-red-100 text-red-800',
  expiring_soon: 'bg-amber-100 text-amber-900',
  action_required: 'bg-red-100 text-red-800',
  valid: 'bg-emerald-100 text-emerald-800',
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-slate-100 text-slate-700',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-red-100 text-red-800',
  medium: 'bg-orange-100 text-orange-900',
  active: 'bg-emerald-100 text-emerald-800',
  invited: 'bg-blue-100 text-blue-800',
  inactive: 'bg-slate-100 text-slate-600',
  invite_pending: 'bg-blue-100 text-blue-800',
  not_created: 'bg-slate-100 text-slate-600',
  registration_started: 'bg-blue-100 text-blue-800',
  locked: 'bg-red-100 text-red-800',
  password_reset_required: 'bg-amber-100 text-amber-900',
  suspended: 'bg-red-100 text-red-800',
  disabled: 'bg-slate-100 text-slate-600',
  offboarded: 'bg-slate-100 text-slate-600',
  compliant: 'bg-emerald-100 text-emerald-800',
  compliant_with_warnings: 'bg-amber-100 text-amber-900',
  documents_expiring_soon: 'bg-amber-100 text-amber-900',
  missing_information: 'bg-amber-100 text-amber-900',
  under_review: 'bg-blue-100 text-blue-800',
  non_compliant: 'bg-red-100 text-red-800',
  verification_failed: 'bg-red-100 text-red-800',
  eligible: 'bg-emerald-100 text-emerald-800',
  eligible_with_warning: 'bg-amber-100 text-amber-900',
  not_eligible: 'bg-red-100 text-red-800',
  restricted: 'bg-orange-100 text-orange-900',
  awaiting_approval: 'bg-blue-100 text-blue-800',
  emergency_override_active: 'bg-purple-100 text-purple-800',
  off_duty: 'bg-slate-100 text-slate-700',
  on_trip: 'bg-emerald-100 text-emerald-800',
  checking_in: 'bg-blue-100 text-blue-800',
  on_break: 'bg-slate-100 text-slate-700',
  finishing_duty: 'bg-blue-100 text-blue-800',
  signed_out: 'bg-slate-100 text-slate-600',
  verified: 'bg-emerald-100 text-emerald-800',
  awaiting_review: 'bg-amber-100 text-amber-900',
  not_supplied: 'bg-slate-100 text-slate-600',
  uploaded: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  revoked: 'bg-red-100 text-red-800',
  replaced: 'bg-slate-100 text-slate-600',
  complete: 'bg-emerald-100 text-emerald-800',
  missing: 'bg-red-100 text-red-800',
  due_soon: 'bg-amber-100 text-amber-900',
  failed: 'bg-red-100 text-red-800',
  connected: 'bg-emerald-100 text-emerald-800',
  disconnected: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-800',
  overdue: 'bg-red-100 text-red-800',
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase().replace(/\s+/g, '_')
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        STATUS_STYLES[key] ?? 'bg-slate-100 text-slate-700',
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
