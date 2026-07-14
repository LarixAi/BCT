export function canViewChecks(permissions: string[]): boolean {
  return permissions.includes('checks.view') || permissions.includes('checks.manage') || permissions.includes('fleet.view')
}

export function canStartAdminCheck(permissions: string[]): boolean {
  return permissions.includes('checks.start') || permissions.includes('checks.manage') || permissions.includes('yard.manage')
}

export function canReviewCheck(permissions: string[]): boolean {
  return permissions.includes('checks.review') || permissions.includes('checks.manage') || permissions.includes('compliance.verify')
}

export function canMarkCheckVor(permissions: string[]): boolean {
  return permissions.includes('checks.mark_vor') || permissions.includes('vehicles.vor') || permissions.includes('checks.manage')
}

export function canManageCheckTemplates(permissions: string[]): boolean {
  return permissions.includes('checks.manage_templates') || permissions.includes('checks.manage')
}
