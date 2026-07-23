import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import type { PlatformFeatureFlag } from '@/lib/api/types'
import { PlatformShell } from './PlatformShell'

export function PlatformFeatureFlagsPage() {
  const [flags, setFlags] = useState<PlatformFeatureFlag[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const load = () =>
    api
      .listPlatformFeatureFlags()
      .then(setFlags)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load flags'))

  useEffect(() => {
    void load()
  }, [])

  const toggle = async (flag: PlatformFeatureFlag) => {
    setBusyKey(flag.key)
    setError(null)
    try {
      await api.patchPlatformFeatureFlag(flag.key, { enabled: !flag.enabled })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <PlatformShell
      title="Feature flags"
      description="Platform-wide switches. SaaS Stripe live and self-serve signup stay off until ready."
    >
      {error ? (
        <p className="mb-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {flags.map((flag) => (
          <li
            key={flag.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3"
          >
            <div>
              <div className="font-medium text-sm">{flag.key}</div>
              <div className="text-xs text-muted">{flag.description || 'No description'}</div>
            </div>
            <button
              type="button"
              disabled={busyKey === flag.key}
              onClick={() => void toggle(flag)}
              className={
                flag.enabled
                  ? 'rounded-md bg-ready px-3 py-1.5 text-xs font-semibold text-white'
                  : 'rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted'
              }
            >
              {flag.enabled ? 'On' : 'Off'}
            </button>
          </li>
        ))}
        {!flags.length && !error ? (
          <li className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            No feature flags configured.
          </li>
        ) : null}
      </ul>
    </PlatformShell>
  )
}
