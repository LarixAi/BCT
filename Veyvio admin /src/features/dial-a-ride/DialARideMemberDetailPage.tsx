import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { evaluateMemberEligibility } from '@/lib/dial-a-ride/eligibility'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function DialARideMemberDetailPage() {
  const { memberId = '' } = useParams()
  const { data: member, isLoading } = useQuery({
    queryKey: tKey(['dial-a-ride-member', memberId]),
    queryFn: () => api.getDialARideMember(memberId),
    enabled: !!memberId,
  })

  if (isLoading || !member) {
    return <p className="p-6 text-sm text-muted">Loading member…</p>
  }

  const eligibility = evaluateMemberEligibility(member)

  return (
    <div className="space-y-4">
      <div>
        <Link to="/dial-a-ride/members" className="text-sm font-medium text-command-600 hover:underline">
          ← Members
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          {member.firstName} {member.lastName}
        </h1>
        <p className="text-sm text-ink-soft">{member.memberNumber} · {member.serviceZone}</p>
      </div>

      <SectionCard title="Eligibility">
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            eligibility.blocking ? 'bg-red-50 text-red-900' : 'bg-emerald-50 text-emerald-900'
          }`}
        >
          <p className="font-medium capitalize">{eligibility.result.replace(/_/g, ' ')}</p>
          <ul className="mt-1 list-inside list-disc">
            {eligibility.messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </SectionCard>

      <SectionCard title="Profile">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Home</dt>
            <dd className="font-medium">{member.homeAddress}</dd>
          </div>
          <div>
            <dt className="text-muted">Phone</dt>
            <dd className="font-medium">{member.phone}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Mobility</dt>
            <dd className="font-medium">{member.mobilityProfile}</dd>
          </div>
          <div>
            <dt className="text-muted">Companion entitlement</dt>
            <dd className="font-medium">{member.companionEntitlement ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-muted">Recent no-shows</dt>
            <dd className="font-medium">{member.noShowCount}</dd>
          </div>
        </dl>
      </SectionCard>

      <Link
        to={`/dial-a-ride/new?member=${member.id}`}
        className="inline-flex rounded-lg bg-command-600 px-4 py-2 text-sm font-medium text-white hover:bg-command-700"
      >
        New request for this member
      </Link>
    </div>
  )
}
