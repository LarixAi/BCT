import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui'
import { StatusPill } from '@/components/ui/status'
import { api } from '@/lib/api/client'
import { tKey } from '@/lib/tenant/tenant-query-scope'

type MatrixRole = {
  id: string
  roleKey: string
  label: string
  description?: string
  isSystemRole?: boolean
  status?: string
  userCount?: number
  permissionCodes?: string[]
  permissionCount?: number
}

type MatrixCatalog = {
  code: string
  description?: string
  module: string
}

type RolesMatrixResponse = {
  roles: MatrixRole[]
  catalog: MatrixCatalog[]
  modules?: string[]
}

export function RolesPermissionsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: tKey(['settings-roles-matrix']),
    queryFn: () => api.getCommandResource<RolesMatrixResponse>('/settings/roles'),
  })

  const roles = data?.roles ?? []
  const catalog = data?.catalog ?? []
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')

  const selectedRole = useMemo(() => {
    if (!roles.length) return null
    return roles.find((r) => r.id === selectedRoleId) ?? roles[0]
  }, [roles, selectedRoleId])

  const granted = useMemo(() => new Set(selectedRole?.permissionCodes ?? []), [selectedRole])

  const modules = useMemo(() => {
    if (data?.modules?.length) return data.modules
    return [...new Set(catalog.map((p) => p.module))].sort()
  }, [catalog, data?.modules])

  const savePermissions = useMutation({
    mutationFn: (input: { roleId: string; permissionCodes: string[] }) =>
      api.patchCommandResource<RolesMatrixResponse>(`/settings/roles/${input.roleId}/permissions`, {
        permissionCodes: input.permissionCodes,
      }),
    onSuccess: (next) => {
      setSaveError('')
      queryClient.setQueryData(tKey(['settings-roles-matrix']), next)
    },
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : 'Could not update permissions')
    },
  })

  function togglePermission(code: string) {
    if (!selectedRole || savePermissions.isPending) return
    const next = new Set(selectedRole.permissionCodes ?? [])
    if (next.has(code)) next.delete(code)
    else next.add(code)
    savePermissions.mutate({
      roleId: selectedRole.id,
      permissionCodes: [...next].sort(),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Roles and permissions</h1>
          <p className="text-sm text-ink-soft">
            Company roles, permission families, and who can act in Command, Yard, and Driver
          </p>
        </div>
        <Link
          to="/settings/users"
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-muted"
        >
          View users
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading roles…</p>
      ) : isError ? (
        <p className="text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load roles'}
        </p>
      ) : (
        <>
          <SectionCard title="Company roles" description={`${roles.length} role(s)`}>
            {roles.length === 0 ? (
              <p className="text-sm text-muted">No roles defined for this company yet.</p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 pr-4 font-medium">Users</th>
                    <th className="pb-2 pr-4 font-medium">Permissions</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => {
                    const active = selectedRole?.id === role.id
                    return (
                      <tr
                        key={role.id}
                        className={`cursor-pointer border-b border-border/60 last:border-0 hover:bg-surface-muted ${
                          active ? 'bg-command-50' : ''
                        }`}
                        onClick={() => setSelectedRoleId(role.id)}
                      >
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-ink">{role.label}</p>
                          <p className="text-xs text-ink-soft">{role.description || role.roleKey}</p>
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums">{role.userCount ?? 0}</td>
                        <td className="py-2.5 pr-4 tabular-nums">{role.permissionCount ?? 0}</td>
                        <td className="py-2.5 pr-4 text-ink-soft">
                          {role.isSystemRole ? 'System' : 'Custom'}
                        </td>
                        <td className="py-2.5">
                          <StatusPill status={role.status ?? 'active'} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </SectionCard>

          {selectedRole ? (
            <SectionCard
              title={`Permission matrix — ${selectedRole.label}`}
              description="Tap Allow / No access to update grants. Changes apply immediately for this company."
            >
              {saveError ? <p className="mb-3 text-sm text-red-800">{saveError}</p> : null}
              {savePermissions.isPending ? (
                <p className="mb-3 text-sm text-ink-soft">Saving permission change…</p>
              ) : null}
              <div className="space-y-5">
                {modules.map((module) => {
                  const rows = catalog.filter((p) => p.module === module)
                  if (!rows.length) return null
                  return (
                    <div key={module}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        {module}
                      </h3>
                      <ul className="divide-y divide-border/60 rounded-lg border border-border">
                        {rows.map((perm) => {
                          const allowed = granted.has(perm.code)
                          return (
                            <li
                              key={perm.code}
                              className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
                            >
                              <div>
                                <p className="font-medium text-ink">{perm.code}</p>
                                <p className="text-xs text-ink-soft">{perm.description || '—'}</p>
                              </div>
                              <button
                                type="button"
                                disabled={savePermissions.isPending}
                                onClick={() => togglePermission(perm.code)}
                                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  allowed
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : 'bg-surface-muted text-ink-soft'
                                }`}
                              >
                                {allowed ? 'Allow' : 'No access'}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          ) : null}
        </>
      )}
    </div>
  )
}
