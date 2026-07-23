import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { formatDate } from '@/components/ui/status'
import {
  ACCOUNT_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  OPERATIONAL_STATUS_LABELS,
} from '@/lib/drivers/constants'
import { canInviteAccountStatus, isAccountOffboarded, isAccountSuspended } from '@/lib/drivers/account-access'
import { countDocumentsPendingAdminReview } from '@/lib/drivers/compliance'
import {
  canEditDriver,
  canInviteDriver,
  canManageDriverAccess,
  canManageEligibilityOverrides,
  canRestrictDriver,
  canSuspendDriver,
  canVerifyDriverDocuments,
} from '@/lib/drivers/permissions'
import { DriverBackLink, DriverProfileHeader } from './components/DriverProfileHeader'
import { DriverSafetyTab } from './components/DriverSafetyTab'
import { DriverComplianceTab } from './components/DriverComplianceTab'
import { DriverEligibilityTab } from './components/DriverEligibilityTab'
import { DriverTrainingTab } from './components/DriverTrainingTab'
import { DriverScheduleTab } from './components/DriverScheduleTab'
import { DriverAttendanceTab } from './components/DriverAttendanceTab'
import { DriverTimeOffTab } from './components/DriverTimeOffTab'
import { DriverAssignmentsTab } from './components/DriverAssignmentsTab'
import { DriverMessagesTab } from './components/DriverMessagesTab'
import { DriverNotesAuditTab } from './components/DriverNotesAuditTab'
import { DriverAccessSecurityTab } from './access/DriverAccessSecurityTab'
import { SuspendDriverAccessDialog } from './components/SuspendDriverAccessDialog'
import { DriverInviteLinkBanner } from './components/DriverInviteLinkBanner'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'
import type { SuspendDriverInput } from '@/lib/drivers/types'

const TABS = [
  'Overview',
  'Compliance',
  'Eligibility',
  'Schedule',
  'Attendance',
  'Time off',
  'Assignments',
  'Access & Security',
  'Training',
  'Safety',
  'Messages',
  'Notes & Audit',
] as const

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<(typeof TABS)[number]>(
    location.pathname.endsWith('/account') ? 'Access & Security' : 'Overview',
  )
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  useEffect(() => {
    if (location.pathname.endsWith('/account')) setTab('Access & Security')
  }, [location.pathname])

  const { data: driver, isLoading, error, isError, refetch, isFetching } = useQuery({
    queryKey: ['driver-profile', id],
    queryFn: async () => {
      try {
        return await api.getDriverProfile(id!)
      } catch (profileError) {
        const list = await api.getDriverProfiles().catch(() => null)
        const fromList = list?.find((row) => row.id === id)
        if (fromList) return fromList
        throw profileError
      }
    },
    enabled: !!id,
  })

  const { data: duties = [] } = useQuery({
    queryKey: ['duties', 'today'],
    queryFn: () => api.getDuties(),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-profile', id] })
    queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['driver-directory-summary'] })
  }

  const invite = useMutation({
    mutationFn: () =>
      api.createDriverAppAccount(
        id!,
        {
          channel: 'email',
          resend: driver?.account.invitationStatus === 'sent',
        },
        actorName,
      ),
    onSuccess: (profile) => {
      const token = profile.account?.devInvitationToken ?? null
      setInviteToken(token)
      queryClient.setQueryData(['driver-profile', id], profile)
      invalidate()
      setTab('Access & Security')
    },
  })

  const activate = useMutation({
    mutationFn: () => api.activateDriver(id!, {}, actorName),
    onSuccess: invalidate,
  })

  const passwordReset = useMutation({
    mutationFn: () => api.initiateDriverPasswordReset(id!, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-profile', id] }),
  })

  const revokeSessions = useMutation({
    mutationFn: () => api.revokeDriverSessions(id!, actorName, 'Administrator revoked active sessions'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-profile', id] }),
  })

  const suspend = useMutation({
    mutationFn: (input: SuspendDriverInput) => api.suspendDriver(id!, input, actorName),
    onSuccess: () => {
      setSuspendOpen(false)
      invalidate()
    },
  })

  const reinstate = useMutation({
    mutationFn: () =>
      api.reinstateDriver(id!, { reason: 'Access restored from driver profile' }, actorName),
    onSuccess: invalidate,
  })

  const cancelInvite = useMutation({
    mutationFn: () => api.cancelDriverInvitation(id!, actorName, 'Revoked by administrator'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-profile', id] }),
  })

  const driverAppEvents = useMemo(
    () =>
      (driver?.auditEvents ?? [])
        .filter((e) =>
          /onboarding|evidence submitted|profile updated|contact updated|step completed|document uploaded/i.test(
            e.action,
          ),
        )
        .slice(0, 10),
    [driver?.auditEvents],
  )

  if (isLoading) return <p className="text-sm text-muted">Loading driver…</p>
  if (isError || !driver) {
    return (
      <div className="space-y-3 rounded-xl border border-critical/30 bg-surface p-5">
        <p className="text-sm font-medium text-ink">Driver profile could not be loaded</p>
        <p className="text-sm text-red-800">
          {error instanceof Error ? error.message : 'Driver not found'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg bg-midnight px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-60"
          >
            {isFetching ? 'Retrying…' : 'Try again'}
          </button>
          <Link to="/drivers" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-muted">
            Back to drivers
          </Link>
        </div>
      </div>
    )
  }

  const todayDuties = duties.filter((d) => d.driver?.id === driver.id)
  const enabledPerms = (driver.workPermissions ?? []).filter((p) => p.enabled)
  const needsOnboarding = ['draft', 'onboarding', 'pending_compliance'].includes(driver.operationalStatus)

  return (
    <div className="space-y-6">
      <DriverBackLink />

      <DriverProfileHeader
        driver={driver}
        actions={
          <>
            {needsOnboarding && canEditDriver(permissions) && (
              <Link
                to={`/drivers/${driver.id}/onboarding`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
              >
                Continue onboarding
              </Link>
            )}
            {needsOnboarding && canEditDriver(permissions) && (
              <button
                type="button"
                onClick={() => activate.mutate()}
                disabled={activate.isPending}
                className="rounded-lg bg-midnight px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
                title="Set operational status to Eligible for dispatch"
              >
                {activate.isPending ? 'Activating…' : 'Activate for dispatch'}
              </button>
            )}
            {canEditDriver(permissions) && (
              <Link
                to={`/drivers/${driver.id}/edit`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
              >
                Edit driver
              </Link>
            )}
            {canInviteDriver(permissions) && canInviteAccountStatus(driver.account.accountStatus) && (
              <button
                type="button"
                onClick={() => invite.mutate()}
                disabled={invite.isPending}
                className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
              >
                {driver.account.invitationStatus === 'sent' ? 'Resend invitation' : 'Send invitation'}
              </button>
            )}
            {canManageDriverAccess(permissions) && driver.account.invitationStatus === 'sent' && (
              <button
                type="button"
                onClick={() => cancelInvite.mutate()}
                disabled={cancelInvite.isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
              >
                Cancel invitation
              </button>
            )}
            {canSuspendDriver(permissions) &&
              !isAccountSuspended(driver.account.accountStatus) &&
              !isAccountOffboarded(driver.account.accountStatus) &&
              driver.operationalStatus !== 'suspended' && (
                <button
                  type="button"
                  onClick={() => setSuspendOpen(true)}
                  disabled={suspend.isPending}
                  className="rounded-lg border border-attention/40 px-3 py-1.5 text-sm font-medium text-attention hover:bg-attention/10"
                >
                  Suspend access
                </button>
              )}
            {canManageDriverAccess(permissions) && isAccountSuspended(driver.account.accountStatus) && (
              <button
                type="button"
                onClick={() => reinstate.mutate()}
                disabled={reinstate.isPending}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Reinstate access
              </button>
            )}
            {canManageDriverAccess(permissions) && driver.account.accountStatus === 'active' && (
              <>
                <button
                  type="button"
                  onClick={() => passwordReset.mutate()}
                  disabled={passwordReset.isPending}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
                >
                  Force password reset
                </button>
                <button
                  type="button"
                  onClick={() => revokeSessions.mutate()}
                  disabled={revokeSessions.isPending}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
                >
                  Sign out every device
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setTab('Access & Security')}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
            >
              Access & Security
            </button>
          </>
        }
      />
      {activate.isError ? (
        <p className="text-sm text-red-800">
          {activate.error instanceof Error ? activate.error.message : 'Activation failed'}
        </p>
      ) : null}
      {invite.isError ? (
        <p className="text-sm text-red-800">
          {invite.error instanceof Error
            ? invite.error.message
            : 'Invitation could not be sent. Check the driver has an email address.'}
        </p>
      ) : null}
      {(inviteToken || driver.account.devInvitationToken) && (
        <DriverInviteLinkBanner
          token={inviteToken || driver.account.devInvitationToken || ''}
          emailDeliveryStatus={driver.account.emailDeliveryStatus}
          inviteUrl={driver.account.inviteUrl}
          email={driver.account.invitationDestination ?? driver.email}
        />
      )}

      <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(label)}
            className={`shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === label
                ? 'border border-b-0 border-border bg-surface text-command-700'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Status (separate dimensions)" className="lg:col-span-2">
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <Row label="Operational status" value={OPERATIONAL_STATUS_LABELS[driver.operationalStatus]} />
              <Row label="Account status" value={ACCOUNT_STATUS_LABELS[driver.account.accountStatus]} />
              <Row label="Compliance" value={driver.complianceStatus.replace(/_/g, ' ')} />
              <Row label="Eligibility" value={driver.eligibility.summary} />
              <Row label="Primary depot" value={driver.depotName ?? '—'} />
              <Row label="Next assignment" value={driver.nextDutyReference ?? '—'} />
              <Row
                label="Expiring document"
                value={
                  driver.nearestExpiryLabel
                    ? `${driver.nearestExpiryLabel} · ${formatDate(driver.nearestExpiryDate)}`
                    : '—'
                }
              />
            </dl>
          </SectionCard>
          <SectionCard title="Personal information">
            <dl className="space-y-2 text-sm">
              <Row label="Legal name" value={`${driver.firstName} ${driver.lastName}`} />
              <Row label="Preferred name" value={driver.preferredName ?? '—'} />
              <Row label="Date of birth" value={formatDate(driver.dateOfBirth)} />
              <Row label="Email" value={driver.email ?? '—'} />
              <Row label="Phone" value={driver.phone ?? '—'} />
              <Row label="Home address" value={driver.homeAddress ?? '—'} />
              <Row label="Emergency contact" value={driver.emergencyContact ?? '—'} />
            </dl>
          </SectionCard>
          {driverAppEvents.length > 0 ? (
            <SectionCard title="Driver app activity" className="lg:col-span-2">
              <p className="mb-3 text-xs text-muted">
                Recent updates from the Driver mobile app (onboarding and evidence).
              </p>
              <ul className="space-y-2 text-sm">
                {driverAppEvents.map((event) => (
                  <li key={event.id} className="flex flex-col gap-0.5 border-b border-border/60 pb-2 last:border-0">
                    <span className="font-medium text-ink">{event.action}</span>
                    <span className="text-xs text-muted">{formatDate(event.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
          <SectionCard title="Employment">
            <dl className="space-y-2 text-sm">
              <Row label="Type" value={EMPLOYMENT_TYPE_LABELS[driver.employmentType]} />
              <Row label="Employment status" value={driver.employmentStatus.replace(/_/g, ' ')} />
              <Row label="Start date" value={formatDate(driver.startDate)} />
              <Row label="Manager" value={driver.managerName ?? '—'} />
              <Row label="Primary depot" value={driver.depotName ?? '—'} />
              <Row
                label="Additional depots"
                value={driver.secondaryDepotNames.length ? driver.secondaryDepotNames.join(', ') : '—'}
              />
            </dl>
          </SectionCard>
          <SectionCard title="Operational permissions" className="lg:col-span-2">
            <div className="flex flex-wrap gap-2">
              {enabledPerms.map((p) => (
                <span key={p.key} className="rounded-full bg-command-50 px-2.5 py-1 text-xs font-medium text-command-800">
                  {p.label}
                </span>
              ))}
              {enabledPerms.length === 0 && <p className="text-sm text-muted">No work permissions configured.</p>}
            </div>
          </SectionCard>
          <SectionCard title="Current operational information" className="lg:col-span-2">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Today's duties" value={String(todayDuties.length)} />
              <Row label="Availability" value={driver.availabilityStatus.replace(/_/g, ' ')} />
              <Row
                label="Active restrictions"
                value={String(driver.restrictions.filter((r) => r.status === 'active').length)}
              />
              <Row
                label="Documents awaiting review"
                value={String(countDocumentsPendingAdminReview(driver.documents))}
              />
            </dl>
          </SectionCard>
        </div>
      )}

      {tab === 'Compliance' && (
        <DriverComplianceTab
          driver={driver}
          actorName={actorName}
          canVerify={canVerifyDriverDocuments(permissions)}
        />
      )}

      {tab === 'Eligibility' && (
        <DriverEligibilityTab
          driver={driver}
          actorName={actorName}
          canManage={canRestrictDriver(permissions) || canManageEligibilityOverrides(permissions)}
        />
      )}

      {tab === 'Schedule' && <DriverScheduleTab driver={driver} />}

      {tab === 'Attendance' && <DriverAttendanceTab driver={driver} />}

      {tab === 'Time off' && (
        <DriverTimeOffTab
          driver={driver}
          actorName={actorName}
          canManage={canEditDriver(permissions) || canRestrictDriver(permissions)}
        />
      )}

      {tab === 'Assignments' && <DriverAssignmentsTab driver={driver} />}

      {tab === 'Access & Security' && (
        <DriverAccessSecurityTab
          driver={driver}
          actorName={actorName}
          permissions={permissions}
          companyName={user?.tenantName}
          inviteToken={inviteToken}
          onInviteToken={setInviteToken}
        />
      )}

      {tab === 'Training' && (
        <DriverTrainingTab
          driver={driver}
          actorName={actorName}
          canEdit={canEditDriver(permissions) || canVerifyDriverDocuments(permissions)}
          onViewCompliance={() => setTab('Compliance')}
        />
      )}

      {tab === 'Safety' && <DriverSafetyTab driverId={driver.id} />}

      {tab === 'Messages' && <DriverMessagesTab driver={driver} />}

      {tab === 'Notes & Audit' && (
        <DriverNotesAuditTab
          driver={driver}
          actorName={actorName}
          canEdit={canEditDriver(permissions)}
        />
      )}

      <SuspendDriverAccessDialog
        open={suspendOpen}
        driverName={`${driver.firstName} ${driver.lastName}`}
        pending={suspend.isPending}
        error={suspend.error instanceof Error ? suspend.error.message : null}
        onClose={() => setSuspendOpen(false)}
        onConfirm={(input) => suspend.mutate(input)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
}
