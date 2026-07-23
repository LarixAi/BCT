import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import { APPLICATION_LABELS } from '@/lib/staff/constants'
import { canReviewStaffAccess } from '@/lib/staff/permissions'
import type { StaffHubData } from '@/lib/staff/types'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

export function StaffAccessTab({ hub }: { hub: StaffHubData }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()
  const canReview = canReviewStaffAccess(permissions)

  const completeReview = useMutation({
    mutationFn: (staffId: string) => api.completeStaffAccessReview(staffId, { confirmRolesStillRequired: true }, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-hub'] }),
  })

  const { governanceSummary, ssoPolicy } = hub

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <GovCard label="Access reviews due" value={governanceSummary.accessReviewsDue} />
        <GovCard label="Segregation warnings" value={governanceSummary.segregationWarnings} />
        <GovCard label="Contractors expiring" value={governanceSummary.contractorsExpiring} />
        <GovCard label="MFA non-compliant" value={governanceSummary.mfaNonCompliant} />
        <GovCard label="SSO enabled" value={governanceSummary.ssoEnabledCount} />
      </div>

      <SectionCard title="Identity governance policy" description="Company-wide authentication and access controls">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">SSO provider</dt>
            <dd className="font-medium">{ssoPolicy.enabled ? ssoPolicy.provider : 'Not configured'}</dd>
          </div>
          <div>
            <dt className="text-muted">Elevated MFA</dt>
            <dd className="font-medium">{ssoPolicy.enforcedForElevated ? 'Required for elevated roles' : 'Optional'}</dd>
          </div>
          <div>
            <dt className="text-muted">Access review cycle</dt>
            <dd className="font-medium">Every 90 days for elevated access</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Pending access reviews" description="Elevated access that requires periodic confirmation">
        {hub.pendingAccessReviews.length === 0 ? (
          <p className="text-sm text-muted">No access reviews due.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-3 font-medium">Staff member</th>
                <th className="pb-2 pr-3 font-medium">Elevated roles</th>
                <th className="pb-2 pr-3 font-medium">Last reviewed</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {hub.pendingAccessReviews.map((review) => (
                <tr key={review.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-3">
                    <Link to={`/staff/${review.staffId}?tab=account`} className="font-medium text-command-600 hover:underline">
                      {review.staffName}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-ink-soft">{review.elevatedRoles.join(', ')}</td>
                  <td className="py-2.5 pr-3 text-ink-soft">{formatDate(review.lastReviewedAt?.slice(0, 10))}</td>
                  <td className="py-2.5">
                    {canReview && (
                      <button
                        type="button"
                        onClick={() => completeReview.mutate(review.staffId)}
                        disabled={completeReview.isPending}
                        className="text-xs font-medium text-command-600 hover:underline"
                      >
                        Complete review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Segregation-of-duties warnings" description="Conflicting role combinations detected">
        {hub.segregationAlerts.length === 0 ? (
          <p className="text-sm text-muted">No segregation conflicts.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {hub.segregationAlerts.map((alert) => (
              <li key={`${alert.staffId}-${alert.message}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                <Link to={`/staff/${alert.staffId}?tab=account`} className="font-medium text-command-700 hover:underline">
                  {alert.staffName}
                </Link>
                <span className="text-amber-800"> — {alert.message}</span>
                <p className="text-xs text-amber-700">Roles: {alert.roleLabel}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Contractor access expiry" description="Temporary accounts requiring extension or offboarding">
        {hub.contractorsExpiring.length === 0 ? (
          <p className="text-sm text-muted">No contractors with expiring access.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {hub.contractorsExpiring.map((row) => (
              <li key={row.staffId} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <Link to={`/staff/${row.staffId}?tab=account`} className="font-medium text-command-600 hover:underline">
                  {row.firstName} {row.lastName}
                </Link>
                <span className="text-ink-soft">{row.roleLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Roles and permissions" description="Role-based access with company or depot scope">
        <div className="grid gap-3 md:grid-cols-2">
          {hub.roles.map((role) => (
            <div key={role.key} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink">{role.label}</p>
                {role.elevated && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Elevated</span>}
              </div>
              <p className="mt-1 text-ink-soft">{role.description}</p>
              <p className="mt-2 text-xs text-muted">
                Applications: {role.applications.map((a) => APPLICATION_LABELS[a]).join(', ') || 'None'}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Access issues" description="Locked accounts, MFA setup and suspended users">
        {hub.rows.filter((r) => ['locked', 'password_reset_required', 'mfa_setup_required', 'access_suspended'].includes(r.accountStatus)).length === 0 ? (
          <p className="text-sm text-muted">No access issues.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {hub.rows
              .filter((r) => ['locked', 'password_reset_required', 'mfa_setup_required', 'access_suspended'].includes(r.accountStatus))
              .map((r) => (
                <li key={r.staffId} className="flex justify-between rounded-lg border border-border px-3 py-2">
                  <span>{r.firstName} {r.lastName}</span>
                  <StatusPill status={r.accountStatus} />
                </li>
              ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

function GovCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold text-ink">{value}</p>
    </div>
  )
}
