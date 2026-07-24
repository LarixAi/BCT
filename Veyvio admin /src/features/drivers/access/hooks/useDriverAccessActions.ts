import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  canInviteAccountStatus,
  isAccountOffboarded,
  SUSPEND_REASON_OPTIONS,
} from '@/lib/drivers/account-access'
import type { DriverProfile, SuspendDriverInput } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'
import { useDriverAccessPermissions } from './useDriverAccessPermissions'
import { useDriverContactEditor } from './useDriverContactEditor'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export type DriverAccessSecurityTabProps = {
  driver: DriverProfile
  actorName: string
  permissions: string[]
  companyName?: string | null
  inviteToken?: string | null
  onInviteToken?: (token: string | null) => void
}

export function useDriverAccessActions({
  driver,
  actorName,
  permissions,
  companyName,
  inviteToken,
  onInviteToken,
}: DriverAccessSecurityTabProps) {
  const queryClient = useQueryClient()
  const accessPermissions = useDriverAccessPermissions(permissions)
  const contact = useDriverContactEditor({ driver, actorName })

  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reinstateReason, setReinstateReason] = useState('')
  const [unlockReason, setUnlockReason] = useState('')
  const [offboardReason, setOffboardReason] = useState('')
  const [offboardEndDate, setOffboardEndDate] = useState('')
  const [showOffboard, setShowOffboard] = useState(false)
  const [deviceReason, setDeviceReason] = useState<Record<string, string>>({})

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profile', driver.id]) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-profiles']) })
    queryClient.invalidateQueries({ queryKey: tKey(['driver-directory-summary']) })
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
  const canSignIn = ![
    'draft',
    'invitation_pending',
    'invitation_expired',
    'temporarily_suspended',
    'locked',
    'offboarded',
    'archived',
  ].includes(account.accountStatus)
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

  const saveAndResendInvitation = async () => {
    if (contact.contactChanged) {
      await contact.save()
    }
    invite.mutate()
  }

  return {
    statusProps: {
      account,
      operationalEligibility: driver.operationalEligibility,
      canSignIn,
      eligibilityBlocked,
      blockingFailure,
      suspensionCategoryLabel,
    },
    accountProps: {
      driver,
      companyName,
      account,
      canManage: accessPermissions.canManage,
      contact,
      canResendInvite: canInviteAccountStatus(account.accountStatus),
      invitePending: invite.isPending,
      onSaveAndResend: () => {
        void saveAndResendInvitation()
      },
    },
    invitationProps: {
      driver,
      actorName,
      canManage: accessPermissions.canInvite,
      account,
    },
    sessionProps: {
      account,
      driver,
      activeInviteToken,
      canManage: accessPermissions.canManage,
      canUnlock: accessPermissions.canUnlock,
      unlockReason,
      setUnlockReason,
      unlockPending: unlock.isPending,
      onUnlock: () => unlock.mutate(),
      passwordResetPending: passwordReset.isPending,
      onPasswordReset: () => passwordReset.mutate(),
      revokeSessionsPending: revokeSessions.isPending,
      onRevokeSessions: () => revokeSessions.mutate(),
      actionError:
        invite.error || suspend.error || reinstate.error || unlock.error
          ? invite.error || suspend.error || reinstate.error || unlock.error
          : null,
    },
    deviceProps: {
      devices: account.devices ?? [],
      canManage: accessPermissions.canManage,
      deviceReason,
      setDeviceReason,
      revokePending: revokeDevice.isPending,
      onRevokeDevice: (deviceId: string, reason: string) =>
        revokeDevice.mutate({ deviceId, reason }),
    },
    suspensionProps: {
      account,
      driverName: `${driver.firstName} ${driver.lastName}`,
      canSuspend: accessPermissions.canSuspend,
      canManage: accessPermissions.canManage,
      suspendOpen,
      setSuspendOpen,
      reinstateReason,
      setReinstateReason,
      reinstatePending: reinstate.isPending,
      onReinstate: () => reinstate.mutate(),
      suspendPending: suspend.isPending,
      suspendError: suspend.error,
      onSuspend: (input: SuspendDriverInput) => suspend.mutate(input),
    },
    offboardingProps: {
      account,
      canOffboard: accessPermissions.canOffboard,
      showOffboard,
      setShowOffboard,
      offboardReason,
      setOffboardReason,
      offboardEndDate,
      setOffboardEndDate,
      offboardPending: offboard.isPending,
      offboardError: offboard.error,
      onOffboard: () => offboard.mutate(),
      isOffboarded: isAccountOffboarded(account.accountStatus),
    },
    securityEvents,
  }
}

export type DriverAccessActions = ReturnType<typeof useDriverAccessActions>
