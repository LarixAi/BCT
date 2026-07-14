import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import {
  ACCOUNT_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
} from '@/lib/drivers/constants'
import {
  canEditDriver,
  canInviteDriver,
  canManageDriverAccess,
  canManageEligibilityOverrides,
  canRestrictDriver,
  canVerifyDriverDocuments,
  canViewSensitiveDriverData,
  maskLicenceNumber,
} from '@/lib/drivers/permissions'
import { DriverBackLink, DriverProfileHeader } from './components/DriverProfileHeader'
import { DriverSafetyTab } from './components/DriverSafetyTab'
import { DriverComplianceTab } from './components/DriverComplianceTab'
import { DriverEligibilityTab } from './components/DriverEligibilityTab'
import { DriverTrainingTab } from './components/DriverTrainingTab'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

const TABS = [
  'Overview',
  'Compliance',
  'Eligibility',
  'Schedule',
  'Assignments',
  'Account',
  'Training',
  'Safety',
  'Messages',
  'Notes & Audit',
] as const

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')
  const permissions = user?.permissions ?? []
  const actorName = `${user?.firstName ?? 'Admin'} ${user?.lastName ?? ''}`.trim()

  const { data: driver, isLoading, error, isError } = useQuery({
    queryKey: ['driver-profile', id],
    queryFn: () => api.getDriverProfile(id!),
    enabled: !!id,
  })

  const { data: duties = [] } = useQuery({
    queryKey: ['duties', 'today'],
    queryFn: () => api.getDuties(),
  })

  const invite = useMutation({
    mutationFn: () => api.sendDriverInvitation(id!, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-profile', id] }),
  })

  const passwordReset = useMutation({
    mutationFn: () => api.initiateDriverPasswordReset(id!, actorName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-profile', id] }),
  })

  const revokeSessions = useMutation({
    mutationFn: () => api.revokeDriverSessions(id!, actorName, 'Administrator revoked active sessions'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-profile', id] }),
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>
  if (isError || !driver) {
    return <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Driver not found'}</p>
  }

  const todayDuties = duties.filter((d) => d.driver?.id === driver.id)
  const canViewSensitive = canViewSensitiveDriverData(permissions)
  const enabledPerms = driver.workPermissions.filter((p) => p.enabled)

  return (
    <div className="space-y-6">
      <DriverBackLink />

      <DriverProfileHeader
        driver={driver}
        actions={
          <>
            {canEditDriver(permissions) && (
              <Link
                to={`/drivers/${driver.id}/edit`}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                Edit driver
              </Link>
            )}
            {canInviteDriver(permissions) &&
              ['not_created', 'invite_pending'].includes(driver.account.accountStatus) && (
                <button
                  type="button"
                  onClick={() => invite.mutate()}
                  disabled={invite.isPending}
                  className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
                >
                  {driver.account.invitationStatus === 'sent' ? 'Resend invitation' : 'Send invitation'}
                </button>
              )}
            {canManageDriverAccess(permissions) && driver.account.accountStatus === 'active' && (
              <>
                <button
                  type="button"
                  onClick={() => passwordReset.mutate()}
                  disabled={passwordReset.isPending}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                >
                  Password reset
                </button>
                <button
                  type="button"
                  onClick={() => revokeSessions.mutate()}
                  disabled={revokeSessions.isPending}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50"
                >
                  Revoke sessions
                </button>
              </>
            )}
          </>
        }
      />

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {TABS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(label)}
            className={`shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium ${
              tab === label
                ? 'border border-b-0 border-slate-200 bg-white text-command-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Personal information">
            <dl className="space-y-2 text-sm">
              <Row label="Legal name" value={`${driver.firstName} ${driver.lastName}`} />
              <Row label="Preferred name" value={driver.preferredName ?? '—'} />
              <Row label="Email" value={driver.email ?? '—'} />
              <Row label="Phone" value={driver.phone ?? '—'} />
              <Row label="Home address" value={driver.homeAddress ?? '—'} />
              <Row label="Emergency contact" value={driver.emergencyContact ?? '—'} />
            </dl>
          </SectionCard>
          <SectionCard title="Employment">
            <dl className="space-y-2 text-sm">
              <Row label="Type" value={EMPLOYMENT_TYPE_LABELS[driver.employmentType]} />
              <Row label="Status" value={driver.employmentStatus.replace(/_/g, ' ')} />
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
              {enabledPerms.length === 0 && <p className="text-sm text-slate-500">No work permissions configured.</p>}
            </div>
          </SectionCard>
          <SectionCard title="Current operational information" className="lg:col-span-2">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="Today's duties" value={String(todayDuties.length)} />
              <Row label="Availability" value={driver.availabilityStatus.replace(/_/g, ' ')} />
              <Row label="Active restrictions" value={String(driver.restrictions.filter((r) => r.status === 'active').length)} />
              <Row label="Open documents pending" value={String(driver.documents.filter((d) => d.verificationStatus === 'awaiting_review').length)} />
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

      {tab === 'Schedule' && (
        <SectionCard title="Schedule and availability">
          <p className="text-sm text-slate-600">
            Availability: <strong>{driver.availabilityStatus.replace(/_/g, ' ')}</strong> — availability does not
            automatically mean eligibility.
          </p>
          <p className="mt-2 text-sm text-slate-500">Full schedule integration coming in Phase 4.</p>
        </SectionCard>
      )}

      {tab === 'Assignments' && (
        <SectionCard title="Today's assignments">
          {todayDuties.length === 0 ? (
            <p className="text-sm text-slate-500">No duties assigned today.</p>
          ) : (
            <ul className="space-y-2">
              {todayDuties.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <Link to={`/runs/${d.id}`} className="font-medium text-command-600 hover:underline">
                    {d.reference}
                  </Link>
                  <span className="text-slate-500">{d.route?.name ?? '—'}</span>
                  <StatusPill status={d.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {tab === 'Account' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Account and app access">
            <dl className="space-y-2 text-sm">
              <Row label="User account ID" value={driver.account.userAccountId ?? 'Not linked'} />
              <Row label="Account status" value={ACCOUNT_STATUS_LABELS[driver.account.accountStatus]} />
              <Row label="Invitation" value={driver.account.invitationStatus.replace(/_/g, ' ')} />
              <Row label="Invitation sent" value={driver.account.invitationSentAt ? formatDate(driver.account.invitationSentAt.slice(0, 10)) : '—'} />
              <Row label="Invitation expires" value={formatDate(driver.account.invitationExpiresAt?.slice(0, 10))} />
              <Row label="Registration completed" value={formatDate(driver.account.registrationCompletedAt?.slice(0, 10))} />
              <Row label="Email verified" value={driver.account.emailVerified ? 'Yes' : 'No'} />
              <Row label="MFA" value={driver.account.mfaEnabled ? 'Enabled' : 'Disabled'} />
              <Row label="Active sessions" value={String(driver.account.activeSessionCount)} />
              <Row label="Registered devices" value={String(driver.account.registeredDeviceCount)} />
              <Row label="App version" value={driver.account.appVersion ?? '—'} />
              <Row label="OS" value={driver.account.operatingSystem ?? '—'} />
              <Row label="Location permission" value={driver.account.locationPermissionGranted ? 'Granted' : 'Not granted'} />
            </dl>
            <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Administrators never see driver passwords. Use invitation or password-reset links only.
            </p>
          </SectionCard>
          <SectionCard title="Licence (masked)">
            <dl className="space-y-2 text-sm">
              <Row label="Licence number" value={maskLicenceNumber(driver.licenceNumber, canViewSensitive)} />
              <Row label="Licence expiry" value={formatDate(driver.licenceExpiry)} />
              <Row label="CPC expiry" value={formatDate(driver.cpcExpiry)} />
              <Row label="DBS expiry" value={formatDate(driver.dbsExpiry)} />
              <Row label="Medical expiry" value={formatDate(driver.medicalExpiry)} />
            </dl>
          </SectionCard>
        </div>
      )}

      {tab === 'Training' && <DriverTrainingTab driver={driver} />}

      {tab === 'Safety' && <DriverSafetyTab driverId={driver.id} />}

      {tab === 'Messages' && (
        <SectionCard title="Messages and acknowledgements">
          <p className="text-sm text-slate-500">Driver messages and required acknowledgements — Phase 2.</p>
        </SectionCard>
      )}

      {tab === 'Notes & Audit' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Internal notes">
            {driver.notes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {driver.notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-xs text-slate-500">
                      {n.category.replace(/_/g, ' ')} · {n.author} · {new Date(n.createdAt).toLocaleString('en-GB')}
                    </p>
                    <p className="mt-1">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Audit history">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-2">Time</th>
                  <th className="pb-2 pr-2">Action</th>
                  <th className="pb-2">Actor</th>
                </tr>
              </thead>
              <tbody>
                {driver.auditEvents.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50">
                    <td className="py-2 pr-2 text-slate-600">
                      {new Date(e.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 pr-2">{e.action}</td>
                    <td className="py-2 text-slate-600">{e.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}
