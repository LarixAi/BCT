import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { AuthenticatorQr } from '@/features/auth/AuthenticatorQr'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/auth-context'

type SupportGrant = {
  id: string
  reason: string
  ticketReference?: string | null
  accessLevel?: string
  expiresAt?: string
  revokedAt?: string | null
  createdAt?: string
}

type RetentionPolicy = {
  category: string
  retentionDays: number
}

type ExportJob = {
  id: string
  exportType: string
  status: string
  createdAt?: string
  completedAt?: string | null
}

export function SecuritySettingsPage() {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [ticket, setTicket] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [message, setMessage] = useState('')
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauthUri: string } | null>(null)
  const [mfaCodes, setMfaCodes] = useState<string[] | null>(null)
  const [mfaConfirmCode, setMfaConfirmCode] = useState('')

  const grants = useQuery({
    queryKey: ['support-grants'],
    queryFn: () => api.listSupportGrants() as Promise<SupportGrant[]>,
  })
  const retention = useQuery({
    queryKey: ['retention-policies'],
    queryFn: () => api.listRetentionPolicies() as Promise<RetentionPolicy[]>,
  })
  const exports = useQuery({
    queryKey: ['data-exports'],
    queryFn: () => api.listDataExports() as Promise<ExportJob[]>,
  })

  const beginMfa = useMutation({
    mutationFn: () => api.enableMfa(),
    onSuccess: (result) => {
      if (!result.secret || !result.otpauthUri) {
        setMessage('Authenticator setup did not return a QR secret')
        return
      }
      setMfaSetup({ secret: result.secret, otpauthUri: result.otpauthUri })
      setMfaCodes(null)
      setMessage('Scan the QR code, then enter the 6-digit code from your app.')
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Could not start MFA setup'),
  })

  const confirmMfa = useMutation({
    mutationFn: () => api.enableMfa({ code: mfaConfirmCode }),
    onSuccess: async (result) => {
      setMfaCodes(result.recoveryCodes ?? [])
      setMfaSetup(null)
      setMfaConfirmCode('')
      setMessage('MFA enabled. Store the recovery codes below — they are shown once.')
      await refreshUser()
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Could not enable MFA'),
  })

  const createGrant = useMutation({
    mutationFn: () =>
      api.createSupportGrant({
        reason,
        ticketReference: ticket || undefined,
        durationMinutes,
      }),
    onSuccess: () => {
      setReason('')
      setTicket('')
      setMessage('Time-boxed support access granted. Activity is audited.')
      queryClient.invalidateQueries({ queryKey: ['support-grants'] })
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Support grant failed'),
  })

  const requestExport = useMutation({
    mutationFn: () => api.requestDataExport('company_full'),
    onSuccess: () => {
      setMessage('Company data export queued. You will see status below when ready.')
      queryClient.invalidateQueries({ queryKey: ['data-exports'] })
    },
    onError: (err) => setMessage(err instanceof Error ? err.message : 'Export request failed'),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Security & data</h1>
        <p className="text-sm text-ink-soft">
          MFA, time-boxed support access, retention defaults, and company export requests
        </p>
      </div>

      {message && (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink">{message}</p>
      )}

      <SectionCard title="Multi-factor authentication">
        <p className="mb-3 text-sm text-ink-soft">
          Privileged Command roles require MFA at sign-in. Status for {user?.email}:{' '}
          <strong>{user?.mfaEnabled ? 'Enabled' : 'Not enabled'}</strong>
        </p>
        {!user?.mfaEnabled && !mfaSetup && !mfaCodes && (
          <button
            type="button"
            onClick={() => beginMfa.mutate()}
            disabled={beginMfa.isPending}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60"
          >
            {beginMfa.isPending ? 'Preparing…' : 'Set up authenticator app'}
          </button>
        )}
        {mfaSetup && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              confirmMfa.mutate()
            }}
          >
            <AuthenticatorQr otpauthUri={mfaSetup.otpauthUri} secret={mfaSetup.secret} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink-soft">6-digit code from your app</span>
              <input
                required
                value={mfaConfirmCode}
                onChange={(e) => setMfaConfirmCode(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-border-strong px-3 py-2 text-sm"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
              />
            </label>
            <button
              type="submit"
              disabled={confirmMfa.isPending || mfaConfirmCode.trim().length < 6}
              className="rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60"
            >
              {confirmMfa.isPending ? 'Confirming…' : 'Confirm and enable MFA'}
            </button>
          </form>
        )}
        {mfaCodes && mfaCodes.length > 0 && (
          <ul className="mt-3 grid max-w-md grid-cols-2 gap-2 font-mono text-sm">
            {mfaCodes.map((code) => (
              <li key={code} className="rounded bg-surface-muted px-2 py-1">
                {code}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Just-in-time support access">
        <p className="mb-3 text-sm text-ink-soft">
          Grant temporary read access for support investigations. Every grant creates an audit record.
        </p>
        <form
          className="mb-4 grid max-w-xl gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            createGrant.mutate()
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Reason</span>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
              placeholder="Investigate booking sync delay"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Ticket reference</span>
            <input
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
              placeholder="SUP-1234"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-soft">Duration (minutes)</span>
            <input
              type="number"
              min={15}
              max={480}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={createGrant.isPending || !reason.trim()}
            className="w-fit rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60"
          >
            {createGrant.isPending ? 'Granting…' : 'Grant support access'}
          </button>
        </form>
        {grants.isLoading ? (
          <p className="text-sm text-muted">Loading grants…</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(grants.data ?? []).length === 0 && (
              <li className="py-2 text-muted">No support grants yet</li>
            )}
            {(grants.data ?? []).map((grant) => (
              <li key={grant.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {grant.reason}
                  {grant.ticketReference ? ` (${grant.ticketReference})` : ''}
                </span>
                <span className="text-muted">
                  {grant.accessLevel ?? 'read_only'} · expires{' '}
                  {grant.expiresAt ? new Date(grant.expiresAt).toLocaleString() : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Data retention">
        <p className="mb-3 text-sm text-ink-soft">
          Default retention categories for this company. Enforcement jobs will apply these windows.
        </p>
        {retention.isLoading ? (
          <p className="text-sm text-muted">Loading policies…</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(retention.data ?? []).map((policy) => (
              <li key={policy.category} className="flex justify-between gap-4 py-2">
                <span className="font-medium text-ink">{policy.category.replaceAll('_', ' ')}</span>
                <span className="text-ink-soft">{policy.retentionDays} days</span>
              </li>
            ))}
            {(retention.data ?? []).length === 0 && (
              <li className="py-2 text-muted">No retention policies seeded yet</li>
            )}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Company data export">
        <p className="mb-3 text-sm text-ink-soft">
          Request a full company export package. Jobs start queued and complete asynchronously.
        </p>
        <button
          type="button"
          onClick={() => requestExport.mutate()}
          disabled={requestExport.isPending}
          className="mb-4 rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60"
        >
          {requestExport.isPending ? 'Queuing…' : 'Request full export'}
        </button>
        {exports.isLoading ? (
          <p className="text-sm text-muted">Loading export jobs…</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(exports.data ?? []).map((job) => (
              <li key={job.id} className="flex justify-between gap-4 py-2">
                <span>{job.exportType}</span>
                <span className="text-ink-soft">{job.status}</span>
              </li>
            ))}
            {(exports.data ?? []).length === 0 && (
              <li className="py-2 text-muted">No export jobs yet</li>
            )}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
