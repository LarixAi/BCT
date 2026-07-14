export function canViewVehicles(permissions: string[]): boolean {
  return permissions.includes('fleet.view') || permissions.includes('vehicles.view')
}

export function canCreateVehicle(permissions: string[]): boolean {
  return permissions.includes('vehicles.create') || permissions.includes('fleet.edit')
}

export function canEditVehicle(permissions: string[]): boolean {
  return permissions.includes('vehicles.edit') || permissions.includes('fleet.edit')
}

export function canMarkVehicleVor(permissions: string[]): boolean {
  return permissions.includes('vehicles.vor') || permissions.includes('fleet.edit')
}

export function canReturnVehicleToService(permissions: string[]): boolean {
  return permissions.includes('vehicles.release') || permissions.includes('fleet.edit')
}

export function canVerifyVehicleDocuments(permissions: string[]): boolean {
  return permissions.includes('compliance.verify') || permissions.includes('vehicles.compliance')
}
