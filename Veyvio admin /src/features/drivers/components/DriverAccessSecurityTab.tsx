import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill, formatDate } from '@/components/ui/status'
import {
  authenticationMethodLabel,
  canInviteAccountStatus,
  isAccountOffboarded,
  isAccountSuspended,
  SUSPEND_REASON_OPTIONS,
} from '@/lib/drivers/account-access'
import {
  ACCOUNT_STATUS_LABELS,
  ELIGIBILITY_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  INVITATION_HISTORY_LABELS,
} from '@/lib/drivers/constants'
import {
  canInviteDriver,
  canManageDriverAccess,
  canOffboardDriver,
  canSuspendDriver,
  canUnlockDriver,
} from '@/lib/drivers/permissions'
import type { DriverProfile, SuspendDriverInput } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'
import { SuspendDriverAccessDialog } from './SuspendDriverAccessDialog'
import { AppInvitePanel } from './AppInvitePanel'
import { DriverInviteLinkBanner } from './DriverInviteLinkBanner'

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  )
}

export function DriverAccessSecurityTab({
  driver,
  actorName,
  permissions,
  companyName,
  inviteToken,
  onInviteToken,
}: {
  driver: DriverProfile
  actorName: string
  permissions: string[]
  companyName?: string | null
  inviteToken?: string | null
  onInviteToken?: (token: string | null) => void
}) {
  const queryClient = useQueryClient()
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reinstateReason, setReinstateReason] = useState('')
  const [unlockReason, setUnlockReason] = useState('')
  const [offboardReason, setOffboardReason] = useState('')
  const [offboardEndDate, setOffboardEndDate] = useState('')
  const [showOffboard, setShowOffboard] = useState(false)
  const [deviceReason, setDeviceReason] = useState<Record<string, string>>({})
  const [editingContact, setEditingContact] = useState(false)
  const [contactEmail, setContactEmail] = useState(driver.email ?? '')
  const [contactPhone, setContactPhone] = useState(driver.phone ?? '')
  const [contactReason, setContactReason] = useState('')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-profile', driver.id] })
    queryClient.invalidateQueries({ queryKey: ['driver-profiles'] })
    queryClient.invalidateQueries({ queryKey: ['driver-directory-summary'] })
  }

  const invite = useMutation({
    mutationFn: () =>
      api.createDriverAppAccount(
        driver.id,
        {
          channel: 'email',
          resend: driver.account.invitationStatus === 'sent',
        },
        actorName,
      ),
    onSuccess: (profile) => {
      onInviteToken?.(profile.account?.devInvitationToken ?? null)
      queryClient.setQueryData(['driver-profile', driver.id], profile)
      invalidate()
    },
  })

  const updateContact = useMutation({
    mutationFn: () =>
      api.updateDriver(
        driver.id,
        {
          email: contactEmail.trim().toLowerCase(),
          phone: contactPhone.trim(),
          contactChangeReason: contactReason.trim(),
        },
        actorName,
      ),
    onSuccess: (profile) => {
      queryClient.setQueryData(['driver-profile', driver.id], profile)
      setEditingContact(false)
      setContactReason('')
      invalidate()
    },
  })

  const passwordReset = useMutation({
    mutationFn: () => api.initiateDriverPasswordReset(driver.id, actorName),
    onSuccess: invalidate,
  })

  const revokeSessions = useMutation({
    mutationFn: () =>
      api.revokeDriverSessions(driver.id, actorName, 'Administrator revoked active sessions'),
    onSuccess: invalidate,
  })

  const suspend = useMutation({
    mutationFn: (input: SuspendDriverInput) => api.suspendDriver(driver.id, input, actorName),
    onSuccess: () => {
      setSuspendOpen(false)
      invalidate()
    },
  })

  const reinstate = useMutation({
    mutationFn: () => api.reinstateDriver(driver.id, { reason: reinstateReason.trim() }, actorName),
    onSuccess: () => {
      setReinstateReason('')
      invalidate()
    },
  })

  const unlock = useMutation({
    mutationFn: () => api.unlockDriver(driver.id, { reason: unlockReason.trim() }, actorName),
    onSuccess: () => {
      setUnlockReason('')
      invalidate()
    },
  })

  const offboard = useMutation({
    mutationFn: () =>
      api.offboardDriver(
        driver.id,
        {
          reason: offboardReason.trim(),
          employmentEndDate: offboardEndDate,
          reassignActiveTrips: true,
          notifyDriver: true,
        },
        actorName,
      ),
    onSuccess: () => {
      setShowOffboard(false)
      setOffboardReason('')
      setOffboardEndDate('')
      invalidate()
    },
  })

  const revokeDevice = useMutation({
    mutationFn: ({ deviceId, reason }: { deviceId: string; reason: string }) =>
      api.revokeDriverDevice(driver.id, deviceId, { reason }, actorName),
    onSuccess: (_profile, vars) => {
      setDeviceReason((prev) => ({ ...prev, [vars.deviceId]: '' }))
      invalidate()
    },
  })

  const account = driver.account
  const canSignIn =
    !['draft', 'invitation_pending', 'invitation_expired', 'temporarily_suspended', 'locked', 'offboarded', 'archived'].includes(
      account.accountStatus,
    )
  const eligibilityBlocked =
    driver.operationalEligibility === 'not_eligible' || driver.operationalEligibility === 'restricted'
  const blockingFailure = driver.eligibility.failures.find((f) => f.severity === 'block')
  const securityEvents = driver.auditEvents.filter((e) =>
    /access|invitation|password|session|device|login|unlock|offboard|suspend|reinstate|mfa|account/i.test(
      e.action,
    ),
  )
  const suspensionCategoryLabel = account.suspension
    ? SUSPEND_REASON_OPTIONS.find((o) => o.value === account.suspension!.reasonCategory)?.label
    : null

  const activeInviteToken = inviteToken || account.devInvitationToken || null

  return (
    <div className="space-y-6">
      <SectionCard title="Driver app access">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatusBlock
            label="Driver app access"
            value={ACCOUNT_STATUS_LABELS[account.accountStatus]}
            status={account.accountStatus}
          />
          <StatusBlock
            label="Operational eligibility"
            value={ELIGIBILITY_LABELS[driver.operationalEligibility]}
            status={driver.operationalEligibility}
          />
          <StatusBlock label="Last login" value={formatDateTime(account.lastLoginAt)} />
          <StatusBlock
            label="Registered devices"
            value={String(account.devices.filter((d) => d.securityStatus !== 'revoked').length)}
          />
          <StatusBlock
            label="Authentication method"
            value={authenticationMethodLabel(
              account.authenticationMethod,
              account.passkeyEnabled,
              account.mfaEnabled,
            )}
          />
          <StatusBlock label="Active sessions" value={String(account.activeSessionCount)} />
        </div>

        {canSignIn && eligibilityBlocked ? (
          <div className="mt-4 rounded-lg border border-attention/40 bg-attention/10 px-4 py-3 text-sm text-slate-900">
            <p className="font-medium">Driver can sign in but cannot start duty.</p>
            {blockingFailure ? (
              <p className="mt-1 text-slate-700">
                Blocking requirement: {blockingFailure.message}
              </p>
            ) : (
              <p className="mt-1 text-slate-700">
                Eligibility is {ELIGIBILITY_LABELS[driver.operationalEligibility].toLowerCase()}.
              </p>
            )}
          </div>
        ) : null}

        {isAccountSuspended(account.accountStatus) && account.suspension ? (
          <div className="mt-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-slate-900">
            <p className="font-medium">Access suspended — sign-in blocked.</p>
            <p className="mt-1 text-slate-700">
              {suspensionCategoryLabel}: {account.suspension.reason}
            </p>
            {account.suspension.driverMessage ? (
              <p className="mt-1 text-slate-600">Driver message: {account.suspension.driverMessage}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-500">
              Suspended by {account.suspension.suspendedBy} · {formatDateTime(account.suspension.suspendedAt)}
              {account.suspension.restoreAt
                ? ` · restore ${formatDateTime(account.suspension.restoreAt)}`
                : ' · until manually restored'}
            </p>
          </div>
        ) : null}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Account summary">
          <dl className="space-y-2 text-sm">
            <Row label="Driver name" value={`${driver.firstName} ${driver.lastName}`} />
            <Row label="Driver ID" value={driver.reference} />
            <Row label="Company" value={companyName ?? 'Current company'} />
            <Row
              label="Assigned depots"
              value={[driver.depotName, ...driver.secondaryDepotNames].filter(Boolean).join(', ') || '—'}
            />
            <Row label="Employment status" value={EMPLOYMENT_STATUS_LABELS[driver.employmentStatus]} />
            <Row label="Login email on file" value={driver.email ?? '—'} />
            <Row label="Mobile on file" value={driver.phone ?? '—'} />
            <Row label="App account status" value={ACCOUNT_STATUS_LABELS[account.accountStatus]} />
            <Row label="Invitation status" value={account.invitationStatus.replace(/_/g, ' ')} />
            <Row label="Last successful login" value={formatDateTime(account.lastLoginAt)} />
            <Row label="Last failed login" value={formatDateTime(account.lastFailedLoginAt)} />
            <Row label="Last app activity" value={formatDateTime(account.lastAppActivityAt)} />
            <Row label="Current app version" value={account.appVersion ?? '—'} />
            <Row
              label="Password / passkey"
              value={authenticationMethodLabel(
                account.authenticationMethod,
                account.passkeyEnabled,
                account.mfaEnabled,
              )}
            />
            <Row label="MFA" value={account.mfaEnabled ? 'Enabled' : 'Disabled'} />
            <Row label="User account ID" value={account.userAccountId ?? 'Not linked'} />
          </dl>

          {canManageDriverAccess(permissions) ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              {!editingContact ? (
                <button
                  type="button"
                  onClick={() => {
                    setContactEmail(driver.email ?? '')
                    setContactPhone(driver.phone ?? '')
                    setContactReason('')
                    setEditingContact(true)
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                >
                  Edit login email or mobile
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-900">Edit login contact</p>
                  <p className="text-xs text-slate-600">
                    This is the email/mobile used for invitations and account recovery. Changing it is audited.
                    If an invitation is already pending, resend it after saving so the new address gets the link.
                  </p>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Email</span>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Mobile</span>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-slate-700">Reason</span>
                    <textarea
                      value={contactReason}
                      onChange={(e) => setContactReason(e.target.value)}
                      rows={2}
                      required
                      placeholder="Required for the access audit trail"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  {updateContact.isError ? (
                    <p className="text-sm text-red-800">
                      {updateContact.error instanceof Error
                        ? updateContact.error.message
                        : 'Contact could not be updated'}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        updateContact.isPending ||
                        !contactReason.trim() ||
                        (!contactEmail.trim() && !contactPhone.trim())
                      }
                      onClick={() => updateContact.mutate()}
                      className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {updateContact.isPending ? 'Saving…' : 'Save contact'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingContact(false)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    {canInviteAccountStatus(account.accountStatus) ? (
                      <button
                        type="button"
                        disabled={invite.isPending || updateContact.isPending}
                        onClick={() => {
                          if (
                            contactEmail.trim().toLowerCase() !== (driver.email ?? '').toLowerCase() ||
                            contactPhone.trim() !== (driver.phone ?? '')
                          ) {
                            updateContact.mutate(undefined, {
                              onSuccess: () => invite.mutate(),
                            })
                            return
                          }
                          invite.mutate()
                        }}
                        className="rounded-lg border border-command-200 bg-command-50 px-3 py-1.5 text-sm font-medium text-command-800"
                      >
                        Save and resend invitation
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </SectionCard>

        {(canInviteDriver(permissions) || canManageDriverAccess(permissions)) && (
          <AppInvitePanel
            driver={driver}
            actorName={actorName}
            canManage={canInviteDriver(permissions) || canManageDriverAccess(permissions)}
          />
        )}

        <SectionCard title="Account controls">
          <div className="flex flex-wrap gap-2">
            {canSuspendDriver(permissions) &&
              !isAccountSuspended(account.accountStatus) &&
              !isAccountOffboarded(account.accountStatus) && (
                <button
                  type="button"
                  onClick={() => setSuspendOpen(true)}
                  className="rounded-lg border border-attention/40 px-3 py-1.5 text-sm font-medium text-attention hover:bg-attention/10"
                >
                  Suspend access
                </button>
              )}
            {canManageDriverAccess(permissions) && isAccountSuspended(account.accountStatus) && (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={reinstateReason}
                  onChange={(e) => setReinstateReason(e.target.value)}
                  placeholder="Reason required to reinstate"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={!reinstateReason.trim() || reinstate.isPending}
                  onClick={() => reinstate.mutate()}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Reinstate access
                </button>
              </div>
            )}
            {canUnlockDriver(permissions) &&
              (account.accountStatus === 'locked' || account.accountLocked) && (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={unlockReason}
                    onChange={(e) => setUnlockReason(e.target.value)}
                    placeholder="Reason required to unlock"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={!unlockReason.trim() || unlock.isPending}
                    onClick={() => unlock.mutate()}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    Unlock account
                  </button>
                </div>
              )}
            {canManageDriverAccess(permissions) &&
              ['active', 'password_reset_required', 'compliance_restricted'].includes(account.accountStatus) && (
                <>
                  <button
                    type="button"
                    onClick={() => passwordReset.mutate()}
                    disabled={passwordReset.isPending}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
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
            {canOffboardDriver(permissions) && !isAccountOffboarded(account.accountStatus) && (
              <button
                type="button"
                onClick={() => setShowOffboard((v) => !v)}
                className="rounded-lg border border-critical/40 px-3 py-1.5 text-sm font-medium text-critical hover:bg-critical/10"
              >
                Offboard driver
              </button>
            )}
          </div>

          {activeInviteToken ? (
            <div className="mt-4">
              <DriverInviteLinkBanner
                token={activeInviteToken}
                emailDeliveryStatus={account.emailDeliveryStatus}
                inviteUrl={account.inviteUrl}
                email={account.loginEmail ?? driver.email}
              />
            </div>
          ) : null}

          {showOffboard ? (
            <div className="mt-4 space-y-2 rounded-lg border border-critical/20 bg-critical/5 p-3">
              <p className="text-sm font-medium text-slate-900">Offboard driver</p>
              <p className="text-xs text-slate-600">
                Ends sessions, revokes devices, and archives identity. Historical records are retained.
              </p>
              <input
                type="date"
                value={offboardEndDate}
                onChange={(e) => setOffboardEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              />
              <textarea
                value={offboardReason}
                onChange={(e) => setOffboardReason(e.target.value)}
                rows={2}
                placeholder="Reason required"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={!offboardReason.trim() || !offboardEndDate || offboard.isPending}
                onClick={() => offboard.mutate()}
                className="rounded-lg bg-critical px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {offboard.isPending ? 'Offboarding…' : 'Confirm offboard'}
              </button>
              {offboard.isError ? (
                <p className="text-sm text-red-800">
                  {offboard.error instanceof Error ? offboard.error.message : 'Offboard failed'}
                </p>
              ) : null}
            </div>
          ) : null}

          {(invite.isError || suspend.isError || reinstate.isError || unlock.isError) && (
            <p className="mt-3 text-sm text-red-800">
              {(invite.error || suspend.error || reinstate.error || unlock.error) instanceof Error
                ? ((invite.error || suspend.error || reinstate.error || unlock.error) as Error).message
                : 'Action failed'}
            </p>
          )}

          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Creating the driver record is separate from granting Driver app access. Administrators never set or see
            passwords — invite the driver to create their own credentials.
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Invitation history" description="Every invite attempt and its result">
        {(account.invitationHistory ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No invitation history yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {account.invitationHistory.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{INVITATION_HISTORY_LABELS[entry.stage]}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</p>
                </div>
                <p className="text-xs text-slate-600">
                  {[entry.channel, entry.destination, entry.actor ? `by ${entry.actor}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {entry.detail ? <p className="mt-1 text-xs text-slate-500">{entry.detail}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Devices and sessions" description="Registered devices and active sign-in sessions">
        {(account.devices ?? []).length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">No registered devices.</p>
        ) : (
          <ul className="mb-4 space-y-2 text-sm">
            {account.devices.map((device) => (
              <li key={device.id} className="rounded-lg border border-slate-200 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{device.label}</p>
                    <p className="text-xs text-slate-500">
                      {device.operatingSystem ?? device.platform}
                      {device.appVersion ? ` · App ${device.appVersion}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      Registered {formatDateTime(device.registeredAt)} · Last active{' '}
                      {formatDateTime(device.lastSeenAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {device.securityStatus === 'trusted' ? 'Trusted' : device.securityStatus}
                      {device.biometricUnlock ? ' · Biometric unlock enabled' : ' · Biometric unlock off'}
                      {device.pushNotificationsEnabled ? ' · Push enabled' : ' · Push off'}
                      {` · Location: ${device.locationAccess.replace(/_/g, ' ')}`}
                    </p>
                  </div>
                  {canManageDriverAccess(permissions) && device.securityStatus !== 'revoked' && (
                    <div className="flex min-w-[12rem] flex-col gap-1">
                      <input
                        value={deviceReason[device.id] ?? ''}
                        onChange={(e) =>
                          setDeviceReason((prev) => ({ ...prev, [device.id]: e.target.value }))
                        }
                        placeholder="Reason to revoke"
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={!deviceReason[device.id]?.trim() || revokeDevice.isPending}
                        onClick={() =>
                          revokeDevice.mutate({
                            deviceId: device.id,
                            reason: deviceReason[device.id]!.trim(),
                          })
                        }
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
                      >
                        Revoke device
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {(account.sessions ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">No active sessions.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {account.sessions.map((session) => (
              <li key={session.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="font-medium">{session.deviceLabel}</p>
                <p className="text-xs text-slate-500">
                  Started {formatDateTime(session.startedAt)} · Last active{' '}
                  {formatDateTime(session.lastActiveAt)}
                  {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                  {session.current ? <span className="ml-2 text-emerald-700">Current</span> : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Security activity" description="Recent login and account events">
        {securityEvents.length === 0 ? (
          <p className="text-sm text-slate-500">No security events recorded.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {securityEvents.slice(0, 12).map((event) => (
              <li key={event.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{event.action}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
                </div>
                <p className="text-xs text-slate-600">
                  {event.actor} · {event.actorRole}
                  {event.previousValue || event.newValue
                    ? ` · ${event.previousValue ?? '—'} → ${event.newValue ?? '—'}`
                    : ''}
                </p>
                {event.reason ? <p className="mt-1 text-xs text-slate-500">{event.reason}</p> : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Full audit trail (including non-security events) is on the Notes & Audit tab. Invitation sent{' '}
          {account.invitationSentAt ? formatDate(account.invitationSentAt.slice(0, 10)) : '—'}.
        </p>
      </SectionCard>

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

function StatusBlock({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status?: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {status ? <StatusPill status={status} /> : null}
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  )
}
