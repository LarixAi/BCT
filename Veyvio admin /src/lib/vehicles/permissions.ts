export function canViewVehicles(permissions: string[]): boolean {
  return permissions.includes('fleet.view') || permissions.includes('vehicles.view')
}

export function canCreateVehicle(permissions: string[]): boolean {
  if (permissions.includes('*')) return true
  return (
    permissions.includes('vehicles.create') ||
    permissions.includes('vehicles.edit') ||
    permissions.includes('fleet.edit') ||
    // Fleet register operators with view access can open the Add Vehicle wizard.
    // The create API still enforces write authority server-side.
    permissions.includes('fleet.view') ||
    permissions.includes('vehicles.view')
  )
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
