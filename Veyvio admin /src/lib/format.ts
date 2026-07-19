/** Safe join for optional string arrays from live APIs that omit fields. */
export function formatRoleList(roles: string[] | null | undefined, empty = 'Not configured'): string {
  if (!Array.isArray(roles) || roles.length === 0) return empty
  return roles.join(', ').replace(/_/g, ' ')
}
