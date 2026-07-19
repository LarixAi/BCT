export function canViewDepots(permissions: string[]): boolean {
  if (permissions.includes('*')) return true
  return (
    permissions.includes('depots.read') ||
    permissions.includes('depots.manage') ||
    permissions.includes('fleet.view') ||
    permissions.includes('vehicles.view')
  )
}

export function canManageDepots(permissions: string[]): boolean {
  if (permissions.includes('*')) return true
  return (
    permissions.includes('depots.manage') ||
    permissions.includes('fleet.edit') ||
    permissions.includes('vehicles.create') ||
    permissions.includes('vehicles.edit')
  )
}
