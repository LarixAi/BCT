import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { DIAL_A_RIDE_TABS } from '@/lib/dial-a-ride/constants'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function DialARidePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'requests'

  const { data: summary } = useQuery({
    queryKey: tKey(['dial-a-ride-summary']),
    queryFn: () => api.getDialARideSummary(),
  })

  const { data: requests = [], isLoading } = useQuery({
    queryKey: tKey(['dial-a-ride-requests', tab]),
    queryFn: () => api.getDialARideRequests({ view: tab === 'requests' ? undefined : tab }),
    enabled: tab !== 'members',
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dial-a-Ride</h1>
          <p className="text-sm text-ink-soft">
            Member-based flexible transport — requests become jobs after acceptance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dial-a-ride/members"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            Members
          </Link>
          <Link
            to="/dial-a-ride/new"
            className="rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
          >
            New request
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Requests today" value={String(summary?.requestsToday ?? 0)} />
        <Stat label="Awaiting decision" value={String(summary?.awaitingDecision ?? 0)} />
        <Stat label="Unscheduled" value={String(summary?.unscheduled ?? 0)} />
        <Stat label="Members travelling" value={String(summary?.membersTravelling ?? 0)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {DIAL_A_RIDE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (t.id === 'members') {
                window.location.href = '/dial-a-ride/members'
                return
              }
              setSearchParams({ tab: t.id })
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab === t.id ? 'bg-command-600 text-white' : 'bg-surface-muted text-ink-soft'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <SectionCard title="Dial-a-Ride requests" description="Accepted requests create jobs in the Jobs register">
        {isLoading ? (
          <p className="text-sm text-muted">Loading requests…</p>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted">No Dial-a-Ride requests</p>
            <p className="mt-1 text-sm text-ink-soft">Create a request for an eligible member.</p>
            <Link to="/dial-a-ride/new" className="mt-3 inline-block text-sm font-medium text-command-600 hover:underline">
              New request
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Window</th>
                  <th className="px-3 py-2">Journey</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-surface-muted/50">
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/dial-a-ride/requests/${r.id}`} className="text-command-600 hover:underline">
                        {r.reference}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{r.memberName}</td>
                    <td className="px-3 py-2">{r.travelDate}</td>
                    <td className="px-3 py-2">{r.pickupWindow}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-ink-soft">{r.journey}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted">
          Generated jobs appear in <Link to="/jobs" className="font-medium text-command-600 hover:underline">Jobs</Link>.
        </p>
      </SectionCard>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  )
}
