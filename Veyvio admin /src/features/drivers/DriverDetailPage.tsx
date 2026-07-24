import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/components/ui/status'
import { ACCOUNT_STATUS_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/lib/drivers/constants'
import { canInviteAccountStatus, isAccountOffboarded, isAccountSuspended } from '@/lib/drivers/account-access'
import {
  canEditDriver,
  canInviteDriver,
  canManageDriverAccess,
  canManageEligibilityOverrides,
  canRestrictDriver,
  canSuspendDriver,
  canVerifyDriverDocuments,
} from '@/lib/drivers/permissions'
import { DriverProfileHeader } from './components/DriverProfileHeader'
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
import { useAuth, useActiveCompanyId } from '@/lib/auth-context'
import type { SuspendDriverInput } from '@/lib/drivers/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'


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
    queryKey: tKey(['driver-profile', id]),
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
    queryKey: tKey(['duties', 'today']),
    queryFn: () => api.getDuties(),
  })

  const { data: holidayData } = useQuery({
    queryKey: tKey(['driver-holiday', id]),
    queryFn: () => api.getDriverHoliday(id!),
    enabled: !!id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profile', id]) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profiles']) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-directory-summary']) })
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tKey(['driver-profile', id]) }),
  })

  const revokeSessions = useMutation({
    mutationFn: () => api.revokeDriverSessions(id!, actorName, 'Administrator revoked active sessions'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tKey(['driver-profile', id]) }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tKey(['driver-profile', id]) }),
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

  const leaveSummary = holidayData
    ? {
        remainingLabel: formatLeaveBalance(holidayData),
        pendingCount: holidayData.pendingRequestCount,
        yearLabel: holidayData.leaveYearLabel,
      }
    : null

  return (
    <div className="space-y-6">
      <DriverProfileHeader
        driver={driver}
        todayDuties={todayDuties.length}
        leaveSummary={leaveSummary}
        onNavigateTab={(label) => setTab(label as (typeof TABS)[number])}
        primaryAction={
          canEditDriver(permissions) ? (
            <Link
              to={`/drivers/${driver.id}/edit`}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-command-600 px-5 text-sm font-semibold text-white hover:bg-command-700"
            >
              Edit driver
            </Link>
          ) : null
        }
        actions={
          <>
            {needsOnboarding && canEditDriver(permissions) && (
              <Link to={`/drivers/${driver.id}/onboarding`}>Continue onboarding</Link>
            )}
            {needsOnboarding && canEditDriver(permissions) && (
              <button
                type="button"
                onClick={() => activate.mutate()}
                disabled={activate.isPending}
                title="Set operational status to Eligible for dispatch"
              >
                {activate.isPending ? 'Activating…' : 'Activate for dispatch'}
              </button>
            )}
            {canInviteDriver(permissions) && canInviteAccountStatus(driver.account.accountStatus) && (
              <button
                type="button"
                onClick={() => invite.mutate()}
                disabled={invite.isPending}
              >
                {driver.account.invitationStatus === 'sent' ? 'Resend invitation' : 'Send invitation'}
              </button>
            )}
            {canManageDriverAccess(permissions) && driver.account.invitationStatus === 'sent' && (
              <button
                type="button"
                onClick={() => cancelInvite.mutate()}
                disabled={cancelInvite.isPending}
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
                >
                  Suspend access
                </button>
              )}
            {canManageDriverAccess(permissions) && isAccountSuspended(driver.account.accountStatus) && (
              <button
                type="button"
                onClick={() => reinstate.mutate()}
                disabled={reinstate.isPending}
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
                >
                  Force password reset
                </button>
                <button
                  type="button"
                  onClick={() => revokeSessions.mutate()}
                  disabled={revokeSessions.isPending}
                >
                  Sign out every device
                </button>
              </>
            )}
            <button type="button" onClick={() => setTab('Access & Security')}>
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

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <nav className="flex gap-6 overflow-x-auto border-b border-border px-4 sm:px-6">
          {TABS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setTab(label)}
              className={`shrink-0 border-b-2 px-1 pb-3 pt-4 text-sm font-medium transition ${
                tab === label
                  ? 'border-command-600 text-command-700'
                  : 'border-transparent text-muted hover:border-border hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 sm:p-6">
      {tab === 'Overview' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-ink">Employment summary</h3>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField label="Employment type" value={EMPLOYMENT_TYPE_LABELS[driver.employmentType]} />
              <OverviewField label="Employment status" value={driver.employmentStatus.replace(/_/g, ' ')} />
              <OverviewField label="Start date" value={formatDate(driver.startDate)} />
              <OverviewField label="Line manager" value={driver.managerName ?? '—'} />
              <OverviewField label="Primary depot" value={driver.depotName ?? '—'} />
              <OverviewField
                label="Additional depots"
                value={driver.secondaryDepotNames.length ? driver.secondaryDepotNames.join(', ') : '—'}
              />
              <OverviewField label="Availability" value={driver.availabilityStatus.replace(/_/g, ' ')} />
              <OverviewField label="Next assignment" value={driver.nextDutyReference ?? '—'} />
              <OverviewField
                label="App account"
                value={ACCOUNT_STATUS_LABELS[driver.account.accountStatus]}
              />
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Operational permissions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {enabledPerms.map((p) => (
                <span
                  key={p.key}
                  className="rounded-full bg-command-50 px-2.5 py-1 text-xs font-medium text-command-800"
                >
                  {p.label}
                </span>
              ))}
              {enabledPerms.length === 0 && (
                <p className="text-sm text-muted">No work permissions configured.</p>
              )}
            </div>
          </div>

          {driverAppEvents.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold text-ink">Driver app activity</h3>
              <p className="mt-1 text-xs text-muted">
                Recent updates from the Driver mobile app.
              </p>
              <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                {driverAppEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-4 px-4 py-3 first:pt-3 last:pb-3"
                  >
                    <span className="text-sm font-medium text-ink">{event.action}</span>
                    <span className="shrink-0 text-xs text-muted">{formatDate(event.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
        </div>
      </section>

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

function formatLeaveBalance(bundle: Awaited<ReturnType<typeof api.getDriverHoliday>>) {
  if (bundle.displayUnit === 'hours') {
    const hours = (bundle.minutes.remaining ?? 0) / 60
    const formatted = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, '')
    return `${formatted} hours`
  }
  const days = bundle.days.remaining
  if (days == null || Number.isNaN(Number(days))) return '—'
  const n = Number(days)
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
  return `${formatted} days`
}

function OverviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}
