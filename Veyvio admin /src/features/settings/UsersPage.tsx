import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'

export function UsersPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Users and Roles</h1>
        <p className="text-sm text-slate-600">Team members with access to Veyvio Command</p>
      </div>

      <SectionCard title="Team members" description={`${users.length} users`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Last login</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 pr-4 font-medium">
                    {m.user.firstName} {m.user.lastName}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{m.user.email}</td>
                  <td className="py-2.5 pr-4 capitalize text-slate-600">{m.roleKey.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="py-2.5">
                    <StatusPill status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
