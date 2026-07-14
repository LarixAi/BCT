export function canViewMaintenance(permissions: string[]): boolean {
  return permissions.some((p) =>
    ['maintenance.view', 'fleet.view', 'vehicles.view', 'defects.view'].includes(p),
  )
}

export function canCoordinateMaintenance(permissions: string[]): boolean {
  return permissions.some((p) =>
    ['maintenance.coordinate', 'maintenance.edit', 'fleet.edit', 'vehicles.edit'].includes(p),
  )
}

export function canCreateWorkOrder(permissions: string[]): boolean {
  return permissions.some((p) =>
    ['maintenance.coordinate', 'maintenance.edit', 'fleet.edit', 'vehicles.edit'].includes(p),
  )
}

export function canApproveMaintenance(permissions: string[]): boolean {
  return permissions.some((p) =>
    ['maintenance.manage', 'maintenance.approve', 'vehicles.release', 'fleet.edit'].includes(p),
  )
}

export function canMarkVorFromMaintenance(permissions: string[]): boolean {
  return permissions.some((p) => ['vehicles.vor', 'maintenance.manage', 'fleet.edit'].includes(p))
}
