import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
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
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [ticket, setTicket] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [message, setMessage] = useState('')

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

  const enableMfa = useMutation({
    mutationFn: () => api.enableMfa(),
    onSuccess: (result) => {
      setMessage(`MFA enabled. Store recovery codes securely: ${(result.recoveryCodes ?? []).join(', ')}`)
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
        <h1 className="text-2xl font-semibold text-slate-900">Security & data</h1>
        <p className="text-sm text-slate-600">
          MFA, time-boxed support access, retention defaults, and company export requests
        </p>
      </div>

      {message && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">{message}</p>
      )}

      <SectionCard title="Multi-factor authentication">
        <p className="mb-3 text-sm text-slate-600">
          Privileged Command roles require MFA at sign-in. Status for {user?.email}:{' '}
          <strong>{user?.mfaEnabled ? 'Enabled' : 'Not enabled'}</strong>
        </p>
        {!user?.mfaEnabled && (
          <button
            type="button"
            onClick={() => enableMfa.mutate()}
            disabled={enableMfa.isPending}
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700 disabled:opacity-60"
          >
            {enableMfa.isPending ? 'Enabling…' : 'Enable MFA'}
          </button>
        )}
      </SectionCard>

      <SectionCard title="Just-in-time support access">
        <p className="mb-3 text-sm text-slate-600">
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
            <span className="mb-1 block font-medium text-slate-700">Reason</span>
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Investigate booking sync delay"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Ticket reference</span>
            <input
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="SUP-1234"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Duration (minutes)</span>
            <input
              type="number"
              min={15}
              max={480}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
          <p className="text-sm text-slate-500">Loading grants…</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {(grants.data ?? []).length === 0 && (
              <li className="py-2 text-slate-500">No support grants yet</li>
            )}
            {(grants.data ?? []).map((grant) => (
              <li key={grant.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {grant.reason}
                  {grant.ticketReference ? ` (${grant.ticketReference})` : ''}
                </span>
                <span className="text-slate-500">
                  {grant.accessLevel ?? 'read_only'} · expires{' '}
                  {grant.expiresAt ? new Date(grant.expiresAt).toLocaleString() : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Data retention">
        <p className="mb-3 text-sm text-slate-600">
          Default retention categories for this company. Enforcement jobs will apply these windows.
        </p>
        {retention.isLoading ? (
          <p className="text-sm text-slate-500">Loading policies…</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {(retention.data ?? []).map((policy) => (
              <li key={policy.category} className="flex justify-between gap-4 py-2">
                <span className="font-medium text-slate-800">{policy.category.replaceAll('_', ' ')}</span>
                <span className="text-slate-600">{policy.retentionDays} days</span>
              </li>
            ))}
            {(retention.data ?? []).length === 0 && (
              <li className="py-2 text-slate-500">No retention policies seeded yet</li>
            )}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Company data export">
        <p className="mb-3 text-sm text-slate-600">
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
          <p className="text-sm text-slate-500">Loading export jobs…</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {(exports.data ?? []).map((job) => (
              <li key={job.id} className="flex justify-between gap-4 py-2">
                <span>{job.exportType}</span>
                <span className="text-slate-600">{job.status}</span>
              </li>
            ))}
            {(exports.data ?? []).length === 0 && (
              <li className="py-2 text-slate-500">No export jobs yet</li>
            )}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
