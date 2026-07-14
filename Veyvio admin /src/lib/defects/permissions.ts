export function canViewDefects(permissions: string[]): boolean {
  return permissions.includes('defects.view') || permissions.includes('defects.manage') || permissions.includes('fleet.view')
}

export function canTriageDefect(permissions: string[]): boolean {
  return permissions.includes('defects.triage') || permissions.includes('defects.manage') || permissions.includes('maintenance.coordinate')
}

export function canReportDefect(permissions: string[]): boolean {
  return permissions.includes('defects.report') || permissions.includes('defects.manage') || permissions.includes('vehicles.edit')
}

export function canMarkDefectVor(permissions: string[]): boolean {
  return permissions.includes('defects.mark_vor') || permissions.includes('vehicles.vor') || permissions.includes('defects.manage')
}

export function canCloseDefect(permissions: string[]): boolean {
  return permissions.includes('defects.close') || permissions.includes('defects.manage') || permissions.includes('maintenance.manage')
}

export function canVerifyDefect(permissions: string[]): boolean {
  return permissions.includes('defects.verify') || permissions.includes('defects.manage') || permissions.includes('maintenance.manage')
}

export function canCompleteRepair(permissions: string[]): boolean {
  return permissions.includes('defects.repair') || permissions.includes('defects.manage') || permissions.includes('maintenance.manage')
}

export function canApplyDefectRestriction(permissions: string[]): boolean {
  return permissions.includes('defects.restrict') || permissions.includes('defects.manage') || permissions.includes('vehicles.vor')
}

export function canReopenDefect(permissions: string[]): boolean {
  return permissions.includes('defects.reopen') || permissions.includes('defects.manage') || permissions.includes('maintenance.manage')
}

export function canBulkDefectAction(permissions: string[]): boolean {
  return permissions.includes('defects.bulk') || permissions.includes('defects.manage')
}

export function canUploadDefectEvidence(permissions: string[]): boolean {
  return permissions.includes('defects.upload_evidence') || permissions.includes('defects.manage') || permissions.includes('defects.report')
}

export function canConfigureDefectRules(permissions: string[]): boolean {
  return permissions.includes('defects.configure_rules') || permissions.includes('defects.manage')
}

export function canExportDefects(permissions: string[]): boolean {
  return permissions.includes('defects.export') || permissions.includes('defects.manage') || permissions.includes('defects.view')
}
