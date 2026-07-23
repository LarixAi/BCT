import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api/client'
import type { PlatformSupportGrant } from '@/lib/api/types'
import { PlatformShell } from './PlatformShell'

export function PlatformSupportPage() {
  const [grants, setGrants] = useState<PlatformSupportGrant[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () =>
    api
      .listAllPlatformSupportGrants()
      .then(setGrants)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load support grants'))

  useEffect(() => {
    void load()
  }, [])

  const active = grants.filter(
    (g) => !g.revokedAt && (!g.expiresAt || new Date(g.expiresAt) > new Date()),
  )

  return (
    <PlatformShell
      title="Support access"
      description="Active and recent privileged access grants across customers."
    >
      {error ? (
        <p className="mb-4 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          {error}
        </p>
      ) : null}

      <p className="mb-4 text-sm text-muted">
        {active.length} active · {grants.length} recent. Open a customer to create a new grant.
      </p>

      <ul className="space-y-2">
        {grants.map((grant) => {
          const isActive =
            !grant.revokedAt && (!grant.expiresAt || new Date(grant.expiresAt) > new Date())
          return (
            <li
              key={grant.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
            >
              <div>
                <div className="font-medium">
                  {grant.tradingName ?? grant.legalName ?? grant.companyId ?? 'Customer'}
                </div>
                <div className="text-xs text-muted">
                  {grant.reason} · {grant.accessLevel}
                  {grant.ticketReference ? ` · ${grant.ticketReference}` : ''}
                  {grant.expiresAt
                    ? ` · expires ${new Date(grant.expiresAt).toLocaleString()}`
                    : ''}
                  {grant.revokedAt ? ' · revoked' : isActive ? ' · active' : ' · expired'}
                </div>
              </div>
              <div className="flex gap-2">
                {grant.companyId ? (
                  <Link
                    to={`/platform/companies/${grant.companyId}`}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                  >
                    Open
                  </Link>
                ) : null}
                {isActive ? (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-muted"
                    onClick={() => {
                      setBusy(true)
                      void api
                        .revokePlatformSupportGrant(grant.id)
                        .then(() => load())
                        .catch((err) =>
                          setError(err instanceof Error ? err.message : 'Revoke failed'),
                        )
                        .finally(() => setBusy(false))
                    }}
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
        {!grants.length && !error ? (
          <li className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            No support grants yet.
          </li>
        ) : null}
      </ul>
    </PlatformShell>
  )
}
