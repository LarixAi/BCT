import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { evaluateMemberEligibility } from '@/lib/dial-a-ride/eligibility'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function DialARideMembersPage() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: tKey(['dial-a-ride-members']),
    queryFn: () => api.getDialARideMembers(),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/dial-a-ride" className="text-sm font-medium text-command-600 hover:underline">
            ← Dial-a-Ride
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Members</h1>
          <p className="text-sm text-ink-soft">Eligibility, service zone and mobility profile</p>
        </div>
      </div>

      <SectionCard title="Member register">
        {isLoading ? (
          <p className="text-sm text-muted">Loading members…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Zone</th>
                  <th className="px-3 py-2">Eligibility</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const check = evaluateMemberEligibility(m)
                  return (
                    <tr key={m.id} className="border-b border-border/60">
                      <td className="px-3 py-2">
                        <p className="font-medium">{m.firstName} {m.lastName}</p>
                        <p className="text-xs text-muted">{m.memberNumber}</p>
                      </td>
                      <td className="px-3 py-2">{m.serviceZone}</td>
                      <td className="px-3 py-2 capitalize">{m.eligibilityStatus.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2">{m.eligibilityExpiry}</td>
                      <td className="px-3 py-2 capitalize">{m.status}</td>
                      <td className="px-3 py-2 text-right">
                        <Link to={`/dial-a-ride/members/${m.id}`} className="text-command-600 hover:underline">
                          View
                        </Link>
                        {' · '}
                        <Link to={`/dial-a-ride/new?member=${m.id}`} className="text-command-600 hover:underline">
                          Book
                        </Link>
                        {check.blocking && <p className="text-xs text-red-700">Not bookable</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
