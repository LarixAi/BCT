import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import type { IntegrationApiKeyRecord } from '@/lib/api/types'
import { tKey } from '@/lib/tenant/tenant-query-scope'

function formatWhen(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function IntegrationsPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('CoLoop Website')
  const [scope, setScope] = useState('interests:create')
  const [formError, setFormError] = useState<string | null>(null)
  const [createdSecret, setCreatedSecret] = useState<IntegrationApiKeyRecord | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    data: apiKeys = [],
    isLoading: keysLoading,
    error: keysError,
  } = useQuery({
    queryKey: tKey(['integration-api-keys']),
    queryFn: () => api.getIntegrationApiKeys(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.createIntegrationApiKey({
        name: name.trim(),
        scopes: [scope],
      }),
    onSuccess: async (created) => {
      setFormError(null)
      setCreatedSecret(created)
      setCopied(false)
      await queryClient.invalidateQueries({ queryKey: tKey(['integration-api-keys']) })
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : 'Could not create API key.')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.revokeIntegrationApiKey(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tKey(['integration-api-keys']) })
    },
  })

  const activeKeys = apiKeys.filter((k) => k.status === 'active').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Integrations</h1>
        <p className="text-sm text-ink-soft">
          API keys for partner websites such as CoLoop Register Interest. Submissions appear under Incoming Interests.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-bold tabular-nums">{activeKeys}</p>
          <p className="text-sm text-ink-soft">Active API keys</p>
        </div>
        <Link
          to="/interests"
          className="rounded-xl border border-border bg-surface p-4 hover:border-command-500 hover:bg-command-50"
        >
          <p className="text-sm font-semibold text-command-700">Open Incoming Interests →</p>
          <p className="mt-1 text-sm text-ink-soft">Review Register Interest submissions from CoLoop</p>
        </Link>
      </div>

      <SectionCard
        title="Integration API keys"
        description="Scoped keys for third-party backends. Store the secret in the partner website server environment — never in browser JavaScript."
      >
        <div className="mb-4 rounded-lg border border-border bg-surface-muted/50 px-3 py-2 text-sm text-ink-soft">
          Recommended CoLoop scope: <code className="text-xs">interests:create</code> only.
        </div>

        {createdSecret?.secret ? (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Copy this key now — it is shown only once</p>
            <p className="mt-1 text-xs text-amber-900">
              Name: {createdSecret.name} · Prefix: {createdSecret.keyPrefix}…
            </p>
            <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-ink">
              {createdSecret.secret}
            </code>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-midnight px-3 py-1.5 text-sm font-medium text-white hover:bg-command-800"
                onClick={async () => {
                  await navigator.clipboard.writeText(createdSecret.secret ?? '')
                  setCopied(true)
                }}
              >
                {copied ? 'Copied' : 'Copy secret'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                onClick={() => setCreatedSecret(null)}
              >
                I have stored it
              </button>
            </div>
            <p className="mt-3 text-xs text-amber-900">
              Partner env var: <code>VEYVIO_INTEREST_API_KEY</code> (not <code>NEXT_PUBLIC_…</code>)
            </p>
          </div>
        ) : null}

        <form
          className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) {
              setFormError('Name is required')
              return
            }
            createMutation.mutate()
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Key name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CoLoop Website"
              className="w-full rounded-lg border border-border px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-soft">Scope</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm"
            >
              <option value="interests:create">interests:create</option>
              <option value="read">read</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-command-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-command-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create API key'}
          </button>
        </form>
        {formError ? <p className="mb-3 text-sm text-critical">{formError}</p> : null}
        {keysError ? (
          <p className="mb-3 text-sm text-critical">
            {keysError instanceof Error ? keysError.message : 'Could not load API keys.'}
          </p>
        ) : null}

        {keysLoading ? (
          <p className="text-sm text-muted">Loading API keys…</p>
        ) : apiKeys.length === 0 ? (
          <p className="text-sm text-ink-soft">No integration API keys yet for this company.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Name</th>
                  <th className="py-2 pr-3 font-semibold">Prefix</th>
                  <th className="py-2 pr-3 font-semibold">Scopes</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Last used</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id} className="border-b border-border/70 last:border-0">
                    <td className="py-2.5 pr-3 font-medium">{key.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{key.keyPrefix}…</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{(key.scopes ?? []).join(', ') || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={key.status} />
                    </td>
                    <td className="py-2.5 pr-3 text-ink-soft">{formatWhen(key.lastUsedAt)}</td>
                    <td className="py-2.5 text-right">
                      {key.status === 'active' ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-critical hover:underline disabled:opacity-50"
                          disabled={revokeMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Revoke API key “${key.name}”? Partner submissions will stop working.`,
                              )
                            ) {
                              revokeMutation.mutate(key.id)
                            }
                          }}
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-xs text-muted">Revoked {formatWhen(key.revokedAt)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
