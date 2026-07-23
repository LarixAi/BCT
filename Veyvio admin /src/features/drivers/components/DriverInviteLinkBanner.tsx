import { useState } from 'react'
import { Link } from 'react-router-dom'

function driverInviteUrl(token: string): { href: string; opensDriverApp: boolean } {
  const path = `/accept-invitation?token=${encodeURIComponent(token)}`
  const driverOrigin = (import.meta.env.VITE_DRIVER_APP_URL as string | undefined)?.replace(/\/$/, '')
  if (driverOrigin) {
    return { href: `${driverOrigin}${path}`, opensDriverApp: true }
  }
  if (typeof window !== 'undefined') {
    return { href: `${window.location.origin}${path}`, opensDriverApp: false }
  }
  return { href: path, opensDriverApp: false }
}

export function DriverInviteLinkBanner({
  token,
  emailDeliveryStatus,
  inviteUrl,
  email,
}: {
  token: string
  emailDeliveryStatus?: 'sent' | 'failed' | 'manual' | null
  inviteUrl?: string | null
  email?: string | null
}) {
  const [copied, setCopied] = useState(false)
  const built = driverInviteUrl(token)
  const href = inviteUrl?.trim() || built.href
  const opensDriverApp = Boolean(inviteUrl) || built.opensDriverApp
  const adminFallbackPath = `/accept-invitation?token=${encodeURIComponent(token)}`
  const emailed = emailDeliveryStatus === 'sent'
  const manual = emailDeliveryStatus === 'manual'

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={
        emailed
          ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950'
          : 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950'
      }
    >
      {emailed ? (
        <>
          <p className="font-medium">
            Invitation emailed{email ? ` to ${email}` : ''}.
          </p>
          <p className="mt-1">
            Prefer the secure link below for first-login setup. Some mail apps (including Outlook) can invalidate the
            Supabase “Accept invitation” button before the driver taps it.
          </p>
        </>
      ) : manual ? (
        <>
          <p className="font-medium">
            Invitation ready{email ? ` for ${email}` : ''} — share this Driver link.
          </p>
          <p className="mt-1">
            An Auth account already exists for this email from an earlier invite, so the Outlook button may not work.
            Send the Copy link below to the driver instead.
          </p>
        </>
      ) : (
        <>
          <p className="font-medium">Invitation link ready — share it with the driver.</p>
          <p className="mt-1">
            Use this secure one-time link so they can complete first-login setup in Veyvio Driver. Administrators never
            set or see the password.
          </p>
        </>
      )}
      {!opensDriverApp ? (
        <p className="mt-2 text-xs opacity-80">
          Tip: set <code className="rounded bg-surface/70 px-1">VITE_DRIVER_APP_URL</code> in Admin (for example{' '}
          <code className="rounded bg-surface/70 px-1">http://192.168.1.136:8081</code>) so this link opens the Driver app.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="max-w-full break-all rounded bg-surface/80 px-2 py-1 text-xs text-ink">{href}</code>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="rounded-lg border border-current/20 bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface/80"
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        {opensDriverApp ? (
          <a
            className="rounded-lg bg-command-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-command-700"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            Open in Driver
          </a>
        ) : (
          <Link
            className="rounded-lg bg-command-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-command-700"
            to={adminFallbackPath}
          >
            Open invite page
          </Link>
        )}
      </div>
    </div>
  )
}
