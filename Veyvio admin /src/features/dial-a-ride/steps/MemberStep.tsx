import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { applyMemberDefaultsToRequest } from '@/lib/dial-a-ride/defaults'
import { evaluateMemberEligibility } from '@/lib/dial-a-ride/eligibility'
import type { DialARideRequest } from '@/lib/dial-a-ride/types'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'


export function MemberStep({
  request,
  onChange,
}: {
  request: DialARideRequest
  onChange: (patch: Partial<DialARideRequest>) => void
}) {
  const { data: members = [] } = useQuery({
    queryKey: tKey(['dial-a-ride-members']),
    queryFn: () => api.getDialARideMembers(),
  })

  function selectMember(memberId: string) {
    const member = members.find((m) => m.id === memberId)
    if (!member) return
    onChange(applyMemberDefaultsToRequest(request, member))
  }

  const selected = members.find((m) => m.id === request.memberId)
  const eligibility = selected ? evaluateMemberEligibility(selected) : null

  return (
    <div className="space-y-4">
      <SectionCard title="Search member" description="Step 1 — eligibility is checked before acceptance">
        <input
          type="search"
          placeholder="Search by name or member number…"
          className="mb-3 w-full rounded-lg border border-border px-3 py-1.5 text-sm"
        />
        <ul className="divide-y divide-border rounded-lg border border-border">
          {members.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => selectMember(m.id)}
                className={`w-full px-4 py-3 text-left transition hover:bg-surface-muted ${
                  request.memberId === m.id ? 'bg-command-50 ring-2 ring-inset ring-command-500' : ''
                }`}
              >
                <p className="font-medium text-ink">
                  {m.firstName} {m.lastName}
                </p>
                <p className="text-xs text-muted">
                  {m.memberNumber} · {m.serviceZone} · {m.eligibilityStatus.replace(/_/g, ' ')}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </SectionCard>

      {selected && (
        <SectionCard title="Member profile">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Eligibility</dt>
              <dd className="font-medium capitalize">{selected.eligibilityStatus.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-muted">Expires</dt>
              <dd className="font-medium">{selected.eligibilityExpiry}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Home address</dt>
              <dd className="font-medium">{selected.homeAddress}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Mobility profile</dt>
              <dd className="font-medium">{selected.mobilityProfile}</dd>
            </div>
          </dl>
          {eligibility && (
            <div
              className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                eligibility.blocking
                  ? 'bg-red-50 text-red-900'
                  : eligibility.result === 'requires_approval'
                    ? 'bg-amber-50 text-amber-900'
                    : 'bg-emerald-50 text-emerald-900'
              }`}
            >
              <p className="font-medium capitalize">{eligibility.result.replace(/_/g, ' ')}</p>
              <ul className="mt-1 list-inside list-disc">
                {eligibility.messages.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}
