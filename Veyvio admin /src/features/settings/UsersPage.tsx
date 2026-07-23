import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'

export function UsersPage() {
  const { data: users = [], isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.getUsers(),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Users and Roles</h1>
          <p className="text-sm text-ink-soft">
            Team members with Command or Yard access for this company
          </p>
        </div>
        <Link
          to="/settings/invitations"
          className="rounded-lg bg-command-600 px-4 py-2 text-sm font-semibold text-white hover:bg-command-700"
        >
          Invite user
        </Link>
      </div>

      <SectionCard title="Team members" description={`${users.length} users`}>
        {isLoading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : isError ? (
          <p className="text-sm text-red-800">{error instanceof Error ? error.message : 'Could not load users'}</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted">No users yet. Invite a Command or Yard user to get started.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Last login</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((m) => {
                const firstName = m.user?.firstName ?? ''
                const lastName = m.user?.lastName ?? ''
                const name = `${firstName} ${lastName}`.trim() || 'User'
                return (
                  <tr key={m.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted">
                    <td className="py-2.5 pr-4 font-medium">{name}</td>
                    <td className="py-2.5 pr-4 text-ink-soft">{m.user?.email ?? '—'}</td>
                    <td className="py-2.5 pr-4 capitalize text-ink-soft">
                      {(m.roleKey ?? 'member').replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 pr-4 text-ink-soft">
                      {m.user?.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-2.5">
                      <StatusPill status={m.status ?? 'active'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}
