import { useState, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import {
  ACCOUNT_STATUS_LABELS,
  APPLICATION_LABELS,
  CONTRACT_TYPE_LABELS,
  DUTY_STATUS_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  TRAINING_STATUS_LABELS,
} from '@/lib/staff/constants'
import {
  canEditStaff,
  canInviteStaff,
  canManageStaffAccess,
  canSuspendStaff,
  canViewSensitiveStaffData,
  canAssignStaffTasks,
  canManageStaffDuty,
  canManageStaffTraining,
  canVerifyStaffTraining,
  canReviewStaffAccess,
  canManageStaffDocuments,
  canManageStaffLifecycle,
} from '@/lib/staff/permissions'
import { StaffBackLink, StaffProfileHeader } from './components/StaffProfileHeader'
import { StaffDutyPanel } from './components/StaffDutyPanel'
import { StaffTrainingCompliancePanel } from './components/StaffTrainingCompliancePanel'
import { StaffGovernancePanel } from './components/StaffGovernancePanel'
import { StaffDocumentsTab } from './components/StaffDocumentsTab'
import { StaffAttendanceTab } from './components/StaffAttendanceTab'
import { StaffSessionsPanel } from './components/StaffSessionsPanel'
import { temporaryDepotExpiringSoon } from '@/lib/staff/depot-access'
import { canStartDutyWithTraining } from '@/lib/staff/training'
import { api } from '@/lib/api/client'
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import { tKey } from '@/lib/tenant/tenant-query-scope'


const TABS = [
  'Overview',
  'Employment',
  'Account',
  'Depots',
  'Schedule',
  'Attendance',
  'Training',
  'Documents',
  'Tasks',
  'Activity',
] as const

const TAB_QUERY_MAP: Record<string, (typeof TABS)[number]> = {
  account: 'Account',
  employment: 'Employment',
  schedule: 'Schedule',
  attendance: 'Attendance',
  training: 'Training',
  documents: 'Documents',
  tasks: 'Tasks',
  activity: 'Activity',
}

export function StaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const tabFromQuery = searchParams.get('tab')
  const tabKey = tabFromQuery?.toLowerCase() ?? ''
  const initialTab = tabKey && TAB_QUERY_MAP[tabKey] ? TAB_QUERY_MAP[tabKey] : 'Overview'
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab)
  const [suspendReason, setSuspendReason] = useState('')
  const [handoverTo, setHandoverTo] = useState('')
  const [handoverNotes, setHandoverNotes] = useState('')
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: staff, isLoading, error, isError } = useQuery({
    queryKey: tKey(['staff-profile', id]),
    queryFn: () => api.getStaffProfile(id!),
    enabled: !!id,
  })

  const { data: allStaff = [] } = useQuery({
    queryKey: tKey(['staff-profiles']),
    queryFn: () => api.getStaffProfiles(),
  })

  useEffect(() => {
    const key = tabFromQuery?.toLowerCase() ?? ''
    if (key && TAB_QUERY_MAP[key]) setTab(TAB_QUERY_MAP[key])
  }, [tabFromQuery])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['staff-profile', id]) })
    queryClient.invalidateQueries({ queryKey: tKey(['staff-hub']) })
    queryClient.invalidateQueries({ queryKey: tKey(['staff']) })
  }

  const invite = useMutation({
    mutationFn: () => api.sendStaffInvitation(id!, {}, actorName),
    onSuccess: invalidate,
  })

  const passwordReset = useMutation({
    mutationFn: () => api.initiateStaffPasswordReset(id!, actorName),
    onSuccess: invalidate,
  })

  const revokeSessions = useMutation({
    mutationFn: () => api.revokeStaffSessions(id!, actorName, 'Administrator revoked active sessions'),
    onSuccess: invalidate,
  })

  const suspend = useMutation({
    mutationFn: () => api.suspendStaffAccess(id!, { reason: suspendReason, suspendAccount: true }, actorName),
    onSuccess: invalidate,
  })

  const reinstate = useMutation({
    mutationFn: () => api.reinstateStaffAccess(id!, actorName),
    onSuccess: invalidate,
  })

  const completeTask = useMutation({
    mutationFn: (taskId: string) => api.completeStaffTask(id!, taskId, actorName),
    onSuccess: invalidate,
  })

  const createHandover = useMutation({
    mutationFn: () =>
      api.createStaffHandover(
        id!,
        {
          toStaffId: handoverTo,
          responsibility: staff!.responsibilities[0] ?? 'Duty controller',
          openExceptionCount: 3,
          notes: handoverNotes || undefined,
        },
        actorName,
      ),
    onSuccess: () => {
      invalidate()
      setHandoverNotes('')
      setHandoverTo('')
    },
  })

  const verifyQualification = useMutation({
    mutationFn: (qualificationId: string) => api.verifyStaffQualification(id!, qualificationId, actorName),
    onSuccess: invalidate,
  })

  const addQualification = useMutation({
    mutationFn: (input: { trainingType: string; fileName?: string }) => api.addStaffQualification(id!, input, actorName),
    onSuccess: invalidate,
  })

  const completeAccessReview = useMutation({
    mutationFn: () => api.completeStaffAccessReview(id!, { confirmRolesStillRequired: true }, actorName),
    onSuccess: invalidate,
  })

  const extendContractor = useMutation({
    mutationFn: () =>
      api.extendContractorAccess(
        id!,
        { expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), reason: 'Contract extended by administrator' },
        actorName,
      ),
    onSuccess: invalidate,
  })

  if (isLoading) return <p className="text-sm text-muted">Loading…</p>
  if (isError || !staff) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Staff member not found'}</p>
  }

  const canSensitive = canViewSensitiveStaffData(permissions)
  const pendingInvite = ['no_account', 'invitation_pending'].includes(staff.account.accountStatus)
  const dutyTrainingWarnings = canStartDutyWithTraining(staff)

  return (
    <div className="space-y-6">
      <StaffBackLink />

      <StaffProfileHeader
        staff={staff}
        actions={
          <>
            {canEditStaff(permissions) && (
              <Link to={`/staff/${staff.id}/edit`} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
                Edit
              </Link>
            )}
            {canInviteStaff(permissions) && pendingInvite && (
              <button type="button" onClick={() => invite.mutate()} disabled={invite.isPending} className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white">
                {staff.account.invitationStatus === 'sent' ? 'Resend invitation' : 'Send invitation'}
              </button>
            )}
            {canManageStaffAccess(permissions) && staff.account.accountStatus === 'active' && (
              <>
                <button type="button" onClick={() => passwordReset.mutate()} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
                  Password reset
                </button>
                <button type="button" onClick={() => revokeSessions.mutate()} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
                  Revoke sessions
                </button>
              </>
            )}
            {canSuspendStaff(permissions) && staff.account.accountStatus !== 'access_suspended' && staff.employmentStatus !== 'left_company' && (
              <button type="button" onClick={() => suspend.mutate()} disabled={!suspendReason || suspend.isPending} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700">
                Suspend access
              </button>
            )}
            {canManageStaffAccess(permissions) && staff.account.accountStatus === 'access_suspended' && (
              <button type="button" onClick={() => reinstate.mutate()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white">
                Reinstate access
              </button>
            )}
          </>
        }
      />

      {canSuspendStaff(permissions) && staff.account.accountStatus !== 'access_suspended' && (
        <input
          value={suspendReason}
          onChange={(e) => setSuspendReason(e.target.value)}
          placeholder="Reason required to suspend access"
          className="w-full max-w-md rounded-lg border border-border px-3 py-1.5 text-sm"
        />
      )}

      <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(label)}
            className={`shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === label ? 'border border-b-0 border-border bg-surface text-command-700' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StaffDutyPanel staff={staff} actorName={actorName} permissions={permissions} />
          <StaffTrainingCompliancePanel staff={staff} />
          <StaffGovernancePanel staff={staff} />
          <SectionCard title="Contact">
            <dl className="space-y-2 text-sm">
              <Row label="Work email" value={staff.workEmail} />
              {canSensitive && <Row label="Personal email" value={staff.personalEmail ?? '—'} />}
              <Row label="Mobile" value={staff.mobilePhone ?? '—'} />
              <Row label="Work phone" value={staff.workPhone ?? '—'} />
              <Row label="Line manager" value={staff.lineManagerName ?? '—'} />
            </dl>
          </SectionCard>
          <SectionCard title="Application access">
            <div className="flex flex-wrap gap-2">
              {staff.applications.filter((a) => a.enabled).map((a) => (
                <span key={a.application} className="rounded-full bg-surface-muted px-2 py-1 text-xs text-ink-soft">
                  {APPLICATION_LABELS[a.application]} · {a.status}
                </span>
              ))}
            </div>
            {staff.linkedDriverId && (
              <p className="mt-3 text-sm">
                Linked driver:{' '}
                <Link to={`/drivers/${staff.linkedDriverId}`} className="text-command-600 hover:underline">
                  {staff.linkedDriverName}
                </Link>
              </p>
            )}
          </SectionCard>
          {staff.operationalAlerts.length > 0 && (
            <SectionCard title="Operational alerts" className="lg:col-span-2">
              <ul className="list-inside list-disc text-sm text-amber-800">
                {staff.operationalAlerts.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </SectionCard>
          )}
          {staff.responsibilities.length > 0 && (
            <SectionCard title="Current responsibilities" className="lg:col-span-2">
              <ul className="list-inside list-disc text-sm text-ink-soft">
                {staff.responsibilities.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'Employment' && (
        <div className="space-y-4">
          <SectionCard title="Employment information">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Row label="Employee number" value={staff.employeeNumber ?? '—'} />
              <Row label="Contract type" value={CONTRACT_TYPE_LABELS[staff.contractType]} />
              <Row label="Start date" value={staff.startDate ?? '—'} />
              <Row label="End date" value={staff.endDate ?? '—'} />
              <Row label="Employment status" value={EMPLOYMENT_STATUS_LABELS[staff.employmentStatus]} />
              <Row label="Duty status" value={DUTY_STATUS_LABELS[staff.dutyStatus]} />
              <Row label="Cost centre" value={staff.costCentre ?? '—'} />
              <Row label="Team" value={staff.team ?? '—'} />
            </dl>
          </SectionCard>
          {staff.lifecycleWorkflow.length > 0 && (
            <SectionCard title="Joiner / mover / leaver workflow" description="Automated lifecycle checkpoints">
              <ol className="space-y-2 text-sm">
                {staff.lifecycleWorkflow.map((step) => (
                  <li key={step.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <span className="font-medium">{step.label}</span>
                    <span className="text-xs capitalize text-muted">{step.status.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'Account' && (
        <SectionCard title="Account and access">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Row label="Login email" value={staff.account.loginEmail ?? '—'} />
            <Row label="Account status" value={ACCOUNT_STATUS_LABELS[staff.account.accountStatus]} />
            <Row label="Invitation" value={staff.account.invitationStatus.replace(/_/g, ' ')} />
            <Row label="Last login" value={staff.account.lastLoginAt ? new Date(staff.account.lastLoginAt).toLocaleString('en-GB') : '—'} />
            <Row label="MFA" value={staff.account.mfaEnabled ? 'Enabled' : 'Not configured'} />
            <Row label="Active sessions" value={String(staff.account.activeSessionCount)} />
          </dl>
          {staff.account.devInvitationToken ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Email delivery is not connected yet.{' '}
              <Link className="font-medium underline" to={`/accept-invitation?token=${encodeURIComponent(staff.account.devInvitationToken)}`}>
                Open accept invitation link
              </Link>
            </p>
          ) : null}
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-ink-soft">Role assignments</h3>
            <ul className="space-y-2 text-sm">
              {staff.roleAssignments.map((r) => (
                <li key={r.roleKey} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-medium">{r.roleLabel}{r.elevated && ' (elevated)'}</p>
                  <p className="text-ink-soft">Scope: {r.scopeLabel}</p>
                </li>
              ))}
            </ul>
          </div>
          {staff.trainingAccessBlocks.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Training-based access restrictions</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {staff.trainingAccessBlocks.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {dutyTrainingWarnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Duty eligibility warnings</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {dutyTrainingWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {staff.governanceAlerts.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Governance alerts</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {staff.governanceAlerts.map((a) => (
                  <li key={a.id}>{a.message}</li>
                ))}
              </ul>
            </div>
          )}
          {canReviewStaffAccess(permissions) && staff.governanceAlerts.some((a) => a.code === 'access_review_overdue') && (
            <button
              type="button"
              onClick={() => completeAccessReview.mutate()}
              disabled={completeAccessReview.isPending}
              className="mt-4 rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Complete access review
            </button>
          )}
          {canManageStaffLifecycle(permissions) && staff.contractType === 'contractor' && staff.account.contractorAccessExpiresAt && (
            <button
              type="button"
              onClick={() => extendContractor.mutate()}
              disabled={extendContractor.isPending}
              className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Extend contractor access (90 days)
            </button>
          )}
          <StaffSessionsPanel staff={staff} />
        </SectionCard>
      )}

      {tab === 'Depots' && (
        <SectionCard title="Depot assignments">
          {temporaryDepotExpiringSoon(staff.depotAssignments).length > 0 && (
            <p className="mb-3 text-sm text-amber-800">
              Temporary depot access expiring soon:{' '}
              {temporaryDepotExpiringSoon(staff.depotAssignments).map((d) => d.depotName).join(', ')}
            </p>
          )}
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted">
                <th className="pb-2 pr-3 font-medium">Depot</th>
                <th className="pb-2 pr-3 font-medium">Assignment</th>
                <th className="pb-2 pr-3 font-medium">Role</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.depotAssignments.map((d) => (
                <tr key={`${d.depotId}-${d.assignmentType}`} className="border-b border-border/60">
                  <td className="py-2 pr-3">{d.depotName}</td>
                  <td className="py-2 pr-3 capitalize">{d.assignmentType}</td>
                  <td className="py-2 pr-3">{d.roleAtDepot}</td>
                  <td className="py-2 capitalize">{d.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {tab === 'Attendance' && <StaffAttendanceTab staff={staff} />}

      {tab === 'Schedule' && (
        <div className="space-y-4">
          <StaffDutyPanel staff={staff} actorName={actorName} permissions={permissions} />
          {staff.workingPattern && (
            <SectionCard title="Normal working pattern">
              <p className="text-sm text-ink-soft">
                {staff.workingPattern.label}: {staff.workingPattern.days.join(', ')} · {staff.workingPattern.startTime} – {staff.workingPattern.endTime}
              </p>
            </SectionCard>
          )}
          <SectionCard title="Shift assignments">
            {staff.shifts.length === 0 ? (
              <p className="text-sm text-muted">No shifts recorded.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Depot</th>
                    <th className="pb-2 pr-3 font-medium">Time</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.shifts.map((s) => (
                    <tr key={s.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">{new Date(s.date).toLocaleDateString('en-GB')}</td>
                      <td className="py-2 pr-3">{s.depotName}</td>
                      <td className="py-2 pr-3">{s.startTime} – {s.endTime}</td>
                      <td className="py-2 capitalize">{s.status.replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
          {staff.dutySessions.length > 0 && (
            <SectionCard title="Duty session history">
              <ul className="space-y-2 text-sm">
                {staff.dutySessions.map((s) => (
                  <li key={s.id} className="flex justify-between rounded border border-border px-3 py-2">
                    <span>{s.depotName} · {s.role}</span>
                    <span className="text-xs text-muted">
                      {new Date(s.startedAt).toLocaleString('en-GB')}
                      {s.endedAt ? ` – ${new Date(s.endedAt).toLocaleString('en-GB')}` : ' (active)'}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
          {canManageStaffDuty(permissions) && staff.dutyStatus === 'on_duty' && staff.responsibilities.length > 0 && (
            <SectionCard title="End shift handover" description="Transfer unresolved exceptions before ending duty">
              <div className="space-y-2 text-sm">
                <select value={handoverTo} onChange={(e) => setHandoverTo(e.target.value)} className="w-full rounded-lg border border-border px-3 py-1.5">
                  <option value="">Hand over to…</option>
                  {allStaff.filter((s) => s.id !== staff.id && s.employmentStatus === 'active').map((s) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
                  ))}
                </select>
                <input value={handoverNotes} onChange={(e) => setHandoverNotes(e.target.value)} placeholder="Handover notes" className="w-full rounded-lg border border-border px-3 py-1.5" />
                <button type="button" onClick={() => createHandover.mutate()} disabled={!handoverTo || createHandover.isPending} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                  Initiate handover
                </button>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {tab === 'Training' && (
        <div className="space-y-4">
          <SectionCard title="Required training" description={`Overall compliance: ${TRAINING_STATUS_LABELS[staff.trainingStatus]}`}>
            <p className="mb-3 text-xs text-muted">
              Requirements are generated from role, department, application access and depot assignments.
            </p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="pb-2 pr-4">Training</th>
                  <th className="pb-2 pr-4">Required for</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Completed</th>
                  <th className="pb-2">Expires</th>
                </tr>
              </thead>
              <tbody>
                {staff.trainingRequirements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted">
                      No training requirements for this profile.
                    </td>
                  </tr>
                ) : (
                  staff.trainingRequirements.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2.5 pr-4 font-medium">
                        {r.label}
                        {r.blocksAccess && r.status !== 'valid' && (
                          <span className="ml-2 text-xs text-red-700">· restricts access</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-soft">{r.requiredFor}</td>
                      <td className="py-2.5 pr-4">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="py-2.5 pr-4 text-ink-soft">{formatDate(r.completedDate)}</td>
                      <td className="py-2.5 text-ink-soft">{formatDate(r.expiryDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SectionCard>

          <SectionCard title="Qualification records" description="Certificates and verification workflow">
            {staff.qualifications.length === 0 ? (
              <p className="text-sm text-muted">No qualifications recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {staff.qualifications.map((q) => (
                  <li key={q.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <div>
                      <p className="font-medium">{q.trainingType}</p>
                      <p className="text-xs text-muted">
                        {q.provider ?? '—'}
                        {q.certificateNumber ? ` · ${q.certificateNumber}` : ''}
                        {q.evidenceFileName ? ` · ${q.evidenceFileName}` : ''}
                      </p>
                      {q.verifiedBy && <p className="text-xs text-muted">Verified by {q.verifiedBy}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusPill status={q.status} />
                      {q.expiryDate && <p className="text-xs text-muted">Expires {formatDate(q.expiryDate)}</p>}
                      {canVerifyStaffTraining(permissions) && q.status === 'awaiting_verification' && (
                        <button
                          type="button"
                          onClick={() => verifyQualification.mutate(q.id)}
                          disabled={verifyQualification.isPending}
                          className="text-xs text-command-600 hover:underline"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {canManageStaffTraining(permissions) && (
              <button
                type="button"
                onClick={() => addQualification.mutate({ trainingType: 'Manual upload', fileName: 'certificate.pdf' })}
                disabled={addQualification.isPending}
                className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-muted"
              >
                Upload qualification
              </button>
            )}
          </SectionCard>
        </div>
      )}

      {tab === 'Documents' && (
        <StaffDocumentsTab
          staff={staff}
          actorName={actorName}
          canManage={canManageStaffDocuments(permissions)}
          canVerify={canManageStaffDocuments(permissions)}
        />
      )}

      {tab === 'Tasks' && (
        <SectionCard title="Tasks and responsibilities" description={`${staff.openTaskCount} open · ${staff.overdueTaskCount} overdue`}>
          {staff.tasks.length === 0 ? (
            <p className="text-sm text-muted">No open tasks.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {staff.tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-muted capitalize">{t.category}{t.assignedBy ? ` · ${t.assignedBy}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={t.status} />
                    {t.status !== 'completed' && canAssignStaffTasks(permissions) && (
                      <button type="button" onClick={() => completeTask.mutate(t.id)} className="text-xs text-command-600 hover:underline">
                        Complete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {tab === 'Activity' && (
        <SectionCard title="Activity and audit">
          <ul className="space-y-2 text-sm">
            {staff.auditEvents.map((e) => (
              <li key={e.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium">{e.action}</p>
                <p className="text-xs text-muted">
                  {e.actorName} · {new Date(e.occurredAt).toLocaleString('en-GB')}
                  {e.detail ? ` · ${e.detail}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
