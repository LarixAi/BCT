import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { DriverInviteLinkBanner } from './DriverInviteLinkBanner'
import type { DriverProfile, InvitationChannel } from '@/lib/drivers/types'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/cn'

const RESEND_COOLDOWN_MS = 15 * 60 * 1000

function formatWhen(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function inviteStatusLabel(driver: DriverProfile): string {
  const { accountStatus, invitationStatus } = driver.account
  if (accountStatus === 'active') return 'Active'
  if (accountStatus === 'invitation_expired' || invitationStatus === 'expired') return 'Invite expired'
  if (invitationStatus === 'sent' || accountStatus === 'invitation_pending') return 'Invite sent'
  if (accountStatus === 'setup_incomplete') return 'Setup incomplete'
  if (accountStatus === 'pending_approval') return 'Pending approval'
  if (invitationStatus === 'cancelled') return 'Cancelled'
  return 'Not invited'
}

function deliveryLabel(driver: DriverProfile): string {
  const status = driver.account.emailDeliveryStatus
  if (status === 'sent') return 'Delivered'
  if (status === 'failed') return 'Delivery failed'
  if (status === 'manual') return 'Manual share required'
  if (driver.account.invitationStatus === 'sent') return 'Queued'
  return '—'
}

export function AppInvitePanel({
  driver,
  actorName,
  canManage,
  compact = false,
}: {
  driver: DriverProfile
  actorName: string
  canManage: boolean
  compact?: boolean
}) {
  const queryClient = useQueryClient()
  const [resendOpen, setResendOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<{ email: boolean; sms: boolean }>({
    email: true,
    sms: false,
  })
  const [invalidatePrevious, setInvalidatePrevious] = useState(true)

  const account = driver.account
  const token = account.devInvitationToken ?? null
  const inviteActive =
    account.invitationStatus === 'sent' ||
    ['invitation_pending', 'setup_incomplete'].includes(account.accountStatus)

  const cooldownRemainingMs = useMemo(() => {
    if (!account.invitationSentAt) return 0
    const elapsed = Date.now() - new Date(account.invitationSentAt).getTime()
    return Math.max(0, RESEND_COOLDOWN_MS - elapsed)
  }, [account.invitationSentAt, message])

  const cooldownActive = cooldownRemainingMs > 0 && inviteActive
  const emailUnverified = Boolean(driver.email) && account.emailVerified === false
  const phoneUnverified = Boolean(driver.phone) && account.phoneVerified === false

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['driver-profile', driver.id] })
    queryClient.invalidateQueries({ queryKey: ['driver-requirements', driver.id] })
  }

  const invite = useMutation({
    mutationFn: async () => {
      const channel: InvitationChannel =
        channels.email && channels.sms ? 'both' : channels.sms ? 'sms' : 'email'
      return api.createDriverAppAccount(
        driver.id,
        { channel, resend: Boolean(inviteActive || invalidatePrevious) },
        actorName,
      )
    },
    onSuccess: () => {
      setResendOpen(false)
      setError(null)
      setMessage(
        inviteActive
          ? 'Invitation resent. The previous link was invalidated.'
          : 'Invitation sent. Share the secure link if email delivery needs a manual follow-up.',
      )
      refresh()
    },
    onError: (err: Error) => {
      setError(err.message || 'Could not send the invitation.')
    },
  })

  const cancelInvite = useMutation({
    mutationFn: () =>
      api.cancelDriverInvitation(driver.id, actorName, 'Cancelled from activation centre'),
    onSuccess: () => {
      setMessage('Invitation cancelled.')
      refresh()
    },
    onError: (err: Error) => setError(err.message || 'Could not cancel the invitation.'),
  })

  const copyLink = async () => {
    const href =
      account.inviteUrl?.trim() ||
      (token
        ? `${(import.meta.env.VITE_DRIVER_APP_URL as string | undefined)?.replace(/\/$/, '') ?? window.location.origin}/accept-invitation?token=${encodeURIComponent(token)}`
        : null)
    if (!href) {
      setError('No invite link is available yet. Send an invitation first.')
      return
    }
    try {
      await navigator.clipboard.writeText(href)
      setMessage('Invite link copied.')
    } catch {
      setError('Could not copy the link.')
    }
  }

  return (
    <SectionCard
      title="Driver app access"
      description="Invitation links expire. Resending invalidates the previous link. Temporary passwords are never shown."
    >
      {(message || error) && (
        <div
          className={cn(
            'mb-3 rounded-lg px-3 py-2 text-sm',
            error ? 'border border-red-200 bg-red-50 text-red-900' : 'border border-emerald-200 bg-emerald-50 text-emerald-950',
          )}
        >
          {error ?? message}
        </div>
      )}

      <dl className={cn('grid gap-2 text-sm', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        <Row label="Status" value={inviteStatusLabel(driver)} />
        <Row label="Sent" value={formatWhen(account.invitationSentAt)} />
        <Row
          label="Channel"
          value={account.invitationChannel ? account.invitationChannel.replace(/_/g, ' ') : '—'}
        />
        <Row label="Delivery" value={deliveryLabel(driver)} />
        <Row
          label="Opened"
          value={account.registrationCompletedAt ? formatWhen(account.registrationCompletedAt) : 'No'}
        />
        <Row label="Expires" value={formatWhen(account.invitationExpiresAt)} />
      </dl>

      {emailUnverified && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Destination email is unverified. Confirm {driver.email} before relying on email delivery.
        </p>
      )}
      {phoneUnverified && channels.sms && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Mobile number is unverified. SMS invite may not reach the driver.
        </p>
      )}

      {token || account.inviteUrl ? (
        <div className="mt-4">
          <DriverInviteLinkBanner
            token={token ?? 'link'}
            emailDeliveryStatus={account.emailDeliveryStatus}
            inviteUrl={account.inviteUrl}
            email={account.loginEmail ?? driver.email}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canManage || (!token && !account.inviteUrl)}
          onClick={() => void copyLink()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Copy invite link
        </button>
        <button
          type="button"
          disabled={!canManage || cooldownActive || invite.isPending}
          title={
            cooldownActive
              ? `Wait ${Math.ceil(cooldownRemainingMs / 60000)} minute(s) before resending`
              : undefined
          }
          onClick={() => setResendOpen(true)}
          className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
        >
          {inviteActive ? 'Resend invite' : 'Send invite'}
        </button>
        <button
          type="button"
          disabled={!canManage || !driver.phone || cooldownActive || invite.isPending}
          onClick={() => {
            setChannels({ email: Boolean(driver.email), sms: true })
            setResendOpen(true)
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Send by SMS
        </button>
        {inviteActive && (
          <button
            type="button"
            disabled={!canManage || cancelInvite.isPending}
            onClick={() => cancelInvite.mutate()}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
          >
            Cancel invitation
          </button>
        )}
      </div>

      {cooldownActive && (
        <p className="mt-2 text-xs text-slate-500">
          Resend rate-limited — available again in about {Math.ceil(cooldownRemainingMs / 60000)} minute(s).
        </p>
      )}

      {resendOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close"
            onClick={() => setResendOpen(false)}
          />
          <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto rounded-none bg-white shadow-xl sm:rounded-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {inviteActive ? 'Resend Driver app invitation' : 'Send Driver app invitation'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Send to {driver.email ?? 'no email on file'}
              </p>
            </div>
            <div className="flex-1 space-y-4 px-5 py-4 text-sm">
              <div>
                <p className="font-semibold">Also send by</p>
                <div className="mt-2 space-y-1.5">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={channels.email}
                      onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))}
                      disabled={!driver.email}
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={channels.sms}
                      onChange={(e) => setChannels((c) => ({ ...c, sms: e.target.checked }))}
                      disabled={!driver.phone}
                    />
                    SMS
                  </label>
                </div>
              </div>
              {inviteActive && (
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={invalidatePrevious}
                    onChange={(e) => setInvalidatePrevious(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-semibold">Invalidate previous invitation</span>
                    <span className="block text-xs text-slate-500">
                      Recommended. The old link will stop working after a successful resend.
                    </span>
                  </span>
                </label>
              )}
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Who resent: {actorName}. Temporary passwords are never created or shown.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setResendOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  invite.isPending ||
                  (!channels.email && !channels.sms) ||
                  (channels.email && !driver.email)
                }
                onClick={() => invite.mutate()}
                className="rounded-lg bg-command-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {invite.isPending ? 'Sending…' : inviteActive ? 'Resend invitation' : 'Send invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-slate-900">{value}</dd>
    </div>
  )
}
