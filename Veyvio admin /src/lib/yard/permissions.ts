export function canViewYard(permissions: string[]): boolean {
  return permissions.includes('yard.view') || permissions.includes('yard.manage') || permissions.includes('fleet.view')
}

export function canRecordYardMovement(permissions: string[]): boolean {
  return permissions.includes('yard.move_vehicle') || permissions.includes('yard.manage') || permissions.includes('vehicles.edit')
}

export function canCreateYardTask(permissions: string[]): boolean {
  return permissions.includes('yard.assign_tasks') || permissions.includes('yard.manage')
}

export function canReleaseFromYard(permissions: string[]): boolean {
  return permissions.includes('yard.release_vehicle') || permissions.includes('vehicles.release') || permissions.includes('yard.manage')
}

export function canMarkYardVor(permissions: string[]): boolean {
  return permissions.includes('yard.mark_vor') || permissions.includes('vehicles.vor') || permissions.includes('yard.manage')
}
